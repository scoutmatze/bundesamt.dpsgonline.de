import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import pg from "pg";
import { randomBytes } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = "/app/uploads";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function getOAuth2Token() {
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) throw new Error("Azure OAuth2 not configured");

  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://outlook.office365.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (!data.access_token) throw new Error("OAuth2 failed: " + JSON.stringify(data));
  return data.access_token;
}

async function pollEmails() {
  const user = process.env.IMAP_USER;
  if (!user) { console.log("IMAP_USER not set"); return 0; }

  let token;
  try {
    token = await getOAuth2Token();
    console.log("OAuth2 token obtained");
  } catch (e) { console.error("OAuth2 error:", e.message); return 0; }

  const client = new ImapFlow({
    host: "outlook.office365.com",
    port: 993,
    secure: true,
    auth: { user, accessToken: token },
    logger: false,
  });

  let processed = 0;
  try {
    await client.connect();
    console.log("IMAP connected (OAuth2)");
    const lock = await client.getMailboxLock("INBOX");
    try {
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true, uid: true })) {
        try {
          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase();
          if (!fromAddr) continue;
          const users = await pool.query('SELECT * FROM "User" WHERE email = $1', [fromAddr]);
          if (users.rows.length === 0) { console.log("Unknown: " + fromAddr); await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true }); continue; }
          const dbUser = users.rows[0];
          const validExts = [".pdf", ".jpg", ".jpeg", ".png"];
          const attachments = (parsed.attachments || []).filter(a => a.filename && validExts.some(ext => a.filename.toLowerCase().endsWith(ext)));
          if (attachments.length === 0) { await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true }); continue; }
          const userDir = path.join(UPLOAD_DIR, dbUser.id);
          if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true });
          let trips = await pool.query('SELECT * FROM "Trip" WHERE "userId" = $1 AND status = \'DRAFT\' ORDER BY "createdAt" DESC LIMIT 1', [dbUser.id]);
          let tripId;
          if (trips.rows.length > 0) { tripId = trips.rows[0].id; } else {
            tripId = "c" + randomBytes(12).toString("hex");
            await pool.query('INSERT INTO "Trip" (id, "userId", purpose, "startDate", "travelMode", status, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,\'BAHN\',\'DRAFT\',NOW(),NOW())', [tripId, dbUser.id, "Beleg: " + (parsed.subject || "E-Mail"), parsed.date || new Date()]);
          }
          for (const att of attachments) {
            const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
            const localPath = path.join(userDir, Date.now() + "_" + safeName);
            writeFileSync(localPath, att.content);
            const rid = "c" + randomBytes(12).toString("hex");
            await pool.query('INSERT INTO "Receipt" (id, "tripId", description, amount, date, category, "isHandyticket", "fileName", "filePath", "mimeType", "fileSize", "createdAt") VALUES ($1,$2,$3,0,$4,\'FAHRT\',false,$5,$6,$7,$8,NOW())', [rid, tripId, "Per E-Mail: " + (parsed.subject || att.filename), parsed.date || new Date(), safeName, localPath, att.contentType, att.size]);
            console.log("Beleg: " + safeName);
          }
          await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true });
          processed++;
        } catch (err) { console.error("Error:", err.message); }
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (err) { console.error("IMAP error:", err.message); }
  await pool.end();
  return processed;
}

console.log(new Date().toISOString() + " Polling (OAuth2)...");
const count = await pollEmails();
console.log(new Date().toISOString() + " Done: " + count + " email(s)");
