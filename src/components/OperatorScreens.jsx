import { useState } from "react";
import {
  PARTNERS_DATA,
  CAMPAIGN_STATUSES,
  ENTITLEMENT_TYPES,
  EVENT_TYPES,
  ZONES,
  CONTENT_SPECS_BY_FORMAT,
  getAllocationsForEvent,
} from "../data/constants";
import { StatusBadge, MetricCard, ValidationRow, PartnerAvatar, ContentRow, ContentPreview } from "./SharedComponents";

// ── Operator Dashboard ──

export function OperatorDashboard({ content, onNavigate }) {
  const pendingItems = content.filter(c => c.status === "pending");
  const rejectedItems = content.filter(c => c.status === "rejected");
  const liveItems = content.filter(c => c.status === "live");
  const approvedItems = content.filter(c => c.status === "approved");
  const partnerIds = [...new Set(content.map(c => c.partnerId))];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Operator dashboard</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Adelaide Oval — Non-event display management</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Pending review" value={pendingItems.length} />
        <MetricCard label="Rejected" value={rejectedItems.length} />
        <MetricCard label="Approved" value={approvedItems.length} />
        <MetricCard label="Live content" value={liveItems.length} />
      </div>

      {rejectedItems.length > 0 && (
        <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#791F1F" }}>{rejectedItems.length} rejected item{rejectedItems.length > 1 ? "s" : ""} requiring attention</span>
          <button onClick={() => onNavigate("o-review")} style={{ marginLeft: "auto", fontSize: 13, color: "#A32D2D", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Review</button>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#378ADD", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#0C447C" }}>{pendingItems.length} item{pendingItems.length > 1 ? "s" : ""} awaiting review</span>
          <button onClick={() => onNavigate("o-review")} style={{ marginLeft: "auto", fontSize: 13, color: "#185FA5", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Review now</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        <button onClick={() => onNavigate("o-review")} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "#1B2A4A", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Review queue</button>
        <button onClick={() => onNavigate("o-partners")} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Partner management</button>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>Recent activity</h3>
      {[...content].sort((a, b) => b.uploaded.localeCompare(a.uploaded)).slice(0, 5).map(item => (
        <ContentRow key={item.id} item={item} showPartner onClick={() => onNavigate("o-review-detail", item.id)} />
      ))}
    </div>
  );
}

// ── Operator Review Queue ──

export function OperatorReviewQueue({ content, allocations = [], events = [], onNavigate }) {
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const actionable = content.filter(c => c.status === "pending" || c.status === "rejected");
  const pendingCount = actionable.filter(c => c.status === "pending").length;
  const rejectedCount = actionable.filter(c => c.status === "rejected").length;
  const afterStatus = statusFilter === "all" ? actionable : actionable.filter(c => c.status === statusFilter);
  const filtered = partnerFilter === "all" ? afterStatus : afterStatus.filter(c => c.partnerId === partnerFilter);
  const partnerIds = [...new Set(actionable.map(c => c.partnerId))];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Review queue</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{actionable.length} item{actionable.length !== 1 ? "s" : ""} requiring attention</p>
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setStatusFilter("all")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: statusFilter === "all" ? "#1B2A4A" : "var(--color-background-primary)", color: statusFilter === "all" ? "#fff" : "var(--color-text-secondary)", border: statusFilter === "all" ? "none" : "0.5px solid var(--color-border-tertiary)" }}>All ({actionable.length})</button>
        {pendingCount > 0 && <button onClick={() => setStatusFilter("pending")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: statusFilter === "pending" ? "#1B2A4A" : "var(--color-background-primary)", color: statusFilter === "pending" ? "#fff" : "var(--color-text-secondary)", border: statusFilter === "pending" ? "none" : "0.5px solid var(--color-border-tertiary)" }}>Under review ({pendingCount})</button>}
        {rejectedCount > 0 && <button onClick={() => setStatusFilter("rejected")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: statusFilter === "rejected" ? "#1B2A4A" : "var(--color-background-primary)", color: statusFilter === "rejected" ? "#fff" : "var(--color-text-secondary)", border: statusFilter === "rejected" ? "none" : "0.5px solid var(--color-border-tertiary)" }}>Rejected ({rejectedCount})</button>}
      </div>

      {/* Partner filter */}
      {partnerIds.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <button onClick={() => setPartnerFilter("all")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: partnerFilter === "all" ? "#1B2A4A" : "var(--color-background-primary)", color: partnerFilter === "all" ? "#fff" : "var(--color-text-secondary)", border: partnerFilter === "all" ? "none" : "0.5px solid var(--color-border-tertiary)" }}>All partners</button>
          {partnerIds.map(pid => {
            const p = PARTNERS_DATA[pid];
            const cnt = afterStatus.filter(c => c.partnerId === pid).length;
            if (cnt === 0) return null;
            return <button key={pid} onClick={() => setPartnerFilter(pid)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: partnerFilter === pid ? "#1B2A4A" : "var(--color-background-primary)", color: partnerFilter === pid ? "#fff" : "var(--color-text-secondary)", border: partnerFilter === pid ? "none" : "0.5px solid var(--color-border-tertiary)" }}>{p?.name} ({cnt})</button>;
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12, color: "var(--color-text-secondary)" }}>{"✓"}</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>All caught up</div>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>No content requiring attention.</div>
        </div>
      ) : filtered.map(item => {
        const alloc = item.allocationId ? (allocations ?? []).find(a => a.id === item.allocationId) : null;
        const event = alloc ? (events ?? []).find(e => e.id === alloc.eventId) : null;
        return (
          <div key={item.id} style={{ marginBottom: 8 }}>
            <ContentRow item={item} showPartner onClick={() => onNavigate("o-review-detail", item.id)} />
            {alloc && event && (
              <div style={{ margin: "-4px 0 0", padding: "6px 14px 8px", borderRadius: "0 0 8px 8px", background: "#EEF2FF", border: "0.5px solid #C7D2FE", borderTop: "none", fontSize: 11, color: "#4338CA", display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>📅 {event.name} — {new Date(event.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                <span>📋 {alloc.label}</span>
                <span>{alloc.displayFormat} · {alloc.slotCount} slots</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Operator Review Detail — context-aware actions based on status ──

export function OperatorReviewDetail({ item, allocations, events, onApprove, onReject, onRemoveFromRotation, onNavigate }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionDone, setActionDone] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!item) return null;
  const partner = PARTNERS_DATA[item.partnerId];

  // Find the allocation this content belongs to (if any)
  const allocation = allocations?.find(a => a.id === item.allocationId) ?? null;
  const event      = allocation ? events?.find(e => e.id === allocation.eventId) ?? null : null;

  if (actionDone) {
    const messages = {
      approved: "Content approved and ready for rotation.",
      rejected: "Content rejected. The partner has been notified to upload a replacement.",
      removed:  "Content removed from rotation and set to Under Review. The partner can upload a replacement.",
    };
    return (
      <div style={{ textAlign: "center", padding: "48px 16px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: actionDone === "approved" ? "#E1F5EE" : actionDone === "removed" ? "#E6F1FB" : "#FCEBEB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: actionDone === "approved" ? "#1D9E75" : actionDone === "removed" ? "#0C447C" : "#E24B4A" }}>
          {actionDone === "approved" ? "✓" : actionDone === "removed" ? "↩" : "✗"}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px", color: "var(--color-text-primary)" }}>
          {actionDone === "removed" ? "Removed from rotation" : `Content ${actionDone}`}
        </h3>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>{messages[actionDone]}</p>
        <button onClick={() => onNavigate("o-review")} style={{ padding: "10px 20px", borderRadius: 8, background: "#1B2A4A", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Back to review queue</button>
      </div>
    );
  }

  const canApprove  = ["pending", "rejected"].includes(item.status);
  const canReject   = ["pending", "approved"].includes(item.status);
  const isLive      = item.status === "live";
  const isScheduled = item.status === "scheduled";
  const isReadOnly  = isLive || isScheduled;

  return (
    <div>
      <button onClick={() => onNavigate("o-review")} style={{ fontSize: 13, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <PartnerAvatar partner={item.partnerId} size={40} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 2px", color: "var(--color-text-primary)" }}>{item.name}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{partner?.name} — {item.filename}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <ContentPreview item={item} />

      {/* Allocation context — shown when content is linked to an allocation */}
      {allocation && event && (
        <div style={{ background: "#EEF2FF", border: "0.5px solid #C7D2FE", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3730A3", marginBottom: 8 }}>Allocation context</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13 }}>
            <div><span style={{ color: "#4338CA" }}>Event: </span><span style={{ color: "#1E1B4B", fontWeight: 500 }}>{event.name}</span></div>
            <div><span style={{ color: "#4338CA" }}>Date: </span><span style={{ color: "#1E1B4B", fontWeight: 500 }}>{new Date(event.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span></div>
            <div><span style={{ color: "#4338CA" }}>Allocation: </span><span style={{ color: "#1E1B4B", fontWeight: 500 }}>{allocation.label}</span></div>
            <div><span style={{ color: "#4338CA" }}>Format: </span><span style={{ color: "#1E1B4B", fontWeight: 500 }}>{allocation.displayFormat} — {allocation.slotCount} slots</span></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "#4338CA" }}>Zones: </span>
              <span style={{ color: "#1E1B4B", fontWeight: 500 }}>{allocation.zones.join(", ")}</span>
            </div>
          </div>
          {allocation.notes && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#4338CA", fontStyle: "italic" }}>{allocation.notes}</div>
          )}
        </div>
      )}

      {/* Rejection reason if already rejected */}
      {item.status === "rejected" && item.rejectReason && (
        <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#791F1F", marginBottom: 4 }}>Previous rejection reason</div>
          <div style={{ fontSize: 14, color: "#791F1F" }}>{item.rejectReason}</div>
        </div>
      )}

      {/* Partner context */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8 }}>Partner details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          <div><span style={{ color: "var(--color-text-secondary)" }}>Package: </span><span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{partner?.package}</span></div>
          <div><span style={{ color: "var(--color-text-secondary)" }}>Slots / hour: </span><span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{partner?.slots}</span></div>
          <div><span style={{ color: "var(--color-text-secondary)" }}>Content limit: </span><span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{partner?.pieces} pieces</span></div>
          <div><span style={{ color: "var(--color-text-secondary)" }}>Submitted: </span><span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{item.uploaded}</span></div>
        </div>
      </div>

      {/* Validation results */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8 }}>Automated validation</div>
        <ValidationRow label="File format" passed={true} message={item.type.split("/")[1].toUpperCase()} />
        <ValidationRow label="File size" passed={true} message={`${(item.size / (1024 * 1024)).toFixed(1)} MB`} />
        <ValidationRow label="Resolution" passed={true} message="1920×1080" />
        {item.type.includes("video") && <ValidationRow label="Duration" passed={true} message="30s" />}
      </div>

      {/* Live / Scheduled — Remove from rotation */}
      {isReadOnly && !confirmRemove && (
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>
            This content is currently {item.status === "live" ? "live in rotation" : "scheduled"}.
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            Remove it from rotation first. This will set the status to Under Review — the partner will need to re-upload or the content can be re-approved before going live again.
          </div>
          <button
            onClick={() => setConfirmRemove(true)}
            style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-background-primary)", color: "#791F1F", border: "0.5px solid #E24B4A", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
          >
            Remove from rotation
          </button>
        </div>
      )}

      {/* Remove from rotation confirmation */}
      {isReadOnly && confirmRemove && (
        <div style={{ border: "0.5px solid #E24B4A", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#791F1F", marginBottom: 6 }}>Remove from rotation?</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
            This will immediately remove <strong>{item.name}</strong> from the VisionEDGE playlist and set its status to Under Review. The allocation slot will be unfilled until new content is approved.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { onRemoveFromRotation(item.id); setActionDone("removed"); }}
              style={{ padding: "9px 18px", borderRadius: 8, background: "#791F1F", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
            >
              Confirm removal
            </button>
            <button onClick={() => setConfirmRemove(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Standard actions for non-live content */}
      {!isReadOnly && !rejecting && (
        <div style={{ display: "flex", gap: 12 }}>
          {canApprove && (
            <button onClick={() => { onApprove(item.id); setActionDone("approved"); }} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "#085041", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              {item.status === "rejected" ? "Approve (reverse rejection)" : "Approve"}
            </button>
          )}
          {canReject && (
            <button onClick={() => setRejecting(true)} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-primary)", color: "#791F1F", border: "0.5px solid #E24B4A", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              {item.status === "approved" ? "Revoke approval" : "Reject"}
            </button>
          )}
        </div>
      )}

      {!isReadOnly && rejecting && (
        <div style={{ border: "0.5px solid #E24B4A", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#791F1F", marginBottom: 8 }}>
            {item.status === "approved" ? "Reason for revoking approval" : "Rejection reason"}
          </div>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this content is being rejected..." rows={3} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={() => { if (rejectReason.trim()) { onReject(item.id, rejectReason); setActionDone("rejected"); } }} disabled={!rejectReason.trim()} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, background: rejectReason.trim() ? "#791F1F" : "var(--color-background-secondary)", color: rejectReason.trim() ? "#fff" : "var(--color-text-secondary)", border: "none", cursor: rejectReason.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 500 }}>Confirm</button>
            <button onClick={() => { setRejecting(false); setRejectReason(""); }} style={{ padding: "10px 16px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Operator Partner List ──

function PartnerModal({ initial = null, onSave, onClose, existingColors }) {
  const [name,     setName]     = useState(initial?.label ?? initial?.name ?? '');
  const [initials, setInitials] = useState(initial?.initials ?? '');
  const [pkg,      setPkg]      = useState(initial?.package ?? '');
  const [contact,  setContact]  = useState(initial?.contact ?? '');
  const [email,    setEmail]    = useState(initial?.email ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'contracted');
  const [colorIdx, setColorIdx] = useState(0);

  // Import AVATAR_COLORS inline to avoid circular dep issues with the import at top of file
  const AVATAR_COLORS = [
    { color: '#FAEEDA', text: '#854F0B' },
    { color: '#E6F1FB', text: '#0C447C' },
    { color: '#B5D4F4', text: '#185FA5' },
    { color: '#EEEDFE', text: '#3C3489' },
    { color: '#FCEBEB', text: '#791F1F' },
    { color: '#E1F5EE', text: '#085041' },
    { color: '#FFF3E0', text: '#8A5200' },
    { color: '#F5E6FB', text: '#6B2F8A' },
    { color: '#E8F5E9', text: '#1B5E20' },
    { color: '#FCE4EC', text: '#880E4F' },
    { color: '#E0F7FA', text: '#006064' },
    { color: '#FFF8E1', text: '#7B4B00' },
  ];

  // Auto-suggest initials from name
  const suggestInitials = (n) => {
    const words = n.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.map(w => w[0]).join('').slice(0, 3).toUpperCase();
  };

  const handleNameChange = (v) => {
    setName(v);
    if (!initials || initials === suggestInitials(name)) {
      setInitials(suggestInitials(v));
    }
  };

  const canSave = name.trim().length > 0;
  const chosenColor = AVATAR_COLORS[colorIdx];

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--color-border-primary)',
    fontSize: 13, fontFamily: 'inherit',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  };

  const sectionTitleStyle = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--color-text-tertiary)',
    marginBottom: 8, display: 'block',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: '92%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{initial ? 'Edit partner' : 'Add partner'}</div>
          <button style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onClose}>Close</button>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: chosenColor.color, color: chosenColor.text, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }}>
            {initials || '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{name || 'Partner name'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{pkg || 'Package'}</div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={sectionTitleStyle}>Partner name *</label>
          <input style={inputStyle} placeholder="e.g. Coopers Brewery" value={name} onChange={e => handleNameChange(e.target.value)} />
        </div>

        {/* Initials */}
        <div>
          <label style={sectionTitleStyle}>Initials <span style={{ fontWeight: 400, textTransform: 'none' }}>(shown in avatar)</span></label>
          <input style={{ ...inputStyle, width: 80 }} maxLength={3} placeholder="e.g. CB" value={initials} onChange={e => setInitials(e.target.value.toUpperCase())} />
        </div>

        {/* Avatar colour */}
        <div>
          <label style={sectionTitleStyle}>Avatar colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setColorIdx(i)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: c.color,
                  border: colorIdx === i ? `2.5px solid ${c.text}` : '1.5px solid rgba(0,0,0,.1)',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: c.text,
                }}
              >
                {colorIdx === i ? '✓' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Package */}
        <div>
          <label style={sectionTitleStyle}>Package / agreement</label>
          <input style={inputStyle} placeholder="e.g. Package 6, Naming Rights" value={pkg} onChange={e => setPkg(e.target.value)} />
        </div>

        {/* Category */}
        <div>
          <label style={sectionTitleStyle}>Partner category</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'contracted', label: 'Contracted' },
              { id: 'guest',      label: 'Guest / one-off' },
            ].map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: `1.5px solid ${category === opt.id ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: category === opt.id ? '#EEF2FF' : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                <input type="radio" name="category" value={opt.id} checked={category === opt.id} onChange={() => setCategory(opt.id)} style={{ margin: 0 }} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <label style={sectionTitleStyle}>Contact name</label>
          <input style={inputStyle} placeholder="e.g. Jane Smith" value={contact} onChange={e => setContact(e.target.value)} />
        </div>
        <div>
          <label style={sectionTitleStyle}>Contact email</label>
          <input type="email" style={inputStyle} placeholder="e.g. jane@partner.com.au" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: canSave ? 'pointer' : 'default', background: canSave ? '#1B2A4A' : 'var(--color-background-secondary)', color: canSave ? '#fff' : 'var(--color-text-tertiary)', opacity: canSave ? 1 : .5 }}
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave({
                id:             `partner_${Date.now()}`,
                name:           name.trim(),
                initials:       initials || suggestInitials(name),
                pkg:            pkg.trim() || 'Custom package',
                label:          name.trim(),
                contracted:     0,
                contractedSecs: 0,
                bonusSecs:      0,
                pieces:         1,
                color:          chosenColor.color,
                text:           chosenColor.text,
                textColor:      chosenColor.text,
                slots:          0,
                package:        pkg.trim() || 'Custom package',
                category,
                contactName:    contact.trim(),
                contactEmail:   email.trim(),
                guest:          category === 'guest',
              });
              onClose();
            }}
          >
            {initial ? 'Save changes' : 'Add partner'}
          </button>
          <button style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function OperatorPartners({ partners, content, onNavigate, onAddPartner }) {
  const [showAddPartner, setShowAddPartner] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>Partner management</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            {partners.length} partner{partners.length !== 1 ? 's' : ''} — manage accounts, packages, and content access.
          </p>
        </div>
        <button
          onClick={() => setShowAddPartner(true)}
          style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#1B2A4A', color: '#fff' }}
        >
          + Add partner
        </button>
      </div>

      {partners.map(p => {
        const pContent = content.filter(c => c.partnerId === p.id);
        const live     = pContent.filter(c => c.status === 'live').length;
        const approved = pContent.filter(c => c.status === 'approved').length;
        const pending  = pContent.filter(c => c.status === 'pending').length;
        const rejected = pContent.filter(c => c.status === 'rejected').length;

        return (
          <div
            key={p.id}
            onClick={() => onNavigate('o-partner-detail', p.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: p.color, color: p.text || p.textColor, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }}>
              {p.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {p.name || p.label}
                {p.guest && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#8A5200', fontWeight: 600 }}>Guest</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {p.pkg || p.package} — {p.slots || 0} slots/hr — {p.pieces} content piece{p.pieces !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {rejected > 0  && <span style={{ padding: '3px 10px', borderRadius: 8, background: '#FCEBEB', color: '#791F1F', fontSize: 11, fontWeight: 500 }}>{rejected} rejected</span>}
              {pending  > 0  && <span style={{ padding: '3px 10px', borderRadius: 8, background: '#E6F1FB', color: '#0C447C', fontSize: 11, fontWeight: 500 }}>{pending} pending</span>}
              {approved > 0  && <span style={{ padding: '3px 10px', borderRadius: 8, background: '#EAF3DE', color: '#27500A', fontSize: 11, fontWeight: 500 }}>{approved} approved</span>}
              {live     > 0  && <span style={{ padding: '3px 10px', borderRadius: 8, background: '#E1F5EE', color: '#085041', fontSize: 11, fontWeight: 500 }}>{live} live</span>}
              {pContent.length === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No content</span>}
            </div>
            <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>›</span>
          </div>
        );
      })}

      {partners.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>No partners yet</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Add your first partner to begin managing content.</div>
          <button onClick={() => setShowAddPartner(true)} style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#1B2A4A', color: '#fff' }}>Add first partner</button>
        </div>
      )}

      {showAddPartner && (
        <PartnerModal
          onSave={(p) => { onAddPartner(p); setShowAddPartner(false); }}
          onClose={() => setShowAddPartner(false)}
        />
      )}
    </div>
  );
}

// ── Operator Partner Detail (click-through from partner list) ──

export function OperatorPartnerDetail({ partnerId, partners, content, events = [], allocations = [], onAddAllocation, onNavigate }) {
  const [showAllocModal,  setShowAllocModal]  = useState(false);
  const [showEditPartner, setShowEditPartner] = useState(false);
  const [allocEventId,   setAllocEventId]   = useState('');
  const [allocLabel,     setAllocLabel]     = useState('');
  const [allocZones,     setAllocZones]     = useState([]);
  const [allocStates,    setAllocStates]    = useState([]);
  const [allocSlots,     setAllocSlots]     = useState(12);
  const [allocFormat,    setAllocFormat]    = useState('fullscreen');
  const [allocNotes,     setAllocNotes]     = useState('');

  const p = partners?.find(pt => pt.id === partnerId) ?? PARTNERS_DATA[partnerId];
  if (!p) return null;

  const allocEvent      = events.find(e => e.id === allocEventId) ?? null;
  const allocEventType  = EVENT_TYPES.find(et => et.id === allocEvent?.eventType);
  const allocAllStates  = allocEventType?.states ?? null;
  const allocHasStates  = allocAllStates !== null && allocAllStates.length > 0;

  const handleAllocSave = () => {
    if (!allocEventId || !allocLabel.trim() || allocZones.length === 0) return;
    if (allocHasStates && allocStates.length === 0) return;
    onAddAllocation({
      id:            `alloc-${Date.now()}`,
      eventId:       allocEventId,
      partnerId,
      label:         allocLabel.trim(),
      zones:         allocZones,
      states:        allocStates,
      slotCount:     Number(allocSlots),
      displayFormat: allocFormat,
      contentSpec:   CONTENT_SPECS_BY_FORMAT[allocFormat] ?? null,
      contentItemId: null,
      status:        'pending_content',
      notes:         allocNotes.trim(),
    });
    setShowAllocModal(false);
    setAllocLabel(''); setAllocZones([]); setAllocStates([]); setAllocSlots(12); setAllocNotes(''); setAllocEventId('');
  };

  const canSaveAlloc = allocEventId && allocLabel.trim() && allocZones.length > 0 && (allocHasStates ? allocStates.length > 0 : true) && allocSlots > 0;
  const pContent = content.filter(c => c.partnerId === partnerId);
  const live     = pContent.filter(c => c.status === 'live').length;
  const approved = pContent.filter(c => c.status === 'approved').length;
  const pending  = pContent.filter(c => c.status === 'pending').length;
  const rejected = pContent.filter(c => c.status === 'rejected').length;

  // CDP-037 — aggregate zone-level moment assignments for this partner across all events
  const partnerMoments = events.flatMap(evt => {
    const byType = {};
    (evt.moments ?? [])
      .filter(m => m.partnerId === partnerId)
      .forEach(m => {
        if (!byType[m.momentTypeId]) byType[m.momentTypeId] = { momentTypeId: m.momentTypeId, eventName: evt.name, eventDate: evt.date, packageLabel: m.packageLabel, zones: [], triggeredCount: 0, deliveredCount: 0 };
        byType[m.momentTypeId].zones.push(m.zoneId);
        byType[m.momentTypeId].triggeredCount += m.triggeredCount ?? 0;
        byType[m.momentTypeId].deliveredCount += m.deliveredCount ?? 0;
      });
    return Object.values(byType);
  });
  const totalTriggered = partnerMoments.reduce((s, m) => s + (m.triggeredCount ?? 0), 0);
  const totalDelivered = partnerMoments.reduce((s, m) => s + (m.deliveredCount ?? 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <button onClick={() => onNavigate('o-partners')} style={{ fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>← Back to partners</button>
        <button onClick={() => setShowEditPartner(true)} style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>✎ Edit partner</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: p.color, color: p.text || p.textColor, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }}>
          {p.initials}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)' }}>
            {p.name || p.label}
            {p.guest && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#FFF3E0', color: '#8A5200', fontWeight: 600 }}>Guest</span>}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{p.pkg || p.package}</p>
        </div>
        <button
          onClick={() => onNavigate('o-events')}
          style={{ padding: '8px 14px', borderRadius: 8, background: '#1B2A4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0 }}
          title="Go to Event Setup to create an allocation for this partner"
        >
          + Create allocation
        </button>
      </div>

      {/* Package / contact details */}
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Partner details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>Package: </span><span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.pkg || p.package}</span></div>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>Category: </span><span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.category || (p.guest ? 'Guest' : 'Contracted')}</span></div>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>Slots / hour: </span><span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.slots || p.contracted || 0}</span></div>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>Content pieces: </span><span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.pieces}</span></div>
          {p.contactName && <div><span style={{ color: 'var(--color-text-secondary)' }}>Contact: </span><span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.contactName}</span></div>}
          {p.contactEmail && <div><span style={{ color: 'var(--color-text-secondary)' }}>Email: </span><span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.contactEmail}</span></div>}
        </div>
      </div>

      {/* Content status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Live"     value={live} />
        <MetricCard label="Approved" value={approved} />
        <MetricCard label="Pending"  value={pending} />
        <MetricCard label="Rejected" value={rejected} />
      </div>

      {/* CDP-037 — Moments PoP summary */}
      {partnerMoments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px', color: 'var(--color-text-primary)' }}>
            Moments ({partnerMoments.length} package{partnerMoments.length !== 1 ? 's' : ''})
          </h3>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Total triggered: </span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{totalTriggered}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Total delivered: </span>
                <span style={{ fontWeight: 600, color: totalDelivered === totalTriggered ? '#166534' : '#92400E' }}>{totalDelivered}</span>
              </div>
            </div>
          </div>
          {partnerMoments.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', marginBottom: 8, border: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {m.packageLabel ?? m.momentTypeId}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {m.eventName} · {new Date(m.eventDate + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {m.zones.length} zone{m.zones.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.deliveredCount === m.triggeredCount && m.triggeredCount > 0 ? '#166534' : 'var(--color-text-secondary)', flexShrink: 0 }}>
                {m.triggeredCount > 0
                  ? `${m.deliveredCount}/${m.triggeredCount} delivered`
                  : 'No triggers yet'
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Allocations section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
            Allocations ({allocations.filter(a => a.partnerId === partnerId).length})
          </h3>
          {onAddAllocation && events.length > 0 && (
            <button
              onClick={() => setShowAllocModal(true)}
              style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: '#1B2A4A', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              + Add allocation
            </button>
          )}
        </div>
        {allocations.filter(a => a.partnerId === partnerId).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', borderRadius: 8, background: 'var(--color-background-secondary)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            No allocations yet. Add an allocation to open the upload portal for this partner.
          </div>
        ) : (
          events
            .filter(ev => allocations.some(a => a.partnerId === partnerId && a.eventId === ev.id))
            .map(ev => {
              const evAllocs = allocations.filter(a => a.partnerId === partnerId && a.eventId === ev.id);
              return (
                <div key={ev.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {ev.name} — {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {evAllocs.map(alloc => (
                    <div key={alloc.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>{alloc.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {alloc.displayFormat} · {alloc.slotCount} slots · {alloc.zones?.length ?? 0} zone{alloc.zones?.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: alloc.status === 'approved' || alloc.status === 'live' ? '#EAF3DE' : alloc.status === 'under_review' ? '#E6F1FB' : '#FFF3E0',
                          color:      alloc.status === 'approved' || alloc.status === 'live' ? '#27500A' : alloc.status === 'under_review' ? '#0C447C' : '#92400E',
                        }}>
                          {alloc.status === 'pending_content' ? 'Awaiting content' : alloc.status === 'under_review' ? 'In review' : alloc.status === 'approved' ? 'Approved' : 'Live'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
        )}
      </div>

      {/* Add allocation modal */}
      {showEditPartner && (
        <PartnerModal
          initial={p}
          existingColors={[]}
          onSave={(updated) => {
            // onEditPartner not yet wired — will be connected in CDP-044 persistence layer.
            // For now reflect change locally via onAddPartner pattern if available.
            setShowEditPartner(false);
          }}
          onClose={() => setShowEditPartner(false)}
        />
      )}

      {showAllocModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setShowAllocModal(false)}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: '92%', maxWidth: 500, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Add allocation — {p.name || p.label}</div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Event</label>
              <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-primary)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }}
                value={allocEventId} onChange={e => { setAllocEventId(e.target.value); setAllocStates([]); }}>
                <option value="">Select event…</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} — {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Allocation label</label>
              <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-primary)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder={`e.g. ${p.label || p.name} — Full-screen breaks`} value={allocLabel} onChange={e => setAllocLabel(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Zones ({allocZones.length} selected)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ZONES.map(z => (
                  <label key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${allocZones.includes(z.id) ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: allocZones.includes(z.id) ? '#EEF2FF' : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                    <input type="checkbox" checked={allocZones.includes(z.id)} onChange={() => setAllocZones(prev => prev.includes(z.id) ? prev.filter(x => x !== z.id) : [...prev, z.id])} style={{ margin: 0 }} />
                    {z.label}
                  </label>
                ))}
              </div>
            </div>

            {allocHasStates && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>States of play ({allocStates.length} selected)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {allocAllStates.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${allocStates.includes(s.id) ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: allocStates.includes(s.id) ? '#EEF2FF' : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      <input type="checkbox" checked={allocStates.includes(s.id)} onChange={() => setAllocStates(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} style={{ margin: 0 }} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {allocEventId && !allocHasStates && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#F3F4F6', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                States of play are not applicable for this event type — the allocation runs as a continuous rotation.
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Contracted slots</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" min={1} max={200} style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-primary)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }}
                  value={allocSlots} onChange={e => setAllocSlots(e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>× 30s = {allocSlots * 30}s airtime per zone</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Notes for partner (optional)</label>
              <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-primary)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="e.g. Keep content left of 1440px for L-wrap" value={allocNotes} onChange={e => setAllocNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleAllocSave} disabled={!canSaveAlloc}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: canSaveAlloc ? '#1B2A4A' : 'var(--color-background-secondary)', color: canSaveAlloc ? '#fff' : 'var(--color-text-tertiary)', border: 'none', cursor: canSaveAlloc ? 'pointer' : 'default', fontSize: 14, fontWeight: 500 }}>
                Save allocation
              </button>
              <button onClick={() => setShowAllocModal(false)}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-secondary)', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content list */}
      <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px', color: 'var(--color-text-primary)' }}>All content ({pContent.length})</h3>
      {pContent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)', fontSize: 14 }}>No content submitted by this partner yet.</div>
      ) : pContent.map(item => (
        <ContentRow key={item.id} item={item} onClick={() => onNavigate('o-review-detail', item.id)} />
      ))}
    </div>
  );
}

// ── OperatorRules ─────────────────────────────────────────────────────────
// CDP-010 — Rules Management screen.
// Operators create, edit, and delete competitive separation rules.
// Rules are passed down from App state and persist for the session.

const CATEGORIES = ['competitive', 'editorial', 'brand'];
const SCOPES     = ['all'];  // Phase 2: per zone/state scope

function RuleForm({ partners, initial, onSave, onCancel }) {
  const [partnerA,    setPartnerA]    = useState(initial?.partnerA    ?? '');
  const [partnerB,    setPartnerB]    = useState(initial?.partnerB    ?? '');
  const [minGapSlots, setMinGapSlots] = useState(initial?.minGapSlots ?? 10);
  const [category,    setCategory]    = useState(initial?.category    ?? 'competitive');
  const [scope,       setScope]       = useState(initial?.scope       ?? 'all');

  const minGapMins = Math.round((minGapSlots * 30) / 60 * 10) / 10;
  const labelA     = partners.find(p => p.id === partnerA)?.label ?? '';
  const labelB     = partners.find(p => p.id === partnerB)?.label ?? '';
  const label      = partnerA && partnerB
    ? `${labelA} / ${labelB} — minimum ${minGapMins} min separation (${minGapSlots} × 30s slots)`
    : '';

  const valid = partnerA && partnerB && partnerA !== partnerB && minGapSlots >= 1;

  const S = {
    field:  { marginBottom: 14 },
    label:  { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', marginBottom: 4, display: 'block' },
    select: { width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border-primary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' },
    input:  { width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border-primary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' },
    row:    { display: 'flex', gap: 8, alignItems: 'center' },
    btn:    (v) => ({ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: v === 'primary' ? '#1B2A4A' : 'var(--color-background-secondary)', color: v === 'primary' ? '#fff' : 'var(--color-text-secondary)' }),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={S.field}>
        <label style={S.label}>Partner A</label>
        <select style={S.select} value={partnerA} onChange={e => setPartnerA(e.target.value)}>
          <option value="">— Select partner</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.label}{p.placeholder ? ' (placeholder)' : ''}</option>)}
        </select>
      </div>
      <div style={S.field}>
        <label style={S.label}>Partner B</label>
        <select style={S.select} value={partnerB} onChange={e => setPartnerB(e.target.value)}>
          <option value="">— Select partner</option>
          {partners.filter(p => p.id !== partnerA).map(p => <option key={p.id} value={p.id}>{p.label}{p.placeholder ? ' (placeholder)' : ''}</option>)}
        </select>
      </div>
      <div style={S.field}>
        <label style={S.label}>Minimum gap — slots (1 slot = 30s)</label>
        <div style={S.row}>
          <input type="number" min={1} max={120} style={{ ...S.input, width: 80 }}
            value={minGapSlots} onChange={e => setMinGapSlots(Math.max(1, parseInt(e.target.value) || 1))} />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>= {minGapMins} min separation</span>
        </div>
      </div>
      <div style={S.field}>
        <label style={S.label}>Category</label>
        <select style={S.select} value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={S.field}>
        <label style={S.label}>Scope</label>
        <select style={S.select} value={scope} onChange={e => setScope(e.target.value)}>
          <option value="all">All zones and states</option>
        </select>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Per-zone/state scope available in Phase 2.</div>
      </div>
      {label && (
        <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', marginBottom: 12 }}>
          Rule label: <strong>{label}</strong>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={S.btn('primary')} disabled={!valid}
          onClick={() => valid && onSave({ partnerA, partnerB, minGapSlots, category, scope, label })}>
          {initial ? 'Save changes' : 'Add rule'}
        </button>
        <button style={S.btn('ghost')} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function OperatorRules({ rules, partners, onAddRule, onUpdateRule, onDeleteRule }) 
{
  const [showAdd,  setShowAdd]  = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const partnerMap = Object.fromEntries(partners.map(p => [p.id, p]));
  const minGapMins = (slots) => Math.round((slots * 30) / 60 * 10) / 10;

  const catColor = (cat) => ({
    competitive: { bg: '#FEF3C7', color: '#92400E' },
    editorial:   { bg: '#EEF2FF', color: '#3730A3' },
    brand:       { bg: '#F0FDF4', color: '#166534' },
  }[cat] ?? { bg: '#F3F4F6', color: '#6B7280' });

  const S = {
    card:   { background: 'var(--color-background-secondary)', borderRadius: 8, padding: 14, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 10 },
    title:  { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 },
    sub:    { fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 },
    row:    { display: 'flex', alignItems: 'center', gap: 8 },
    badge:  (c) => ({ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: c.bg, color: c.color }),
    avatar: (p) => ({ width: 22, height: 22, borderRadius: 4, background: p?.color ?? '#eee', color: p?.text ?? '#333', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,0,0,.08)' }),
    btn:    (v) => ({ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', background: v === 'primary' ? '#1B2A4A' : v === 'danger' ? '#DC2626' : 'var(--color-background-secondary)', color: v === 'ghost' ? 'var(--color-text-secondary)' : '#fff' }),
    formWrap: { background: 'var(--color-background-secondary)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border-primary)', marginBottom: 16 },
    modal:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalBox: { background: 'var(--color-background-primary)', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 },
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', fontSize: 14, color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Separation Rules</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Define minimum gap constraints between competing partners in the same playlist. Violations are hard errors — the matrix will not validate and operators cannot push until resolved.
          </div>
        </div>
        {!showAdd && (
          <button style={{ ...S.btn('primary'), whiteSpace: 'nowrap', marginLeft: 16 }} onClick={() => setShowAdd(true)}>
            + Add rule
          </button>
        )}
      </div>

      {/* Placeholder notice */}
      {partners.some(p => p.placeholder) && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, background: '#FEF9C3', border: '1px solid #FDE68A', color: '#92400E', marginBottom: 16 }}>
        </div>
      )}

      {/* Add rule form */}
      {showAdd && (
        <div style={S.formWrap}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>New separation rule</div>
          <RuleForm
            partners={partners}
            onSave={(rule) => { onAddRule(rule); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Edit rule form */}
      {editId !== null && (
        <div style={S.formWrap}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Edit rule</div>
          <RuleForm
            partners={partners}
            initial={rules.find(r => r.id === editId)}
            onSave={(updated) => { onUpdateRule({ ...rules.find(r => r.id === editId), ...updated }); setEditId(null); }}
            onCancel={() => setEditId(null)}
          />
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 32, color: 'var(--color-text-tertiary)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚖</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>No separation rules configured</div>
          <div style={{ fontSize: 11 }}>Add a rule to enforce minimum gaps between competing partners in the playlist.</div>
        </div>
      ) : (
        rules.map(rule => {
          const pA = partnerMap[rule.partnerA];
          const pB = partnerMap[rule.partnerB];
          const cat = catColor(rule.category);
          const isEditing = editId === rule.id;
          return (
            <div key={rule.id} style={{ ...S.card, borderColor: isEditing ? '#1B2A4A' : 'var(--color-border-tertiary)' }}>
              <div style={S.row}>
                <span style={S.badge(cat)}>{rule.category}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{rule.label}</span>
              </div>
              <div style={{ ...S.row, marginTop: 10, marginBottom: 8 }}>
                {/* Partner A */}
                <div style={S.avatar(pA)}>{pA?.initials ?? '?'}</div>
                <span style={{ fontSize: 12 }}>{pA?.label ?? rule.partnerA}{pA?.placeholder ? <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>(placeholder)</span> : null}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 4px' }}>and</span>
                <div style={S.avatar(pB)}>{pB?.initials ?? '?'}</div>
                <span style={{ fontSize: 12 }}>{pB?.label ?? rule.partnerB}{pB?.placeholder ? <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>(placeholder)</span> : null}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
                Minimum gap: <strong>{rule.minGapSlots} slots</strong> ({minGapMins(rule.minGapSlots)} min at 30s/slot) · Scope: {rule.scope === 'all' ? 'All zones and states' : rule.scope}
              </div>
              <div style={S.row}>
                <button style={S.btn('ghost')} onClick={() => setEditId(isEditing ? null : rule.id)}>
                  {isEditing ? 'Cancel edit' : 'Edit'}
                </button>
                <button style={S.btn('danger')} onClick={() => setDeleteId(rule.id)}>Delete</button>
              </div>
            </div>
          );
        })
      )}

      {/* Delete confirmation modal */}
      {deleteId !== null && (() => {
        const rule = rules.find(r => r.id === deleteId);
        return (
          <div style={S.modal} onClick={() => setDeleteId(null)}>
            <div style={S.modalBox} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Delete rule?</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                "{rule?.label}" will be permanently removed. The allocation builder will no longer enforce this separation constraint.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.btn('danger')} onClick={() => { onDeleteRule(deleteId); setDeleteId(null); }}>Delete rule</button>
                <button style={S.btn('ghost')} onClick={() => setDeleteId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CDP-035 — Campaign Management
// ─────────────────────────────────────────────────────────────────────────────

const CS = {
  card: {
    background: 'var(--color-background-secondary)',
    borderRadius: 10, padding: 16,
    border: '0.5px solid var(--color-border-tertiary)',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--color-text-tertiary)',
    marginBottom: 10,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--color-border-primary)',
    fontSize: 13, fontFamily: 'inherit',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  },
  btn: (variant = 'primary', small = false) => ({
    fontSize: small ? 12 : 13, fontWeight: 600,
    padding: small ? '5px 12px' : '9px 18px',
    borderRadius: 7, border: 'none', cursor: 'pointer',
    background:
      variant === 'primary' ? '#1B2A4A'
      : variant === 'danger'  ? '#DC2626'
      : variant === 'success' ? '#166534'
      : 'var(--color-background-secondary)',
    color: variant === 'ghost' ? 'var(--color-text-secondary)' : '#fff',
  }),
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modalBox: {
    background: 'var(--color-background-primary)', borderRadius: 12, padding: 24,
    width: '92%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16,
    maxHeight: '90vh', overflowY: 'auto',
  },
};

function CampaignStatusPill({ status }) {
  const s = CAMPAIGN_STATUSES.find(cs => cs.id === status) ?? { color: '#F3F4F6', text: '#6B7280', label: status };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: s.color, color: s.text }}>
      {s.label}
    </span>
  );
}

function EntitlementBadge({ rule }) {
  const et = ENTITLEMENT_TYPES.find(e => e.id === rule.entitlementType);
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#EEF2FF', color: '#3730A3' }}>
      {rule.value}{et?.unit ?? ''} {rule.entitlementType === 'percentage' ? 'of slots' : rule.entitlementType === 'seconds' ? '/hr' : 'slots'}
      {rule.bonusPct > 0 && <span style={{ marginLeft: 4, color: '#166534' }}>+{rule.bonusPct}% bonus</span>}
    </span>
  );
}

// ── New Campaign Form ────────────────────────────────────────────────────────

function NewCampaignForm({ partners, onSave, onClose }) {
  const [name,      setName]      = useState('');
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [status,    setStatus]    = useState('draft');
  const [notes,     setNotes]     = useState('');

  const canSave = name.trim() && partnerId && startDate && endDate;

  return (
    <div style={CS.modal} onClick={onClose}>
      <div style={CS.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Create campaign</div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Campaign name</label>
          <input style={CS.input} placeholder="e.g. McDonald's AFL Season 2026" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Partner</label>
          <select style={{ ...CS.input, appearance: 'auto' }} value={partnerId} onChange={e => setPartnerId(e.target.value)}>
            {partners.filter(p => !p.guest).map(p => (
              <option key={p.id} value={p.id}>{p.label || p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...CS.sectionTitle, display: 'block' }}>Start date</label>
            <input type="date" style={CS.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...CS.sectionTitle, display: 'block' }}>End date</label>
            <input type="date" style={CS.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Status</label>
          <select style={{ ...CS.input, appearance: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
            {CAMPAIGN_STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Notes</label>
          <textarea style={{ ...CS.input, resize: 'vertical', minHeight: 60 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Commercial context, package details, special conditions..." />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...CS.btn('primary'), flex: 1, opacity: canSave ? 1 : .4 }}
            disabled={!canSave}
            onClick={() => { onSave({ name: name.trim(), partnerId, startDate, endDate, status, notes: notes.trim(), eventIds: [], rules: [], contentPool: [] }); onClose(); }}
          >
            Create campaign
          </button>
          <button style={CS.btn('ghost')} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── New Rule Form ────────────────────────────────────────────────────────────

function RuleFormModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [eventTypeId,     setEventTypeId]     = useState(initial?.eventTypeId     ?? 'afl');
  const [zoneId,          setZoneId]          = useState(initial?.zoneId          ?? '');
  const [entitlementType, setEntitlementType] = useState(initial?.entitlementType ?? 'percentage');
  const [value,           setValue]           = useState(initial?.value           ?? '');
  const [bonusPct,        setBonusPct]        = useState(initial?.bonusPct        ?? 0);
  const [notes,           setNotes]           = useState(initial?.notes           ?? '');

  const canSave = value !== '' && Number(value) > 0;
  const et = ENTITLEMENT_TYPES.find(e => e.id === entitlementType);

  return (
    <div style={CS.modal} onClick={onClose}>
      <div style={CS.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{isEdit ? 'Edit entitlement rule' : 'Add entitlement rule'}</div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Event type</label>
          <select style={{ ...CS.input, appearance: 'auto' }} value={eventTypeId} onChange={e => setEventTypeId(e.target.value)}>
            {EVENT_TYPES.filter(e => e.status === 'active').map(e => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Zone <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(leave blank for all zones)</span></label>
          <select style={{ ...CS.input, appearance: 'auto' }} value={zoneId} onChange={e => setZoneId(e.target.value)}>
            <option value="">All zones</option>
            {ZONES.map(z => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Entitlement type</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ENTITLEMENT_TYPES.map(e => (
              <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: `1.5px solid ${entitlementType === e.id ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: entitlementType === e.id ? '#EEF2FF' : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                <input type="radio" name="entType" value={e.id} checked={entitlementType === e.id} onChange={() => setEntitlementType(e.id)} style={{ margin: 0 }} />
                {e.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...CS.sectionTitle, display: 'block' }}>
              Value ({et?.unit ?? ''})
              {entitlementType === 'seconds' && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}> — per hour</span>}
            </label>
            <input type="number" min={1} style={CS.input} value={value} onChange={e => setValue(e.target.value)} placeholder={entitlementType === 'percentage' ? '10' : entitlementType === 'seconds' ? '360' : '12'} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...CS.sectionTitle, display: 'block' }}>Bonus % <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(above entitlement)</span></label>
            <input type="number" min={0} max={50} style={CS.input} value={bonusPct} onChange={e => setBonusPct(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div>
          <label style={{ ...CS.sectionTitle, display: 'block' }}>Notes</label>
          <input style={CS.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Concourse — peak commercial zone" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...CS.btn('primary'), flex: 1, opacity: canSave ? 1 : .4 }}
            disabled={!canSave}
            onClick={() => {
              onSave({ ...(initial ?? {}), eventTypeId, zoneId: zoneId || null, entitlementType, value: Number(value), bonusPct, notes: notes.trim() });
              onClose();
            }}
          >
            {isEdit ? 'Save changes' : 'Add rule'}
          </button>
          <button style={CS.btn('ghost')} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Detail ──────────────────────────────────────────────────────────

function CampaignDetail({ campaign, partners, events, content = [], onBack, onUpdateCampaign, onAddRule, onUpdateRule, onDeleteRule, onAttachEvent, onDetachEvent, onUpdateCampaignPool }) {
  const [activeTab,     setActiveTab]     = useState('rules');
  const [showRuleForm,  setShowRuleForm]  = useState(false);
  const [editRule,      setEditRule]      = useState(null);   // rule being edited
  const [deleteRuleId,  setDeleteRuleId]  = useState(null);
  const [showEditCamp,  setShowEditCamp]  = useState(false);  // edit campaign header
  const [showPoolForm,  setShowPoolForm]  = useState(false);  // add pool piece
  const [editPoolPiece, setEditPoolPiece] = useState(null);   // pool piece being edited
  const [linkPickId,    setLinkPickId]    = useState(null);   // pool piece id awaiting link selection

  // Campaign edit form state
  const [editName,      setEditName]      = useState(campaign.name);
  const [editStatus,    setEditStatus]    = useState(campaign.status);
  const [editStart,     setEditStart]     = useState(campaign.startDate ?? '');
  const [editEnd,       setEditEnd]       = useState(campaign.endDate   ?? '');
  const [editNotes,     setEditNotes]     = useState(campaign.notes     ?? '');

  // Pool piece form state
  const [poolLabel,     setPoolLabel]     = useState('');
  const [poolFormat,    setPoolFormat]    = useState('fullscreen');
  const [poolFrom,      setPoolFrom]      = useState(campaign.startDate ?? '');
  const [poolTo,        setPoolTo]        = useState(campaign.endDate   ?? '');

  const partner     = partners.find(p => p.id === campaign.partnerId);
  const attachedEvt = events.filter(e => campaign.eventIds?.includes(e.id));
  const unattached  = events.filter(e => !campaign.eventIds?.includes(e.id));

  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const totalRules   = campaign.rules?.length ?? 0;
  const totalContent = campaign.contentPool?.length ?? 0;
  const totalEvents  = attachedEvt.length;

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Back to campaigns
      </button>

      {/* Header */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
        {partner && (
          <div style={{ width: 48, height: 48, borderRadius: 10, background: partner.color, color: partner.text || partner.textColor, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {partner.initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>{campaign.name}</h2>
            <CampaignStatusPill status={campaign.status} />
            <button
              onClick={() => { setEditName(campaign.name); setEditStatus(campaign.status); setEditStart(campaign.startDate ?? ''); setEditEnd(campaign.endDate ?? ''); setEditNotes(campaign.notes ?? ''); setShowEditCamp(true); }}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 500 }}
            >
              ✎ Edit campaign
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {partner?.label || partner?.name} · {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
          </div>
          {campaign.notes && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{campaign.notes}</div>}
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Entitlement rules', value: totalRules },
          { label: 'Content pieces',    value: totalContent },
          { label: 'Events attached',   value: totalEvents },
        ].map(m => (
          <div key={m.label} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--color-background-secondary)', borderRadius: 8, padding: 4 }}>
        {[
          { id: 'rules',   label: `Entitlement rules (${totalRules})` },
          { id: 'content', label: `Content pool (${totalContent})` },
          { id: 'events',  label: `Events (${totalEvents})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
              background: activeTab === tab.id ? 'var(--color-background-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* RULES TAB */}
      {activeTab === 'rules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={CS.sectionTitle}>Entitlement rules — {partner?.label || partner?.name}</div>
            <button style={CS.btn('primary', true)} onClick={() => setShowRuleForm(true)}>+ Add rule</button>
          </div>

          {/* Rules info banner */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 16, fontSize: 12, color: '#3730A3' }}>
            Rules define the partner's entitlement per event type and zone. The allocation builder uses these rules when this campaign is attached to an event.
            Zone-specific rules take priority over "all zones" rules for the same event type.
          </div>

          {(campaign.rules ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              No rules yet. Add an entitlement rule to define the partner's allocation per event type and zone.
            </div>
          ) : (
            (campaign.rules ?? []).map(rule => {
              const evType = EVENT_TYPES.find(e => e.id === rule.eventTypeId);
              const zone   = ZONES.find(z => z.id === rule.zoneId);
              // Show which attached events this rule applies to
              const ruleEvents = attachedEvt.filter(e => e.eventType === rule.eventTypeId);
              return (
                <div key={rule.id} style={{ ...CS.card, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {evType?.label ?? rule.eventTypeId}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)' }}>
                        {zone?.label ?? 'All zones'}
                      </span>
                      <EntitlementBadge rule={rule} />
                    </div>
                    {rule.notes && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>{rule.notes}</div>}
                    {ruleEvents.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ruleEvents.map(ev => (
                          <span key={ev.id} style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: '#EEF2FF', color: '#3730A3' }}>
                            {ev.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {ruleEvents.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>No {evType?.label ?? rule.eventTypeId} events attached to this campaign yet</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setEditRule(rule)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', cursor: 'pointer', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteRuleId(rule.id)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CONTENT POOL TAB */}
      {activeTab === 'content' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={CS.sectionTitle}>Content pool</div>
            <button style={CS.btn('primary', true)} onClick={() => { setPoolLabel(''); setPoolFormat('fullscreen'); setPoolFrom(campaign.startDate ?? ''); setPoolTo(campaign.endDate ?? ''); setShowPoolForm(true); }}>
              + Add piece
            </button>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 16, fontSize: 12, color: '#3730A3' }}>
            The content pool defines the creative assets available for this campaign. Each piece must be uploaded by the partner and approved before it goes live. Once linked to an approved upload, a piece cannot have its format changed.
          </div>

          {(campaign.contentPool ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', borderRadius: 10, background: 'var(--color-background-secondary)', border: '0.5px dashed var(--color-border-secondary)', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              No content pieces in the pool yet. Add a piece to start the upload brief for this partner.
            </div>
          ) : (
            (campaign.contentPool ?? []).map(piece => {
              const isLinked = !!piece.contentId;
              const linkedItem = isLinked ? content.find(c => c.id === piece.contentId) : null;
              // Approved partner content that matches format and isn't already linked to another piece
              const linkableContent = content.filter(c =>
                c.partnerId === campaign.partnerId &&
                c.status === 'approved' &&
                c.format === piece.format &&
                !(campaign.contentPool ?? []).some(p => p.contentId === c.id && p.id !== piece.id)
              );
              return (
                <div key={piece.id} style={{ ...CS.card, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: isLinked ? '#DCFCE7' : 'var(--color-background-secondary)', border: `0.5px solid ${isLinked ? '#86EFAC' : 'var(--color-border-secondary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {isLinked ? '✅' : '🎬'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{piece.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: isLinked ? 4 : 0 }}>
                        {piece.format?.toUpperCase()} · Active {piece.activeFrom} → {piece.activeTo}
                      </div>
                      {linkedItem && (
                        <div style={{ fontSize: 11, color: '#166534', fontWeight: 500 }}>
                          Linked to: {linkedItem.name || linkedItem.label || `Upload #${linkedItem.id}`}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: isLinked ? '#DCFCE7' : '#FFF3E0', color: isLinked ? '#166534' : '#92400E', fontWeight: 600 }}>
                        {isLinked ? 'Linked' : 'Pending upload'}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Edit — label and dates always editable; format locked when linked */}
                        <button
                          onClick={() => setEditPoolPiece(piece)}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        {/* Link — only for pending pieces that have approved uploads available */}
                        {!isLinked && linkableContent.length > 0 && (
                          <button
                            onClick={() => setLinkPickId(piece.id)}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#DCFCE7', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Link upload
                          </button>
                        )}
                        {/* Unlink — only for linked pieces */}
                        {isLinked && (
                          <button
                            onClick={() => {
                              const updated = (campaign.contentPool ?? []).map(p => p.id === piece.id ? { ...p, contentId: null } : p);
                              onUpdateCampaignPool(campaign.id, updated);
                            }}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Unlink
                          </button>
                        )}
                        {/* Delete — only for unlinked pieces */}
                        {!isLinked && (
                          <button
                            onClick={() => {
                              const updated = (campaign.contentPool ?? []).filter(p => p.id !== piece.id);
                              onUpdateCampaignPool(campaign.id, updated);
                            }}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Link picker — inline dropdown of eligible approved uploads */}
                  {linkPickId === piece.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#F8FAFC', border: '0.5px solid var(--color-border-secondary)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Select approved upload to link:</div>
                      {linkableContent.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                          <span style={{ fontSize: 12 }}>{c.name || c.label || `Upload #${c.id}`}</span>
                          <button
                            onClick={() => {
                              const updated = (campaign.contentPool ?? []).map(p => p.id === piece.id ? { ...p, contentId: c.id } : p);
                              onUpdateCampaignPool(campaign.id, updated);
                              setLinkPickId(null);
                            }}
                            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: 'none', background: '#1B2A4A', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
                          >
                            Link
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setLinkPickId(null)} style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <div>
          <div style={CS.sectionTitle}>Attached events</div>

          {attachedEvt.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-tertiary)', fontSize: 14, marginBottom: 12 }}>
              No events attached yet.
            </div>
          ) : (() => {
            const coveredTypes = new Set((campaign.rules ?? []).map(r => r.eventTypeId));
            return attachedEvt.map(evt => {
              const et = EVENT_TYPES.find(t => t.id === evt.eventType);
              const hasRule = coveredTypes.has(evt.eventType);
              return (
                <div key={evt.id} style={{ ...CS.card, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{evt.name}</span>
                        {!hasRule && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#FEF9C3', color: '#854D0E' }}>⚠ No rule</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        {new Date(evt.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {et?.label ?? evt.eventType}
                      </div>
                    </div>
                    <button
                      onClick={() => onDetachEvent(campaign.id, evt.id)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontWeight: 600, flexShrink: 0 }}
                    >
                      Detach
                    </button>
                  </div>
                  {!hasRule && (
                    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 6, background: '#FEF9C3', border: '0.5px solid #FDE047', fontSize: 11, color: '#854D0E' }}>
                      This campaign has no rule covering {et?.label ?? evt.eventType} events. Add a rule in the Rules tab to define entitlement terms for this event.
                    </div>
                  )}
                </div>
              );
            });
          })()}

          {/* Rule-filtered attach list */}
          {(() => {
            const coveredTypes  = new Set((campaign.rules ?? []).map(r => r.eventTypeId));
            const hasRules      = coveredTypes.size > 0;
            const eligible      = unattached.filter(e => coveredTypes.has(e.eventType));

            if (!hasRules) {
              return (
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: '#FEF9C3', border: '0.5px solid #FDE047', fontSize: 12, color: '#854D0E' }}>
                  ⚠ Add at least one rule to this campaign before attaching events. Rules define the event type — only events of a matching type can be attached.
                </div>
              );
            }

            return (
              <>
                <div style={{ ...CS.sectionTitle, marginTop: 16 }}>
                  Attach an event
                  <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, marginLeft: 8, color: 'var(--color-text-tertiary)' }}>
                    (showing {[...coveredTypes].map(id => EVENT_TYPES.find(t => t.id === id)?.label ?? id).join(', ')} events only — matches your rules)
                  </span>
                </div>
                {eligible.length === 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    No unattached events match the event types in your rules. Create events in Event Setup first.
                  </div>
                ) : eligible.map(evt => {
                  const et = EVENT_TYPES.find(t => t.id === evt.eventType);
                  return (
                    <div key={evt.id} style={{ ...CS.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{evt.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {new Date(evt.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {et?.label ?? evt.eventType}
                        </div>
                      </div>
                      <button
                        onClick={() => onAttachEvent(campaign.id, evt.id)}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#DCFCE7', color: '#166534', fontWeight: 600, flexShrink: 0 }}
                      >
                        Attach
                      </button>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}

      {/* Add rule modal */}
      {showRuleForm && (
        <RuleFormModal
          onSave={(rule) => { onAddRule(campaign.id, rule); setShowRuleForm(false); }}
          onClose={() => setShowRuleForm(false)}
        />
      )}

      {/* Edit rule modal */}
      {editRule && (
        <RuleFormModal
          initial={editRule}
          onSave={(rule) => { onUpdateRule(campaign.id, rule); setEditRule(null); }}
          onClose={() => setEditRule(null)}
        />
      )}

      {/* Delete rule confirm */}
      {deleteRuleId && (
        <div style={CS.modal} onClick={() => setDeleteRuleId(null)}>
          <div style={{ ...CS.modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Remove rule?</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              This entitlement rule will be removed from the campaign. Events already pushed to the media player are not affected.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={CS.btn('danger')} onClick={() => { onDeleteRule(campaign.id, deleteRuleId); setDeleteRuleId(null); }}>Remove rule</button>
              <button style={CS.btn('ghost')} onClick={() => setDeleteRuleId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit campaign modal */}
      {showEditCamp && (
        <div style={CS.modal} onClick={() => setShowEditCamp(false)}>
          <div style={CS.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Edit campaign</div>
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Campaign name</label>
              <input style={CS.input} value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Status</label>
              <select style={{ ...CS.input, appearance: 'auto' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                {['draft', 'active', 'paused', 'completed'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...CS.sectionTitle, display: 'block' }}>Start date</label>
                <input type="date" style={{ ...CS.input, width: 'auto' }} value={editStart} onChange={e => setEditStart(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...CS.sectionTitle, display: 'block' }}>End date</label>
                <input type="date" style={{ ...CS.input, width: 'auto' }} value={editEnd} onChange={e => setEditEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Notes</label>
              <input style={CS.input} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Optional campaign notes" />
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFFBEB', border: '0.5px solid #FCD34D', fontSize: 12, color: '#92400E' }}>
              Changing dates does not affect content that is already live. Content pool pieces have their own active date ranges.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...CS.btn('primary'), flex: 1 }}
                disabled={!editName.trim()}
                onClick={() => {
                  onUpdateCampaign({ ...campaign, name: editName.trim(), status: editStatus, startDate: editStart, endDate: editEnd, notes: editNotes.trim() });
                  setShowEditCamp(false);
                }}
              >
                Save changes
              </button>
              <button style={CS.btn('ghost')} onClick={() => setShowEditCamp(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add pool piece modal */}
      {showPoolForm && (
        <div style={CS.modal} onClick={() => setShowPoolForm(false)}>
          <div style={CS.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Add content piece</div>
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#EEF2FF', fontSize: 12, color: '#3730A3' }}>
              Define the creative brief for this piece. The partner will see it as a pending upload in their portal.
            </div>
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Label</label>
              <input style={CS.input} placeholder="e.g. Summer Creative — Fullscreen" value={poolLabel} onChange={e => setPoolLabel(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Format</label>
              <select style={{ ...CS.input, appearance: 'auto' }} value={poolFormat} onChange={e => setPoolFormat(e.target.value)}>
                {['fullscreen', 'lwrap', 'ribbon', 'corner'].map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...CS.sectionTitle, display: 'block' }}>Active from</label>
                <input type="date" style={{ ...CS.input, width: 'auto' }} value={poolFrom} onChange={e => setPoolFrom(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...CS.sectionTitle, display: 'block' }}>Active to</label>
                <input type="date" style={{ ...CS.input, width: 'auto' }} value={poolTo} onChange={e => setPoolTo(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...CS.btn('primary'), flex: 1, opacity: poolLabel.trim() ? 1 : 0.4 }}
                disabled={!poolLabel.trim()}
                onClick={() => {
                  const newPiece = { id: `cp-${Date.now()}`, label: poolLabel.trim(), format: poolFormat, activeFrom: poolFrom, activeTo: poolTo, contentId: null };
                  onUpdateCampaignPool(campaign.id, [...(campaign.contentPool ?? []), newPiece]);
                  setShowPoolForm(false);
                }}
              >
                Add piece
              </button>
              <button style={CS.btn('ghost')} onClick={() => setShowPoolForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit pool piece modal — format locked when linked */}
      {editPoolPiece && (
        <div style={CS.modal} onClick={() => setEditPoolPiece(null)}>
          <div style={CS.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Edit content piece</div>
            {editPoolPiece.contentId && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFFBEB', border: '0.5px solid #FCD34D', fontSize: 12, color: '#92400E' }}>
                This piece is linked to an approved upload. Format cannot be changed.
              </div>
            )}
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Label</label>
              <input style={CS.input} value={editPoolPiece.label}
                onChange={e => setEditPoolPiece(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label style={{ ...CS.sectionTitle, display: 'block' }}>Format</label>
              {editPoolPiece.contentId ? (
                <div style={{ ...CS.input, background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', cursor: 'default' }}>
                  {editPoolPiece.format} (locked)
                </div>
              ) : (
                <select style={{ ...CS.input, appearance: 'auto' }} value={editPoolPiece.format}
                  onChange={e => setEditPoolPiece(p => ({ ...p, format: e.target.value }))}>
                  {['fullscreen', 'lwrap', 'ribbon', 'corner'].map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...CS.sectionTitle, display: 'block' }}>Active from</label>
                <input type="date" style={{ ...CS.input, width: 'auto' }} value={editPoolPiece.activeFrom}
                  onChange={e => setEditPoolPiece(p => ({ ...p, activeFrom: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...CS.sectionTitle, display: 'block' }}>Active to</label>
                <input type="date" style={{ ...CS.input, width: 'auto' }} value={editPoolPiece.activeTo}
                  onChange={e => setEditPoolPiece(p => ({ ...p, activeTo: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...CS.btn('primary'), flex: 1, opacity: editPoolPiece.label.trim() ? 1 : 0.4 }}
                disabled={!editPoolPiece.label.trim()}
                onClick={() => {
                  const updated = (campaign.contentPool ?? []).map(p => p.id === editPoolPiece.id ? editPoolPiece : p);
                  onUpdateCampaignPool(campaign.id, updated);
                  setEditPoolPiece(null);
                }}
              >
                Save changes
              </button>
              <button style={CS.btn('ghost')} onClick={() => setEditPoolPiece(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign List (top-level view) ───────────────────────────────────────────

export function OperatorCampaigns({ campaigns, partners, events, content = [], onAddCampaign, onUpdateCampaign, onDeleteCampaign, onAttachEvent, onDetachEvent, onAddRule, onUpdateRule, onDeleteRule, onUpdateCampaignPool }) {
  const [selectedId,     setSelectedId]     = useState(null);
  const [showNewForm,    setShowNewForm]     = useState(false);

  const selected = campaigns.find(c => c.id === selectedId) ?? null;

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        partners={partners}
        events={events}
        content={content}
        onBack={() => setSelectedId(null)}
        onUpdateCampaign={onUpdateCampaign}
        onAddRule={onAddRule}
        onUpdateRule={onUpdateRule}
        onDeleteRule={onDeleteRule}
        onAttachEvent={onAttachEvent}
        onDetachEvent={onDetachEvent}
        onUpdateCampaignPool={onUpdateCampaignPool}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>Campaigns</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} — manage partner entitlements, content pools, and event groupings.
          </p>
        </div>
        <button style={CS.btn('primary')} onClick={() => setShowNewForm(true)}>+ New campaign</button>
      </div>

      {/* Info banner */}
      <div style={{ padding: '12px 16px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 20, fontSize: 13 }}>
        <strong style={{ color: '#3730A3' }}>Campaign model</strong>
        <span style={{ color: '#4338CA' }}> — Each campaign belongs to a single partner and spans a date range. Entitlement rules define the partner's slot allocation per event type and zone. Events are attached to campaigns to inherit those entitlements in the allocation builder.</span>
      </div>

      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>No campaigns yet</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Create a campaign to group events and manage partner entitlements across a date range.</div>
          <button style={CS.btn('primary')} onClick={() => setShowNewForm(true)}>Create first campaign</button>
        </div>
      ) : (
        campaigns.map(campaign => {
          const partner  = partners.find(p => p.id === campaign.partnerId);
          const evtCount = campaign.eventIds?.length ?? 0;
          const ruleCount = campaign.rules?.length ?? 0;
          const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

          return (
            <div
              key={campaign.id}
              onClick={() => setSelectedId(campaign.id)}
              style={{ ...CS.card, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}
            >
              {partner && (
                <div style={{ width: 44, height: 44, borderRadius: 10, background: partner.color, color: partner.text || partner.textColor, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {partner.initials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{campaign.name}</span>
                  <CampaignStatusPill status={campaign.status} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {partner?.label || partner?.name} · {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {ruleCount} entitlement rule{ruleCount !== 1 ? 's' : ''} · {evtCount} event{evtCount !== 1 ? 's' : ''} attached
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>›</span>
            </div>
          );
        })
      )}

      {showNewForm && (
        <NewCampaignForm
          partners={partners}
          onSave={onAddCampaign}
          onClose={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
}
