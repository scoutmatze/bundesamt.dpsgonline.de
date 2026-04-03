export function EmailBadge() {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 12,
      background: "#E8F4FD",
      color: "#1565C0",
      fontSize: 11,
      fontWeight: 600,
    }}>
      📩 Per E-Mail
    </span>
  );
}

export function AmountMissing() {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 12,
      background: "#FFF3E0",
      color: "#E65100",
      fontSize: 11,
      fontWeight: 600,
    }}>
      ⚠️ Betrag fehlt
    </span>
  );
}
