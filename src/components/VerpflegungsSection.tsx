"use client";
import { useState, useEffect } from "react";
import { calculateVerpflegung, type MealDeduction, type VerpflegungsResult } from "@/lib/verpflegung";

const S = {
  label: { display: "block" as const, fontSize: 12, fontWeight: 600, color: "#5c5850", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.6 },
};

interface Props {
  tripId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onUpdate: (amount: number) => void;
}

export default function VerpflegungsSection({ tripId, startDate, startTime, endDate, endTime, onUpdate }: Props) {
  const [meals, setMeals] = useState<MealDeduction[]>([]);
  const [result, setResult] = useState<VerpflegungsResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!startDate || !startTime || !endTime) {
      setResult(null);
      return;
    }
    const r = calculateVerpflegung(startDate, startTime, endDate || startDate, endTime, meals);
    setResult(r);
    onUpdate(r.totalNet);
  }, [startDate, startTime, endDate, endTime, meals]);

  // Initialize meals array when days change
  useEffect(() => {
    if (!result) return;
    if (meals.length < result.days.length) {
      const newMeals = [...meals];
      while (newMeals.length < result.days.length) {
        newMeals.push({ breakfast: false, lunch: false, dinner: false });
      }
      setMeals(newMeals);
    }
  }, [result?.days.length]);

  const toggleMeal = (dayIdx: number, meal: keyof MealDeduction) => {
    const newMeals = [...meals];
    if (!newMeals[dayIdx]) newMeals[dayIdx] = { breakfast: false, lunch: false, dinner: false };
    newMeals[dayIdx] = { ...newMeals[dayIdx], [meal]: !newMeals[dayIdx][meal] };
    setMeals(newMeals);
  };

  const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";

  if (!result || result.days.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={S.label}>Verpflegungspauschale</label>
          <span style={{ fontSize: 13, color: "#9e9a92" }}>
            {!startTime || !endTime ? "Bitte Reisezeiten eintragen" : "Abwesenheit ≤ 8 Stunden — keine Pauschale"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <label style={{ ...S.label, marginBottom: 0 }}>Verpflegungspauschale</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#003056" }}>{fmt(result.totalNet)}</span>
          <span style={{ fontSize: 12, color: "#9e9a92" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #d4d0c8" }}>
                <th style={{ textAlign: "left", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>DATUM</th>
                <th style={{ textAlign: "left", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>TYP</th>
                <th style={{ textAlign: "center", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>🥐 F</th>
                <th style={{ textAlign: "center", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>🍽 M</th>
                <th style={{ textAlign: "center", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>🍷 A</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>PAUSCHALE</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>KÜRZUNG</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontSize: 11, color: "#5c5850", fontWeight: 600 }}>BETRAG</th>
              </tr>
            </thead>
            <tbody>
              {result.days.map((d, i) => (
                <tr key={d.date} style={{ borderBottom: "1px solid #f5f3ef" }}>
                  <td style={{ padding: "8px 0" }}>{new Date(d.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                  <td style={{ padding: "8px 0", color: "#7a756c" }}>
                    {d.isArrivalDay ? "Anreise" : d.isDepartureDay ? "Abreise" : "Ganzer Tag"}
                  </td>
                  {(["breakfast", "lunch", "dinner"] as const).map(meal => (
                    <td key={meal} style={{ textAlign: "center", padding: "8px 0" }}>
                      <input
                        type="checkbox"
                        checked={meals[i]?.[meal] || false}
                        onChange={() => toggleMeal(i, meal)}
                        title={meal === "breakfast" ? "Frühstück gestellt" : meal === "lunch" ? "Mittagessen gestellt" : "Abendessen gestellt"}
                        style={{ width: 16, height: 16, accentColor: "#003056", cursor: "pointer" }}
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: "right", padding: "8px 0" }}>{fmt(d.baseAmount)}</td>
                  <td style={{ textAlign: "right", padding: "8px 0", color: d.deduction > 0 ? "#b45309" : "#9e9a92" }}>
                    {d.deduction > 0 ? `−${fmt(d.deduction)}` : "—"}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 700, color: "#003056" }}>{fmt(d.netAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #d4d0c8" }}>
                <td colSpan={5} style={{ padding: "8px 0", fontWeight: 700 }}>Gesamt</td>
                <td style={{ textAlign: "right", padding: "8px 0" }}>{fmt(result.totalBase)}</td>
                <td style={{ textAlign: "right", padding: "8px 0", color: result.totalDeduction > 0 ? "#b45309" : "#9e9a92" }}>
                  {result.totalDeduction > 0 ? `−${fmt(result.totalDeduction)}` : "—"}
                </td>
                <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 700, color: "#003056", fontSize: 15 }}>{fmt(result.totalNet)}</td>
              </tr>
            </tfoot>
          </table>
          <p style={{ fontSize: 11, color: "#9e9a92", marginTop: 8, marginBottom: 0 }}>
            F = Frühstück (−5,60 €) · M = Mittagessen (−11,20 €) · A = Abendessen (−11,20 €). Häkchen = Mahlzeit wurde gestellt.
          </p>
        </div>
      )}
    </div>
  );
}
