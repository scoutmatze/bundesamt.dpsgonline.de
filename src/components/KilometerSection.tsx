"use client";
import { useState, useCallback } from "react";

interface KilometerLeg {
  id: string;
  from: string;
  to: string;
  km: number;
  note?: string;
}

interface Props {
  tripId: string;
  initialLegs?: KilometerLeg[];
  rate: number;  // €/km, e.g. 0.30
  onUpdate: (legs: KilometerLeg[], totalKm: number, totalAmount: number) => void;
}

export default function KilometerSection({ tripId, initialLegs = [], rate = 0.30, onUpdate }: Props) {
  const [legs, setLegs] = useState<KilometerLeg[]>(initialLegs);
  const [expanded, setExpanded] = useState(initialLegs.length > 0);
  const [lookupIdx, setLookupIdx] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const totalKm = legs.reduce((s, l) => s + l.km, 0);
  const totalAmount = totalKm * rate;
  const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";

  const updateAndNotify = useCallback((newLegs: KilometerLeg[]) => {
    setLegs(newLegs);
    const km = newLegs.reduce((s, l) => s + l.km, 0);
    onUpdate(newLegs, km, km * rate);
  }, [rate, onUpdate]);

  const addLeg = () => {
    const newLeg: KilometerLeg = {
      id: "k" + Date.now(),
      from: "",
      to: "",
      km: 0,
    };
    updateAndNotify([...legs, newLeg]);
    setExpanded(true);
  };

  const updateLeg = (idx: number, field: keyof KilometerLeg, value: any) => {
    const newLegs = [...legs];
    newLegs[idx] = { ...newLegs[idx], [field]: value };
    updateAndNotify(newLegs);
  };

  const removeLeg = (idx: number) => {
    const newLegs = legs.filter((_, i) => i !== idx);
    updateAndNotify(newLegs);
  };

  const lookupDistance = async (idx: number) => {
    const leg = legs[idx];
    if (!leg.from || !leg.to) return;

    setLookupIdx(idx);
    setLookupLoading(true);

    try {
      // Use server-side API route to avoid exposing API key
      const res = await fetch(`/api/distance?from=${encodeURIComponent(leg.from)}&to=${encodeURIComponent(leg.to)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.km) {
          updateLeg(idx, "km", Math.round(data.km));
        }
      } else {
        alert("Entfernung konnte nicht ermittelt werden. Bitte manuell eingeben.");
      }
    } catch {
      alert("Fehler bei der Entfernungsberechnung.");
    } finally {
      setLookupIdx(null);
      setLookupLoading(false);
    }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5c5850", textTransform: "uppercase", letterSpacing: 0.6 }}>
          Kilometerabrechnung ({rate.toFixed(2).replace(".", ",")} €/km)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {legs.length > 0 && (
            <span style={{ fontWeight: 700, fontSize: 16, color: "#003056" }}>
              {totalKm} km · {fmt(totalAmount)}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#9e9a92" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {legs.map((leg, i) => (
            <div key={leg.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
              gap: 8, alignItems: "end", marginBottom: 8, padding: "10px 12px",
              background: "#f5f3ef", borderRadius: 8,
            }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5850", display: "block", marginBottom: 3 }}>VON</label>
                <input
                  value={leg.from}
                  onChange={e => updateLeg(i, "from", e.target.value)}
                  placeholder="z.B. Mönchengladbach"
                  style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #d4d0c8", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5850", display: "block", marginBottom: 3 }}>NACH</label>
                <input
                  value={leg.to}
                  onChange={e => updateLeg(i, "to", e.target.value)}
                  placeholder="z.B. Neuss"
                  style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #d4d0c8", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5850", display: "block", marginBottom: 3 }}>KM</label>
                <input
                  type="number"
                  value={leg.km || ""}
                  onChange={e => updateLeg(i, "km", parseInt(e.target.value) || 0)}
                  style={{ width: 70, padding: "7px 10px", border: "1.5px solid #d4d0c8", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "right" }}
                />
              </div>
              <button
                onClick={() => lookupDistance(i)}
                disabled={!leg.from || !leg.to || lookupLoading}
                title="Entfernung per Google Maps berechnen"
                style={{
                  padding: "7px 10px", borderRadius: 6, border: "1px solid #d4d0c8",
                  background: lookupIdx === i ? "#dbeafe" : "#fff",
                  color: "#003056", fontSize: 13, cursor: "pointer", marginBottom: 0,
                }}
              >
                {lookupIdx === i ? "⏳" : "📍"}
              </button>
              <button
                onClick={() => removeLeg(i)}
                style={{ padding: "7px 10px", border: "none", background: "none", color: "#9e9a92", fontSize: 16, cursor: "pointer" }}
              >✕</button>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button onClick={addLeg} style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid #00305640",
              background: "transparent", color: "#003056", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>+ Strecke hinzufügen</button>

            {legs.length > 0 && (
              <div style={{ fontSize: 14, fontWeight: 700, color: "#003056" }}>
                {totalKm} km × {rate.toFixed(2).replace(".", ",")} € = {fmt(totalAmount)}
              </div>
            )}
          </div>

          <p style={{ fontSize: 11, color: "#9e9a92", marginTop: 8, marginBottom: 0 }}>
            📍 = Entfernung per Google Maps berechnen (Server-seitig, erfordert API-Key in .env).
            Alternativ manuell eingeben.
          </p>
        </div>
      )}
    </div>
  );
}
