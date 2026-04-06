"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  trips: { total: number; draft: number; pending: number; totalAmount: number };
  sachkosten: { total: number; totalAmount: number };
  bewirtung: { total: number; totalAmount: number };
  bahncard: { total: number; totalCost: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/trips").then(r => r.json()),
      fetch("/api/sachkosten").then(r => r.json()).catch(() => []),
      fetch("/api/bewirtung").then(r => r.json()).catch(() => []),
      fetch("/api/bahncard").then(r => r.json()).catch(() => []),
    ]).then(([trips, sk, bw, bc]) => {
      const tripsArr = Array.isArray(trips) ? trips : [];
      const skArr = Array.isArray(sk) ? sk : [];
      const bwArr = Array.isArray(bw) ? bw : [];
      const bcArr = Array.isArray(bc) ? bc : [];

      setStats({
        trips: {
          total: tripsArr.length,
          draft: tripsArr.filter((t: any) => t.status === "DRAFT").length,
          pending: tripsArr.reduce((sum: number, t: any) => sum + (t.receipts || []).filter((r: any) => r.amount === 0).length, 0),
          totalAmount: tripsArr.reduce((sum: number, t: any) => sum + (t.receipts || []).reduce((s: number, r: any) => s + r.amount, 0), 0),
        },
        sachkosten: {
          total: skArr.length,
          totalAmount: skArr.reduce((sum: number, s: any) => sum + (Array.isArray(s.items) ? s.items.reduce((a: number, i: any) => a + (i.amount || 0), 0) : 0), 0),
        },
        bewirtung: {
          total: bwArr.length,
          totalAmount: bwArr.reduce((sum: number, b: any) => sum + (b.amountTotal || 0), 0),
        },
        bahncard: {
          total: bcArr.length,
          totalCost: bcArr.reduce((sum: number, b: any) => sum + (b.cost || 0), 0),
        },
      });
      setRecentTrips(tripsArr.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) => n.toFixed(2).replace(".", ",") + "\u00a0€";

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9e9a92" }}>Lade Dashboard...</div>;

  const cards = [
    { href: "/reisen", icon: "🚂", label: "Reisen", count: stats?.trips.total || 0, amount: stats?.trips.totalAmount || 0, badge: stats?.trips.pending ? `${stats.trips.pending} Belege offen` : null, badgeColor: "#fef3c7" },
    { href: "/sachkosten", icon: "📋", label: "Sachkosten", count: stats?.sachkosten.total || 0, amount: stats?.sachkosten.totalAmount || 0, badge: null, badgeColor: "" },
    { href: "/bewirtung", icon: "🍽", label: "Bewirtung", count: stats?.bewirtung.total || 0, amount: stats?.bewirtung.totalAmount || 0, badge: null, badgeColor: "" },
    { href: "/bahncard", icon: "🎫", label: "BahnCard", count: stats?.bahncard.total || 0, amount: stats?.bahncard.totalCost || 0, badge: null, badgeColor: "" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#003056", marginBottom: 24 }}>Dashboard</h1>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
        {cards.map(c => (
          <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "#fff", borderRadius: 12, padding: "18px 20px",
              border: "1px solid #d4d0c8", cursor: "pointer",
              transition: "box-shadow 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,48,86,.1)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#003056" }}>{c.count}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#003056", marginTop: 8 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: "#7a756c", marginTop: 2 }}>{fmt(c.amount)}</div>
              {c.badge && (
                <div style={{ marginTop: 8, padding: "3px 10px", borderRadius: 12, background: c.badgeColor, fontSize: 11, fontWeight: 700, color: "#92400e", display: "inline-block" }}>
                  ⚠️ {c.badge}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
        <Link href="/reisen/neu" style={{
          padding: "10px 20px", borderRadius: 8, background: "#003056", color: "#fff",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
        }}>+ Neue Reise</Link>
        <Link href="/sachkosten" style={{
          padding: "10px 20px", borderRadius: 8, border: "1px solid #003056", color: "#003056",
          fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#fff",
        }}>+ Sachkosten</Link>
        <Link href="/bewirtung" style={{
          padding: "10px 20px", borderRadius: 8, border: "1px solid #003056", color: "#003056",
          fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#fff",
        }}>+ Bewirtung</Link>
      </div>

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#5c5850", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Letzte Reisen</h2>
          {recentTrips.map((trip: any) => {
            const tripTotal = (trip.receipts || []).reduce((s: number, r: any) => s + r.amount, 0);
            const pendingCount = (trip.receipts || []).filter((r: any) => r.amount === 0).length;
            return (
              <Link key={trip.id} href={`/reisen/${trip.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#fff", borderRadius: 10, padding: "14px 18px",
                  border: "1px solid #d4d0c8", marginBottom: 8,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer",
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1815" }}>{trip.purpose}</div>
                    <div style={{ fontSize: 12, color: "#9e9a92" }}>
                      {new Date(trip.startDate).toLocaleDateString("de-DE")}
                      {trip.route ? ` · ${trip.route}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {pendingCount > 0 && (
                      <span style={{ padding: "2px 8px", borderRadius: 12, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700 }}>
                        ⚠️ {pendingCount}
                      </span>
                    )}
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#003056" }}>{fmt(tripTotal)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
