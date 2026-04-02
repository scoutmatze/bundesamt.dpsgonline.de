/**
 * DPSG Abrechnungsregeln (Leitfaden Stand 12/2025)
 */

export const RULES = {
  KM_RATE: 0.20,
  PKW_KJP_MAX: 130.0,
  PARKING_MAX_PER_DAY: 5.0,
  GIFT_MAX: 30.0,
  DEADLINE_MONTHS: 3,
  LODGING_MAX_PER_DAY: 51.0,
  KJP_LODGING_RATE: 40.0,
  ADVANCE_MAX_PERCENT: 0.80,
  BICYCLE_MONTHLY: 5.0,
  BICYCLE_MIN_USES: 4,
} as const;

export type Warning = {
  level: "info" | "warning" | "error";
  message: string;
  field?: string;
};

export function validateTrip(trip: {
  startDate: string;
  travelMode: string;
  pkwReason?: string;
  receipts: Array<{ amount: number; category: string; date: string }>;
}): Warning[] {
  const warnings: Warning[] = [];
  const now = new Date();
  const start = new Date(trip.startDate);

  // 3-Monats-Frist
  const monthsDiff =
    (now.getFullYear() - start.getFullYear()) * 12 +
    now.getMonth() - start.getMonth();
  if (monthsDiff >= 3) {
    warnings.push({
      level: "error",
      message: "3-Monats-Abrechnungsfrist überschritten!",
      field: "startDate",
    });
  } else if (monthsDiff >= 2) {
    warnings.push({
      level: "warning",
      message: `Noch ${3 - monthsDiff} Monat(e) bis zur Abrechnungsfrist.`,
      field: "startDate",
    });
  }

  // PKW-Begründung
  if (trip.travelMode === "PRIVAT_PKW" && !trip.pkwReason) {
    warnings.push({
      level: "error",
      message: "Begründung für Privat-PKW erforderlich.",
      field: "pkwReason",
    });
  }

  // PKW-Kosten > 130 €
  const fahrtkostenPkw = trip.receipts
    .filter((r) => r.category === "FAHRT")
    .reduce((s, r) => s + r.amount, 0);
  if (trip.travelMode === "PRIVAT_PKW" && fahrtkostenPkw > RULES.PKW_KJP_MAX) {
    warnings.push({
      level: "warning",
      message: `PKW-Fahrtkosten (${fahrtkostenPkw.toFixed(2)} €) übersteigen 130 € — nicht KJP-förderbar.`,
      field: "receipts",
    });
  }

  // Belegdatum außerhalb Reisezeitraum
  for (const r of trip.receipts) {
    const rd = new Date(r.date);
    const sd = new Date(trip.startDate);
    if (rd < sd) {
      warnings.push({
        level: "warning",
        message: `Beleg vom ${r.date} liegt vor dem Reisebeginn.`,
        field: "receipts",
      });
    }
  }

  return warnings;
}
