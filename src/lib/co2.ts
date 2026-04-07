/**
 * CO2-Emissionsfaktoren (g CO₂/Personenkm)
 * Quelle: Umweltbundesamt 2024
 */
const FACTORS: Record<string, number> = {
  BAHN: 32,          // ICE/IC Fernverkehr
  PRIVAT_PKW: 154,   // Durchschnitt PKW
  MIETWAGEN: 154,    // Durchschnitt PKW
  DIENSTWAGEN: 154,
  FLUGZEUG: 214,     // Inland
  SCHIFF: 0,
};

export function calculateCO2(travelMode: string, km: number): { co2kg: number; co2Text: string } {
  const factor = FACTORS[travelMode] || 0;
  const co2g = factor * km;
  const co2kg = Math.round(co2g / 100) / 10; // auf 0.1 kg runden
  
  const comparisons: string[] = [];
  if (co2kg > 0) {
    const trees = Math.round(co2kg / 22 * 10) / 10; // 1 Baum bindet ~22kg CO2/Jahr
    comparisons.push(`≈ ${trees} Bäume müssten das ${co2kg < 22 ? "anteilig " : ""}ein Jahr kompensieren`);
  }

  return {
    co2kg,
    co2Text: co2kg > 0 ? `${co2kg} kg CO₂` : "0 kg CO₂",
  };
}

export function getCO2Factor(travelMode: string): number {
  return FACTORS[travelMode] || 0;
}

export function formatCO2(co2kg: number): string {
  if (co2kg === 0) return "0 kg";
  if (co2kg < 1) return `${Math.round(co2kg * 1000)} g`;
  return `${co2kg.toFixed(1)} kg`;
}
