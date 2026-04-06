import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import pg from "pg";
import { randomBytes } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
const UPLOAD_DIR = "/app/uploads";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function getOAuth2Token() {
  const t=process.env.AZURE_TENANT_ID,c=process.env.AZURE_CLIENT_ID,s=process.env.AZURE_CLIENT_SECRET;
  if (!t||!c||!s) throw new Error("Azure not configured");
  const r=await fetch(`https://login.microsoftonline.com/${t}/oauth2/v2.0/token`,{method:"POST",body:new URLSearchParams({client_id:c,client_secret:s,scope:"https://outlook.office365.com/.default",grant_type:"client_credentials"})});
  const d=await r.json(); if(!d.access_token) throw new Error("OAuth2 failed"); return d.access_token;
}
function parseTicket(f){try{return JSON.parse(execSync(`python3 /app/pdf-generator/parse_db_ticket.py "${f}"`,{timeout:15000}).toString())}catch(e){return null}}

async function findOrCreateTrip(userId, ticketDate, subject) {
  const trips = await pool.query('SELECT * FROM "Trip" WHERE "userId" = $1 AND status = \'DRAFT\' ORDER BY "startDate" ASC', [userId]);
  for (const trip of trips.rows) {
    const s = new Date(trip.startDate); const e = trip.endDate ? new Date(trip.endDate) : s;
    const before = new Date(s); before.setDate(before.getDate() - 1);
    const after = new Date(e); after.setDate(after.getDate() + 1);
    if (ticketDate >= before && ticketDate <= after) {
      if (ticketDate < s) await pool.query('UPDATE "Trip" SET "startDate"=$1,"updatedAt"=NOW() WHERE id=$2', [ticketDate, trip.id]);
      if (ticketDate > e) await pool.query('UPDATE "Trip" SET "endDate"=$1,"updatedAt"=NOW() WHERE id=$2', [ticketDate, trip.id]);
      return trip.id;
    }
  }
  const id = "c" + randomBytes(12).toString("hex");
  await pool.query('INSERT INTO "Trip"(id,"userId",purpose,"startDate","travelMode",status,"createdAt","updatedAt")VALUES($1,$2,$3,$4,\'BAHN\',\'DRAFT\',NOW(),NOW())', [id, userId, subject || "Neue Reise", ticketDate]);
  console.log("  + Neue Reise: " + (subject || "").substring(0, 50));
  return id;
}

