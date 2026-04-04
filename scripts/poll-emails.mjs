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
async function pollEmails() {
  const user=process.env.IMAP_USER; if(!user){console.log("IMAP_USER not set");return 0}
  const token=await getOAuth2Token(); console.log("OAuth2 OK");
  const client=new ImapFlow({host:"outlook.office365.com",port:993,secure:true,auth:{user,accessToken:token},logger:false});
  let processed=0;
  try{
    await client.connect(); console.log("IMAP connected");
    const lock=await client.getMailboxLock("INBOX");
    try{
      for await(const msg of client.fetch({seen:false},{envelope:true,source:true,uid:true})){
        try{
          const parsed=await simpleParser(msg.source);
          const from=parsed.from?.value?.[0]?.address?.toLowerCase(); if(!from) continue;
          const users=await pool.query('SELECT * FROM "User" WHERE LOWER(email)=$1',[from]);
          if(!users.rows.length){console.log("  Unknown: "+from);await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true});continue}
          const u=users.rows[0];
          const atts=(parsed.attachments||[]).filter(a=>a.filename&&/\.(pdf|jpg|jpeg|png)$/i.test(a.filename));
          if(!atts.length){await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true});continue}
          const dir=path.join(UPLOAD_DIR,u.id); if(!existsSync(dir)) mkdirSync(dir,{recursive:true});
          let trips=await pool.query('SELECT * FROM "Trip" WHERE "userId"=$1 AND status=\'DRAFT\' ORDER BY "createdAt" DESC LIMIT 1',[u.id]);
          let tripId;
          if(trips.rows.length>0){tripId=trips.rows[0].id}else{
            tripId="c"+randomBytes(12).toString("hex");
            await pool.query('INSERT INTO "Trip"(id,"userId",purpose,"startDate","travelMode",status,"createdAt","updatedAt")VALUES($1,$2,$3,$4,\'BAHN\',\'DRAFT\',NOW(),NOW())',[tripId,u.id,"Beleg: "+(parsed.subject||"E-Mail"),parsed.date||new Date()]);
          }
          for(const att of atts){
            const safe=att.filename.replace(/[^a-zA-Z0-9._-]/g,"_");
            const dup=await pool.query('SELECT id FROM "Receipt" WHERE "tripId" IN (SELECT id FROM "Trip" WHERE "userId"=$1) AND "fileName"=$2',[u.id,safe]);
            if(dup.rows.length>0){console.log("  Skip dup: "+safe);continue}
            const fp=path.join(dir,Date.now()+"_"+safe); writeFileSync(fp,att.content);
            let amt=0,fromS=null,toS=null,ht=false,dt=parsed.date||new Date();
            if(/\.pdf$/i.test(safe)){const t=parseTicket(fp);if(t&&!t.error){if(t.amount)amt=t.amount;if(t.from)fromS=t.from;if(t.to)toS=t.to;if(t.is_handyticket)ht=true;if(t.date){const[d,m,y]=t.date.split(".");dt=new Date(`${y}-${m}-${d}`)}console.log(`  Parsed: ${amt}€ ${fromS||"?"} → ${toS||"?"} ${ht?"(HT)":""}`)}}
            const rid="c"+randomBytes(12).toString("hex");
            await pool.query('INSERT INTO "Receipt"(id,"tripId",description,amount,date,category,"isHandyticket","fromStation","toStation","fileName","filePath","mimeType","fileSize","createdAt")VALUES($1,$2,$3,$4,$5,\'FAHRT\',$6,$7,$8,$9,$10,$11,$12,NOW())',[rid,tripId,"Per E-Mail: "+(parsed.subject||att.filename),amt,dt,ht,fromS,toS,safe,fp,att.contentType,att.size]);
            if(fromS&&toS){const rr=await pool.query('SELECT "fromStation","toStation" FROM "Receipt" WHERE "tripId"=$1 AND "fromStation" IS NOT NULL ORDER BY date',[tripId]);if(rr.rows.length>0){const route=rr.rows.map(r=>r.fromStation).concat(rr.rows[rr.rows.length-1].toStation).join(" – ");await pool.query('UPDATE "Trip" SET route=$1,"updatedAt"=NOW() WHERE id=$2',[route,tripId])}}
            console.log("  ✓ "+safe+(amt?` (${amt}€)`:" (manuell)"));
          }
          await client.messageFlagsAdd({uid:msg.uid},["\\Seen"],{uid:true}); processed++;
        }catch(err){console.error("  Error:",err.message)}
      }
    }finally{lock.release()}
    await client.logout();
  }catch(err){console.error("IMAP error:",err.message)}
  await pool.end(); return processed;
}
console.log(new Date().toISOString()+" Polling...");
const count=await pollEmails();
console.log(new Date().toISOString()+" Done: "+count);
process.exit(0);
