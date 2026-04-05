/**
 * Verpflegungspauschalen nach deutschem Reisekostenrecht
 * Stand: 2024/2025/2026 (Inland)
 *
 * - Abwesenheit > 8 Stunden: 14,00 €
 * - Abwesenheit ≥ 24 Stunden: 28,00 €
 * - An-/Abreisetag bei mehrtägigen Reisen: jeweils 14,00 €
 *
 * Kürzungen bei Mahlzeitengestellung:
 * - Frühstück: 5,60 € (20% von 28 €)
 * - Mittag: 11,20 € (40% von 28 €)
 * - Abend: 11,20 € (40% von 28 €)
 */

export interface MealDeduction {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface VerpflegungsDay {
  date: string;             // ISO date
  isArrivalDay: boolean;    // An-/Abreisetag
  isDepartureDay: boolean;
  isFullDay: boolean;       // voller Reisetag (≥24h)
  meals: MealDeduction;     // gestellte Mahlzeiten
  baseAmount: number;       // Pauschale vor Kürzung
  deduction: number;        // Kürzung
  netAmount: number;        // Auszahlungsbetrag
}

export interface VerpflegungsResult {
  days: VerpflegungsDay[];
  totalBase: number;
  totalDeduction: number;
  totalNet: number;
}

const RATES = {
  FULL_DAY: 28.0,        // ≥ 24 Stunden
  PARTIAL_DAY: 14.0,     // > 8 Stunden oder An-/Abreisetag
  BREAKFAST: 5.6,        // 20% von 28 €
  LUNCH: 11.2,           // 40% von 28 €
  DINNER: 11.2,          // 40% von 28 €
};

/**
 * Berechnet die Verpflegungspauschalen für eine Reise.
 *
 * @param startDate - Abreisedatum (ISO string)
 * @param startTime - Abreisezeit ("HH:MM")
 * @param endDate - Rückkehrdatum (ISO string), kann gleich startDate sein
 * @param endTime - Rückkehrzeit ("HH:MM")
 * @param mealsPerDay - Mahlzeiten pro Tag (Index = Tagesnummer ab 0)
 */
export function calculateVerpflegung(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  mealsPerDay: MealDeduction[] = []
): VerpflegungsResult {
  const start = new Date(`${startDate}T${startTime || "00:00"}`);
  const end = new Date(`${endDate || startDate}T${endTime || "23:59"}`);

  // Eintägige Reise
  if (startDate === (endDate || startDate)) {
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const meals = mealsPerDay[0] || { breakfast: false, lunch: false, dinner: false };

    if (hours <= 8) {
      return { days: [], totalBase: 0, totalDeduction: 0, totalNet: 0 };
    }

    const baseAmount = RATES.PARTIAL_DAY;
    const deduction = calcDeduction(meals, baseAmount);
    const netAmount = Math.max(0, baseAmount - deduction);

    return {
      days: [{
        date: startDate,
        isArrivalDay: false,
        isDepartureDay: false,
        isFullDay: false,
        meals,
        baseAmount,
        deduction,
        netAmount,
      }],
      totalBase: baseAmount,
      totalDeduction: deduction,
      totalNet: netAmount,
    };
  }

  // Mehrtägige Reise
  const days: VerpflegungsDay[] = [];
  const current = new Date(startDate);
  const endD = new Date(endDate || startDate);
  let dayIndex = 0;

  while (current <= endD) {
    const dateStr = current.toISOString().split("T")[0];
    const isFirst = dayIndex === 0;
    const isLast = dateStr === endD.toISOString().split("T")[0];
    const meals = mealsPerDay[dayIndex] || { breakfast: false, lunch: false, dinner: false };

    let baseAmount: number;
    let isFullDay = false;

    if (isFirst || isLast) {
      // An- oder Abreisetag: immer 14 €
      baseAmount = RATES.PARTIAL_DAY;
    } else {
      // Zwischentag: 28 €
      baseAmount = RATES.FULL_DAY;
      isFullDay = true;
    }

    const deduction = calcDeduction(meals, baseAmount);
    const netAmount = Math.max(0, baseAmount - deduction);

    days.push({
      date: dateStr,
      isArrivalDay: isFirst,
      isDepartureDay: isLast,
      isFullDay,
      meals,
      baseAmount,
      deduction,
      netAmount,
    });

    current.setDate(current.getDate() + 1);
    dayIndex++;
  }

  return {
    days,
    totalBase: days.reduce((s, d) => s + d.baseAmount, 0),
    totalDeduction: days.reduce((s, d) => s + d.deduction, 0),
    totalNet: days.reduce((s, d) => s + d.netAmount, 0),
  };
}

function calcDeduction(meals: MealDeduction, baseAmount: number): number {
  let deduction = 0;
  if (meals.breakfast) deduction += RATES.BREAKFAST;
  if (meals.lunch) deduction += RATES.LUNCH;
  if (meals.dinner) deduction += RATES.DINNER;
  // Kürzung darf die Pauschale nicht übersteigen
  return Math.min(deduction, baseAmount);
}

/**
 * Formatiert die Verpflegungspauschale für die Reisekostenabrechnung.
 */
export function formatVerpflegungForPdf(result: VerpflegungsResult): string {
  if (result.days.length === 0) return "Keine Verpflegungspauschale (Abwesenheit ≤ 8 Stunden)";

  const lines = result.days.map(d => {
    const dateStr = new Date(d.date).toLocaleDateString("de-DE");
    const type = d.isArrivalDay ? "Anreisetag" : d.isDepartureDay ? "Abreisetag" : "Ganzer Tag";
    const meals: string[] = [];
    if (d.meals.breakfast) meals.push("F");
    if (d.meals.lunch) meals.push("M");
    if (d.meals.dinner) meals.push("A");
    const mealStr = meals.length > 0 ? ` (Kürzung: ${meals.join("+")})` : "";
    return `${dateStr}: ${type} ${d.baseAmount.toFixed(2)} €${mealStr} → ${d.netAmount.toFixed(2)} €`;
  });

  lines.push(`Gesamt: ${result.totalNet.toFixed(2)} €`);
  return lines.join("\n");
}