async function pollEmails() {
  const user=process.env.IMAP_USER; if(!user){console.log("IMAP_USER not set");return 0}
  const token=await getOAuth2Token(); console.log("OAuth2 OK");
  const client=new ImapFlow({host:"outlook.office365.com",port:993,secure:true,auth:{user,accessToken:token},logger:false});
  let processed=0;
  await client.connect(); console.log("IMAP connected");
  const lock=await client.getMailboxLock("INBOX");
  try{
    const msgs = [];
    for await(const msg of client.fetch("1:*",{envelope:true,source:true,uid:true})){
      msgs.push(msg);
    }
    console.log(`${msgs.length} ungelesene Mails`);

    for(const msg of msgs){
      try{
        console.log(`\nMail: ${(msg.envelope.subject||"").substring(0,60)}`);
        const parsed=await simpleParser(msg.source);
        const from=parsed.from?.value?.[0]?.address?.toLowerCase();
        if(!from){console.log("  Skip: kein Absender");await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true});continue}

        const users=await pool.query('SELECT * FROM "User" WHERE LOWER(email)=$1',[from]);
        if(!users.rows.length){console.log("  Skip: unbekannt "+from);await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true});continue}
        const u=users.rows[0];

        const atts=(parsed.attachments||[]).filter(a=>a.filename&&/\.(pdf|jpg|jpeg|png)$/i.test(a.filename));
        console.log(`  Absender: ${from}, Anhänge: ${atts.length}`);
        if(!atts.length){await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true});continue}

        const dir=path.join(UPLOAD_DIR,u.id); if(!existsSync(dir)) mkdirSync(dir,{recursive:true});

        for(const att of atts){
          const safe=att.filename.replace(/[^a-zA-Z0-9._-]/g,"_");
          const dup=await pool.query('SELECT id FROM "Receipt" WHERE "tripId" IN (SELECT id FROM "Trip" WHERE "userId"=$1) AND "fileName"=$2',[u.id,safe]);
          if(dup.rows.length>0){console.log("  Skip dup: "+safe);continue}
          const fp=path.join(dir,Date.now()+"_"+safe); writeFileSync(fp,att.content);

          let amt=0,fromS=null,toS=null,ht=false,dt=parsed.date||new Date(),orderNr=null;
          if(/\.pdf$/i.test(safe)){
            const t=parseTicket(fp);
            if(t&&!t.error){
              if(t.amount)amt=t.amount;if(t.from)fromS=t.from;if(t.to)toS=t.to;
              if(t.is_handyticket)ht=true;if(t.order_nr)orderNr=t.order_nr;
              if(t.date){const[d,m,y]=t.date.split(".");dt=new Date(`${y}-${m}-${d}`)}
              console.log(`  Parsed: ${amt}€ ${fromS||"?"} → ${toS||"?"} ${ht?"(HT)":""} #${orderNr||"?"}`);
            if(orderNr){const dupOrd=await pool.query(`SELECT id FROM "Receipt" WHERE "tripId" IN (SELECT id FROM "Trip" WHERE "userId"=$1) AND description LIKE $2`,[u.id,`%#${orderNr}%`]);if(dupOrd.rows.length>0){console.log("  Skip dup order: #"+orderNr);continue}}
            }
          }

          const isDbTicket = orderNr || /^(Ticket_|DB_Kaufbeleg)/i.test(safe);
          if (!isDbTicket) {
            // Non-DB attachment → Inbox
            let preview="";
            try{preview=execSync(`python3 -c "import pdfplumber\nwith pdfplumber.open('${fp}') as pdf:\n  for p in pdf.pages[:1]:\n    t=p.extract_text()\n    if t: print(t[:500])"`,{timeout:10000}).toString().trim()}catch{}
            const iid="in"+randomBytes(12).toString("hex");
            await pool.query('INSERT INTO "InboxItem"(id,"userId","fileName","filePath","mimeType","fileSize","subject","preview",status,"createdAt")VALUES($1,$2,$3,$4,$5,$6,$7,$8,\'NEW\',$9)',[iid,u.id,safe,fp,att.contentType,att.size,parsed.subject||null,preview||null,new Date()]);
            console.log("  → Inbox: "+safe);
            continue;
          }
          const tripId = await findOrCreateTrip(u.id, dt, parsed.subject || "Reise");
          const rid="c"+randomBytes(12).toString("hex");
          const desc = orderNr ? `DB #${orderNr}: ${fromS||"?"} → ${toS||"?"}` : `Per E-Mail: ${(parsed.subject||att.filename).substring(0,80)}`;
          await pool.query('INSERT INTO "Receipt"(id,"tripId",description,amount,date,category,"isHandyticket","fromStation","toStation","fileName","filePath","mimeType","fileSize","createdAt")VALUES($1,$2,$3,$4,$5,\'FAHRT\',$6,$7,$8,$9,$10,$11,$12,NOW())',[rid,tripId,desc,amt,dt,ht,fromS,toS,safe,fp,att.contentType,att.size]);
          if(fromS&&toS){
            const rr=await pool.query('SELECT "fromStation","toStation" FROM "Receipt" WHERE "tripId"=$1 AND "fromStation" IS NOT NULL ORDER BY date',[tripId]);
            if(rr.rows.length>0){const stations=[rr.rows[0].fromStation];for(const r of rr.rows){if(r.fromStation!==stations[stations.length-1])stations.push(r.fromStation);if(r.toStation!==stations[stations.length-1])stations.push(r.toStation)};const route=stations.join(" – ");await pool.query('UPDATE "Trip" SET route=$1,"updatedAt"=NOW() WHERE id=$2',[route,tripId])}
          }
          console.log("  ✓ "+safe+(amt?` (${amt}€)`:" (manuell)"));
        }
        await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true}); processed++;
      }catch(err){console.error("  ERROR:",err.message);await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true}).catch(()=>{})}
    }
  }finally{lock.release()}
  await client.logout();
  await pool.end();
  return processed;
}
console.log(new Date().toISOString()+" Polling...");
pollEmails().then(count=>{console.log("\nDone: "+count+" email(s)");process.exit(0)}).catch(e=>{console.error("FATAL:",e.message);process.exit(1)});
