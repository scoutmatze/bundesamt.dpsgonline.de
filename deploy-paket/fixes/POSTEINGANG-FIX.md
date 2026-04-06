// ══════════════════════════════════════════════════════
// POSTEINGANG FIX
// ══════════════════════════════════════════════════════
//
// Problem: Der Poller routet Nicht-DB-Anhänge nicht in den Posteingang.
// Ursache: `await import("child_process")` funktioniert nicht im Poller-Kontext.
//          execSync ist schon am Anfang importiert.
//
// Fix: In scripts/poll-emails.mjs die Inbox-Zeilen ersetzen.
//
// SUCHE diese Zeilen (ca. Zeile 84-92):
//
//   if (!isDbTicket) {
//     // Non-DB attachment → Inbox
//     let preview="";
//     try{const {execSync:ex}=await import("child_process");preview=ex(`python3 ...
//
// ERSETZE MIT:
//
//   if (!isDbTicket) {
//     // Non-DB attachment → Inbox
//     let preview="";
//     try{preview=execSync(`python3 -c "
// import pdfplumber
// with pdfplumber.open('${fp}') as pdf:
//   for p in pdf.pages[:1]:
//     t=p.extract_text()
//     if t: print(t[:500])
// "`,{timeout:10000}).toString().trim()}catch{}
//     const iid="in"+randomBytes(12).toString("hex");
//     await pool.query('INSERT INTO "InboxItem"(id,"userId","fileName","filePath","mimeType","fileSize","subject","preview",status,"createdAt")VALUES($1,$2,$3,$4,$5,$6,$7,$8,\'NEW\',$9)',[iid,u.id,safe,fp,att.contentType,att.size,parsed.subject||null,preview||null,new Date()]);
//     console.log("  → Inbox: "+safe);
//     continue;
//   }
//
// ══════════════════════════════════════════════════════
// ZUSÄTZLICH: execSync muss am Anfang des Scripts importiert sein
// Prüfe: grep "execSync" scripts/poll-emails.mjs | head -3
// Falls nicht vorhanden, füge nach den anderen imports hinzu:
//   import { execSync } from "child_process";
// ══════════════════════════════════════════════════════
