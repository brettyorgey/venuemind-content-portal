import { STATES, PARTNERS_DATA } from "../data/constants";

export function StatusBadge({ status }) {
  const s = STATES[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px",
      borderRadius: 8, background: s.bg, color: s.color, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

export function MetricCard({ label, value, sub }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function ValidationRow({ label, passed, message }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 500, flexShrink: 0,
        background: passed === null ? "var(--color-background-secondary)" : passed ? "#EAF3DE" : "#FCEBEB",
        color: passed === null ? "var(--color-text-secondary)" : passed ? "#27500A" : "#791F1F",
      }}>
        {passed === null ? "•" : passed ? "✓" : "✗"}
      </span>
      <span style={{ flex: 1, fontSize: 14, color: "var(--color-text-primary)" }}>{label}</span>
      <span style={{ fontSize: 13, color: passed === null ? "var(--color-text-tertiary)" : passed ? "#639922" : "#E24B4A", textAlign: "right" }}>{message}</span>
    </div>
  );
}

export function HorizontalBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{value} plays ({pct}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--color-background-secondary)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: color, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

export function PartnerAvatar({ partner, size = 32 }) {
  const p = PARTNERS_DATA[partner] || { initials: "?", color: "#f0efeb", textColor: "#5f5e5a" };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: p.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 500, color: p.textColor, flexShrink: 0,
    }}>
      {p.initials}
    </div>
  );
}

export function ContentRow({ item, onClick, showPartner }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
      borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer",
    }}>
      {showPartner && <PartnerAvatar partner={item.partnerId} size={36} />}
      <div style={{
        width: 44, height: 44, borderRadius: 8, background: "var(--color-background-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0,
        border: "0.5px solid var(--color-border-tertiary)",
      }}>
        {item.type.includes("video") ? "MP4" : "IMG"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {showPartner ? `${PARTNERS_DATA[item.partnerId]?.name} — ` : ""}{item.uploaded}
        </div>
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}

export function ContentPreview({ item }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)", borderRadius: 12, padding: 48,
      marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8, color: "var(--color-text-secondary)" }}>
          {item.type.includes("video") ? "▶" : "▣"}
        </div>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Content preview</div>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
          1920×1080 — {item.type.includes("video") ? "30s video" : "Static image"} — {(item.size / (1024 * 1024)).toFixed(1)} MB
        </div>
      </div>
    </div>
  );
}
