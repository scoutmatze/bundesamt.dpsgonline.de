#!/usr/bin/env node
/**
 * DPSG Reisekosten — Re-parse existing receipts
 * Updates receipts that have missing amounts or stations by re-running the parser.
 * 
 * Usage: docker compose -f docker-compose.prod.yml exec app node /app/scripts/reparse-receipts.mjs
 */
import pg from "pg";
import { execSync } from "child_process";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function parseFile(filePath) {
  try {
    const out = execSync(
      `python3 /app/pdf-generator/parse_db_ticket.py "${filePath}"`,
      { timeout: 15000 }
    ).toString().trim();
    return JSON.parse(out);
  } catch (e) {
    return null;
  }
}

async function reparse() {
  // Find all receipts that have a file but missing amount or stations
  const { rows } = await pool.query(`
    SELECT r.id, r.description, r.amount, r."fromStation", r."toStation",
           r."filePath", r."fileName", r."isHandyticket",
           r."tripId"
    FROM "Receipt" r
    WHERE r."filePath" IS NOT NULL
      AND r."fileName" LIKE '%.pdf'
    ORDER BY r.date ASC
  `);

  console.log(`Found ${rows.length} receipts with PDF files\n`);

  let updated = 0;

  for (const r of rows) {
    const filePath = r.filePath;
    const parsed = parseFile(filePath);
    if (!parsed || parsed.error) {
      console.log(`  ✗ ${r.fileName}: parse failed`);
      continue;
    }

    const changes = [];
    const updates = {};

    // Update amount if missing or zero
    if ((!r.amount || r.amount === 0) && parsed.amount) {
      updates.amount = parsed.amount;
      changes.push(`amount: ${parsed.amount}€`);
    }

    // Update stations if missing
    if (!r.fromStation && parsed.from) {
      updates.fromStation = parsed.from;
      changes.push(`from: ${parsed.from}`);
    }
    if (!r.toStation && parsed.to) {
      updates.toStation = parsed.to;
      changes.push(`to: ${parsed.to}`);
    }

    // Update handyticket flag
    if (!r.isHandyticket && parsed.is_handyticket) {
      updates.isHandyticket = true;
      changes.push("handyticket: ✓");
    }

    // Improve description if it still shows "? → ?"
    if (r.description && r.description.includes("? → ?") && parsed.from && parsed.to) {
      const orderNr = parsed.order_nr || "";
      const newDesc = orderNr
        ? `DB #${orderNr}: ${parsed.from} → ${parsed.to}`
        : `${parsed.from} → ${parsed.to}`;
      updates.description = newDesc;
      changes.push(`desc: ${newDesc}`);
    }

    // Add doc_type info to description for Kaufbelege
    if (parsed.doc_type === "kaufbeleg" && r.description && !r.description.includes("Rechnung")) {
      // Optionally append reservation info
      if (parsed.reservation_amount && parsed.reservation_amount > 0) {
        const resInfo = ` (inkl. ${parsed.reservation_amount.toFixed(2).replace(".", ",")} € Reservierung)`;
        if (!r.description.includes("Reservierung") && updates.description) {
          updates.description += resInfo;
          changes.push(`res: ${parsed.reservation_amount}€`);
        } else if (!r.description.includes("Reservierung")) {
          updates.description = (r.description || "") + resInfo;
          changes.push(`res: ${parsed.reservation_amount}€`);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  ○ ${r.fileName}: already complete`);
      continue;
    }

    // Build UPDATE query
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, val] of Object.entries(updates)) {
      setClauses.push(`"${key}" = $${paramIdx}`);
      values.push(val);
      paramIdx++;
    }
    setClauses.push(`"updatedAt" = NOW()`);
    values.push(r.id);

    await pool.query(
      `UPDATE "Receipt" SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
      values
    );

    // Update trip route if stations changed
    if (updates.fromStation || updates.toStation) {
      const rr = await pool.query(
        'SELECT "fromStation", "toStation" FROM "Receipt" WHERE "tripId" = $1 AND "fromStation" IS NOT NULL ORDER BY date',
        [r.tripId]
      );
      if (rr.rows.length > 0) {
        const route = rr.rows
          .map((r) => r.fromStation)
          .concat(rr.rows[rr.rows.length - 1].toStation)
          .join(" – ");
        await pool.query(
          'UPDATE "Trip" SET route = $1, "updatedAt" = NOW() WHERE id = $2',
          [route, r.tripId]
        );
      }
    }

    console.log(`  ✓ ${r.fileName}: ${changes.join(", ")}`);
    updated++;
  }

  console.log(`\nDone: ${updated}/${rows.length} receipts updated`);
}

reparse()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FATAL:", e.message);
    process.exit(1);
  });
