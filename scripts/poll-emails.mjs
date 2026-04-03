#!/usr/bin/env node
/**
 * DPSG Reisekosten — Email Beleg-Eingang
 * Standalone Script, läuft per Cronjob alle 5 Minuten.
 * 
 * Usage: node scripts/poll-emails.mjs
 * 
 * Env vars: IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD, DATABASE_URL
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import pg from "pg";
import { randomBytes } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/dpsg-reisekosten/uploads";

// ─── Database ───
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params) {
  const res = await pool.query(sql, params);
  return res.rows;
}

// ─── IMAP ───
async function pollEmails() {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;

  if (!host || !user || !pass) {
    console.log("IMAP not configured, skipping");
    return 0;
  }

  const client = new ImapFlow({
    host,
    port: parseInt(process.env.IMAP_PORT || "993"),
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let processed = 0;

  try {
    await client.connect();
    console.log("✓ IMAP connected");

    const lock = await client.getMailboxLock("INBOX");

    try {
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true, uid: true })) {
        try {
          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase();
          if (!fromAddr) continue;

          // Find user
          const users = await query("SELECT * FROM \"User\" WHERE email = $1", [fromAddr]);
          if (users.length === 0) {
            console.log(`  ⚠ Unbekannt: ${fromAddr}`);
            await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true });
            continue;
          }
          const dbUser = users[0];

          // Filter valid attachments
          const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".heic"];
          const attachments = (parsed.attachments || []).filter(
            (a) => a.filename && validExts.some((ext) => a.filename.toLowerCase().endsWith(ext))
          );

          if (attachments.length === 0) {
            console.log(`  ⚠ Keine Anhänge von ${fromAddr}`);
            await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true });
            continue;
          }

          // Ensure upload dir
          const userDir = path.join(UPLOAD_DIR, dbUser.id);
          if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true });

          // Find or create DRAFT trip
          let trips = await query(
            "SELECT * FROM \"Trip\" WHERE \"userId\" = $1 AND status = 'DRAFT' ORDER BY \"createdAt\" DESC LIMIT 1",
            [dbUser.id]
          );

          let tripId;
          if (trips.length > 0) {
            tripId = trips[0].id;
          } else {
            const subject = parsed.subject || "Beleg per E-Mail";
            const id = "c" + randomBytes(12).toString("hex");
            const emailDate = parsed.date || new Date();
            await query(
              `INSERT INTO "Trip" (id, "userId", purpose, "startDate", "travelMode", status, "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, 'BAHN', 'DRAFT', NOW(), NOW())`,
              [id, dbUser.id, `📩 ${subject}`, emailDate]
            );
            tripId = id;
            console.log(`  ✓ Neue Reise: ${subject}`);
          }

          // Save attachments + create receipts
          for (const att of attachments) {
            const ts = Date.now();
            const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
            const localPath = path.join(userDir, `${ts}_${safeName}`);
            writeFileSync(localPath, att.content);

            const receiptId = "c" + randomBytes(12).toString("hex");
            await query(
              `INSERT INTO "Receipt" (id, "tripId", description, amount, date, category, "isHandyticket", "fileName", "filePath", "mimeType", "fileSize", "createdAt")
               VALUES ($1, $2, $3, 0, $4, 'FAHRT', false, $5, $6, $7, $8, NOW())`,
              [receiptId, tripId, `📩 ${parsed.subject || att.filename}`, parsed.date || new Date(), safeName, localPath, att.contentType, att.size]
            );
            console.log(`  ✓ Beleg: ${safeName} (${(att.size / 1024).toFixed(0)} KB)`);
          }

          await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true });
          processed++;
          console.log(`✓ ${fromAddr}: ${attachments.length} Beleg(e)`);

        } catch (err) {
          console.error(`  ✗ Fehler UID ${msg.uid}:`, err.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("✗ IMAP Fehler:", err.message);
  }

  await pool.end();
  return processed;
}

// ─── Run ───
console.log(`[${new Date().toISOString()}] Email-Poller startet...`);
const count = await pollEmails();
console.log(`[${new Date().toISOString()}] ${count} E-Mail(s) verarbeitet\n`);
