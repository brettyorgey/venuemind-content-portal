import { useState, useMemo } from "react";

const DISPLAY_FORMATS = ["fullscreen", "lwrap", "ribbon"];
const PRICING_TIERS = ["standard", "standard+", "premium", "premium+"];
const FORMAT_LABELS = { fullscreen: "Full-screen", lwrap: "L-wrap", ribbon: "Ribbon" };
const TIER_COLORS = {
  "standard":   { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
  "standard+":  { bg: "#E6F1FB", color: "#185FA5" },
  "premium":    { bg: "#EAF3DE", color: "#3B6D11" },
  "premium+":   { bg: "#E1F5EE", color: "#0F6E56" },
};

function formatMins(secs) {
  const m = Math.floor(secs / 60);
  return m === 1 ? "1 min" : `${m} mins`;
}

function StatePill({ format, isInPlay }) {
  const bg = isInPlay ? "#FAEEDA" : "var(--color-background-secondary)";
  const color = isInPlay ? "#854F0B" : "var(--color-text-secondary)";
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: bg, color, border: "0.5px solid transparent" }}>
      {isInPlay ? "in-play" : "break"}
    </span>
  );
}

function FormatBadge({ format }) {
  const colors = {
    fullscreen: { bg: "#E6F1FB", color: "#185FA5" },
    lwrap:      { bg: "#FAEEDA", color: "#854F0B" },
    ribbon:     { bg: "#EAF3DE", color: "#3B6D11" },
  };
  const c = colors[format] || colors.fullscreen;
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {FORMAT_LABELS[format] || format}
    </span>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{title}</h3>
      {action}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
      {message}
    </div>
  );
}

function IconBtn({ onClick, title, children, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
      color: danger ? "var(--color-text-danger)" : "var(--color-text-secondary)",
      borderRadius: "var(--border-radius-md)", fontSize: 13, lineHeight: 1,
    }}>{children}</button>
  );
}

function Btn({ onClick, variant = "default", disabled, children, small }) {
  const styles = {
    default: { background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)" },
    primary: { background: "var(--color-text-primary)", border: "0.5px solid var(--color-border-primary)", color: "var(--color-background-primary)" },
    danger:  { background: "none", border: "0.5px solid var(--color-border-danger)", color: "var(--color-text-danger)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "4px 10px" : "6px 14px",
      borderRadius: "var(--border-radius-md)",
      fontSize: small ? 12 : 13,
      fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit",
    }}>{children}</button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", fontFamily: "inherit" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 14, height: 14 }} />
      {label}
    </label>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", width, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</h3>
          <IconBtn onClick={onClose}>✕</IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

const SLOT_DURATIONS = [
  { value: 15,  label: "15 seconds" },
  { value: 30,  label: "30 seconds" },
  { value: 60,  label: "1 minute" },
  { value: 120, label: "2 minutes" },
];

function slotDurationLabel(secs) {
  const match = SLOT_DURATIONS.find(d => d.value === secs);
  return match ? match.label : `${secs}s`;
}

// Revenue rate multiplier relative to the 30s base rate on zones.
// A 15s slot is worth half; a 60s slot is worth double.
function slotRateMultiplier(slotDurationSecs) {
  return slotDurationSecs / 30;
}

function blankState() {
  return { id: "", label: "", durationSecs: 1800, slotCount: 120, slotDurationSecs: 30, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", notes: "" };
}

function blankZone() {
  return { id: "", label: "", dmpPattern: "", pricingTier: "standard", ratePerSlot: 15, notes: "" };
}

function StateForm({ initial, onSave, onCancel, existingIds }) {
  const [s, setS] = useState(initial || blankState());
  const set = k => v => setS(p => ({ ...p, [k]: v }));
  const mins = Math.round(s.durationSecs / 60);
  const isNew = !initial;
  const idConflict = isNew && existingIds.includes(s.id.trim().toLowerCase().replace(/\s+/g, "_"));
  const valid = s.id.trim() && s.label.trim() && s.slotCount > 0 && !idConflict;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="State ID" hint="Lowercase, underscores (e.g. half_time)">
          <Input value={s.id} onChange={v => set("id")(v.toLowerCase().replace(/\s+/g, "_"))} placeholder="half_time" />
          {idConflict && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-danger)" }}>ID already exists</p>}
        </Field>
        <Field label="Display label">
          <Input value={s.label} onChange={set("label")} placeholder="Half Time" />
        </Field>
        <Field label={`Duration — ${mins} min${mins !== 1 ? "s" : ""}`}>
          <input type="range" min={60} max={10800} step={60} value={s.durationSecs}
            onChange={e => set("durationSecs")(Number(e.target.value))} style={{ width: "100%" }} />
        </Field>
        <Field label="Slot duration">
          <Select value={s.slotDurationSecs || 30} onChange={v => set("slotDurationSecs")(Number(v))}
            options={SLOT_DURATIONS} />
        </Field>
        <Field label={`Slot count (${slotDurationLabel(s.slotDurationSecs || 30)} slots)`} hint={s.slotDurationSecs && s.slotDurationSecs !== 30 ? `Rate multiplier: ${slotRateMultiplier(s.slotDurationSecs)}× base zone rate` : "Base rate applies"}>
          <input type="number" min={1} max={500} value={s.slotCount}
            onChange={e => set("slotCount")(Number(e.target.value))}
            style={{ width: "100%", fontFamily: "inherit" }} />
        </Field>
        <Field label="Default display format">
          <Select value={s.defaultFormat} onChange={set("defaultFormat")}
            options={DISPLAY_FORMATS.map(f => ({ value: f, label: FORMAT_LABELS[f] }))} />
        </Field>
        <Field label="Commercial priority">
          <Select value={s.commercialPriority} onChange={set("commercialPriority")}
            options={[
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]} />
        </Field>
      </div>
      <Field label="">
        <Checkbox checked={s.isInPlay} onChange={set("isInPlay")} label="In-play state (L-wrap / ribbon format required — full-screen ads blocked)" />
      </Field>
      <Field label="Notes">
        <Input value={s.notes} onChange={set("notes")} placeholder="e.g. Longest break — highest commercial value state" />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(s)} disabled={!valid}>Save state</Btn>
      </div>
    </div>
  );
}

function ZoneForm({ initial, onSave, onCancel, existingIds }) {
  const [z, setZ] = useState(initial || blankZone());
  const set = k => v => setZ(p => ({ ...p, [k]: v }));
  const isNew = !initial;
  const idConflict = isNew && existingIds.includes(z.id.trim().toLowerCase().replace(/\s+/g, "_"));
  const valid = z.id.trim() && z.label.trim() && !idConflict;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Zone ID" hint="Lowercase, underscores (e.g. members_bar)">
          <Input value={z.id} onChange={v => set("id")(v.toLowerCase().replace(/\s+/g, "_"))} placeholder="members_bar" />
          {idConflict && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-danger)" }}>ID already exists</p>}
        </Field>
        <Field label="Display label">
          <Input value={z.label} onChange={set("label")} placeholder="Members Bar" />
        </Field>
        <Field label="DMP pattern" hint="Wildcard pattern for screen matching">
          <Input value={z.dmpPattern} onChange={set("dmpPattern")} placeholder="DMP-MB-*" />
        </Field>
        <Field label="Pricing tier">
          <Select value={z.pricingTier} onChange={set("pricingTier")}
            options={PRICING_TIERS.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
        </Field>
        <Field label="Base rate per 30s slot ($)" hint="State slot duration adjusts this rate automatically">
          <input type="number" min={0} step={1} value={z.ratePerSlot}
            onChange={e => set("ratePerSlot")(Number(e.target.value))}
            style={{ width: "100%", fontFamily: "inherit" }} />
        </Field>
        <Field label="Audience / notes">
          <Input value={z.notes} onChange={set("notes")} placeholder="e.g. High dwell, high spend" />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(z)} disabled={!valid}>Save zone</Btn>
      </div>
    </div>
  );
}

function TemplateForm({ initial, onSave, onCancel, existingIds }) {
  const [t, setT] = useState(initial || { id: "", label: "", sport: "", status: "draft", notes: "" });
  const set = k => v => setT(p => ({ ...p, [k]: v }));
  const isNew = !initial;
  const idConflict = isNew && existingIds.includes(t.id.trim().toLowerCase().replace(/\s+/g, "_"));
  const valid = t.id.trim() && t.label.trim() && !idConflict;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Template ID" hint="Lowercase, underscores (e.g. cricket_t20)">
          <Input value={t.id} onChange={v => set("id")(v.toLowerCase().replace(/\s+/g, "_"))} placeholder="cricket_t20" />
          {idConflict && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-danger)" }}>ID already exists</p>}
        </Field>
        <Field label="Event type name">
          <Input value={t.label} onChange={set("label")} placeholder="Cricket T20" />
        </Field>
        <Field label="Sport / category">
          <Input value={t.sport} onChange={set("sport")} placeholder="Cricket" />
        </Field>
        <Field label="Status">
          <Select value={t.status} onChange={set("status")}
            options={[
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]} />
        </Field>
      </div>
      <Field label="Notes">
        <Input value={t.notes} onChange={set("notes")} placeholder="e.g. T20 format — 20 overs per innings" />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(t)} disabled={!valid}>Save template</Btn>
      </div>
    </div>
  );
}


// ─── Moment type form ────────────────────────────────────────────────────────
const DISPLAY_FORMATS_MOMENT = [
  { value: "fullscreen", label: "Full-screen" },
  { value: "lwrap",      label: "L-wrap" },
  { value: "ribbon",     label: "Ribbon" },
];

function blankMoment() {
  return { id: "", label: "", icon: "✨", defaultFormat: "fullscreen", notes: "" };
}

function MomentForm({ initial, onSave, onCancel, existingIds }) {
  const [m, setM] = useState(initial || blankMoment());
  const set = k => v => setM(prev => ({ ...prev, [k]: v }));
  const idError = !m.id.trim() ? "ID is required" :
    !/^[a-z0-9_]+$/.test(m.id) ? "Lowercase letters, numbers and underscores only" :
    (!initial && existingIds.includes(m.id)) ? "ID already in use" : "";
  const canSave = m.label.trim() && !idError;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Moment ID" hint="Unique identifier — lowercase, no spaces (e.g. goal, award)">
        <Input value={m.id} onChange={set("id")} placeholder="e.g. goal" />
        {idError && <p style={{ color: "#DC2626", fontSize: 12, margin: "4px 0 0" }}>{idError}</p>}
      </Field>
      <Field label="Moment name">
        <Input value={m.label} onChange={set("label")} placeholder="e.g. Goal Replay" />
      </Field>
      <Field label="Icon" hint="Emoji shown on the moment card">
        <Input value={m.icon} onChange={set("icon")} placeholder="✨" />
      </Field>
      <Field label="Default format">
        <Select value={m.defaultFormat} onChange={set("defaultFormat")}
          options={DISPLAY_FORMATS_MOMENT} />
      </Field>
      <Field label="Notes" hint="Describe when this moment is triggered">
        <Input value={m.notes} onChange={set("notes")} placeholder="e.g. Triggered on every goal scored" />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" disabled={!canSave}
          onClick={() => canSave && onSave({ ...m, id: m.id.trim(), label: m.label.trim(), notes: m.notes.trim() })}>
          {initial ? "Save changes" : "Add moment"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Moments tab ─────────────────────────────────────────────────────────────
function MomentsTab({ template, templates, onUpdateMomentTypes, onBack }) {
  const [showAdd,       setShowAdd]       = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!template) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 16 }}>Select a template to manage its moment types.</p>
        <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>Go to the Templates tab and click "Edit moments" on any template.</p>
      </div>
    );
  }

  const momentTypes = template.momentTypes || [];

  const addMoment = m => onUpdateMomentTypes(template.id, [...momentTypes, m]);
  const updateMoment = m => onUpdateMomentTypes(template.id, momentTypes.map(x => x.id === m.id ? m : x));
  const deleteMoment = id => onUpdateMomentTypes(template.id, momentTypes.filter(m => m.id !== id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Btn small onClick={onBack}>← Templates</Btn>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{template.label}</span>
          <span style={{ marginLeft: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
            {momentTypes.length} moment type{momentTypes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Btn variant="primary" small onClick={() => setShowAdd(true)}>+ Add moment type</Btn>
      </div>

      <div style={{ padding: "10px 14px", borderRadius: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", marginBottom: 16, fontSize: 12, color: "#3730A3" }}>
        Moment types defined here appear in every event of this type. Operators assign partners per zone in Event Setup.
      </div>

      {momentTypes.length === 0 && (
        <EmptyState message="No moment types defined. Add the first moment type for this event template." />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {momentTypes.map(m => (
          <div key={m.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{m.label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>{m.defaultFormat}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", gap: 12 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-tertiary)" }}>{m.id}</span>
                {m.notes && <span style={{ fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.notes}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <IconBtn onClick={() => setEditTarget(m)} title="Edit">✎</IconBtn>
              <IconBtn danger onClick={() => setConfirmDelete(m)} title="Delete">✕</IconBtn>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title={`Add moment type — ${template.label}`} onClose={() => setShowAdd(false)}>
          <MomentForm existingIds={momentTypes.map(m => m.id)} onCancel={() => setShowAdd(false)}
            onSave={m => { addMoment(m); setShowAdd(false); }} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit moment type" onClose={() => setEditTarget(null)}>
          <MomentForm initial={editTarget} existingIds={momentTypes.filter(m => m.id !== editTarget.id).map(m => m.id)}
            onCancel={() => setEditTarget(null)}
            onSave={m => { updateMoment(m); setEditTarget(null); }} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Remove moment type?" onClose={() => setConfirmDelete(null)} width={360}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 0 }}>
            Remove <strong>{confirmDelete.label}</strong> from this template? Existing partner assignments for this moment type will be cleared from all events.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => { deleteMoment(confirmDelete.id); setConfirmDelete(null); }}>Remove</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TemplatesTab({ templates, zones, onAddTemplate, onEditTemplate, onDeleteTemplate, onSelectTemplate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const totalSlots = t => t.states ? t.states.reduce((a, s) => a + s.slotCount, 0) : 0;
  const totalMins = t => t.states ? Math.round(t.states.reduce((a, s) => a + s.durationSecs, 0) / 60) : 0;

  const statusColors = {
    active:   { bg: "#EAF3DE", color: "#3B6D11" },
    draft:    { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
    archived: { bg: "#FCEBEB", color: "#A32D2D" },
  };

  return (
    <div>
      <SectionHeader title={`Event type templates (${templates.length})`} action={
        <Btn variant="primary" small onClick={() => setShowAdd(true)}>+ New template</Btn>
      } />

      {templates.length === 0 && <EmptyState message="No event type templates. Add one to get started." />}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {templates.map(t => {
          const sc = statusColors[t.status] || statusColors.draft;
          const slots = totalSlots(t);
          const mins = totalMins(t);
          return (
            <div key={t.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.color }}>{t.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {t.sport && <span>{t.sport}</span>}
                    <span>{(t.states || []).length} states</span>
                    <span>{(t.momentTypes || []).length} moment{(t.momentTypes || []).length !== 1 ? "s" : ""}</span>
                    {slots > 0 && <span>{slots} slots / zone</span>}
                    {mins > 0 && <span>~{mins} mins</span>}
                    {t.notes && <span style={{ fontStyle: "italic" }}>{t.notes}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <Btn small onClick={() => onSelectTemplate(t.id, "moments")}>Edit moments</Btn>
                  <Btn small onClick={() => onSelectTemplate(t.id, "states")}>Edit states</Btn>
                  <IconBtn onClick={() => setEditTarget(t)} title="Edit template details">✎</IconBtn>
                  <IconBtn danger onClick={() => setConfirmDelete(t)} title="Delete template">✕</IconBtn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="New event type template" onClose={() => setShowAdd(false)}>
          <TemplateForm existingIds={templates.map(t => t.id)} onCancel={() => setShowAdd(false)}
            onSave={t => { onAddTemplate(t); setShowAdd(false); }} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit template" onClose={() => setEditTarget(null)}>
          <TemplateForm initial={editTarget} existingIds={templates.filter(t => t.id !== editTarget.id).map(t => t.id)}
            onCancel={() => setEditTarget(null)}
            onSave={t => { onEditTemplate(t); setEditTarget(null); }} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete template?" onClose={() => setConfirmDelete(null)} width={360}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 0 }}>
            This will permanently delete <strong>{confirmDelete.label}</strong> and all its state definitions. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => { onDeleteTemplate(confirmDelete.id); setConfirmDelete(null); }}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatesTab({ template, templates, onUpdateStates, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!template) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 16 }}>Select a template to manage its states.</p>
        <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>Go to the Templates tab and click "Edit states" on any template.</p>
      </div>
    );
  }

  const states = template.states || [];
  const totalSlots = states.reduce((a, s) => a + s.slotCount, 0);
  const totalMins = Math.round(states.reduce((a, s) => a + s.durationSecs, 0) / 60);

  const addState = s => {
    const newS = { ...s, sortOrder: states.length };
    onUpdateStates(template.id, [...states, newS]);
  };

  const updateState = s => {
    onUpdateStates(template.id, states.map(st => st.id === s.id ? s : st));
  };

  const deleteState = id => {
    onUpdateStates(template.id, states.filter(s => s.id !== id));
  };

  const move = (idx, dir) => {
    const next = [...states];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onUpdateStates(template.id, next);
  };

  const priorityColors = { high: { bg: "#EAF3DE", color: "#3B6D11" }, medium: { bg: "#E6F1FB", color: "#185FA5" }, low: { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" } };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Btn small onClick={onBack}>← Templates</Btn>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{template.label}</span>
          {states.length > 0 && (
            <span style={{ marginLeft: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
              {states.length} states · {totalSlots} slots/zone · ~{totalMins} mins
            </span>
          )}
        </div>
        <Btn variant="primary" small onClick={() => setShowAdd(true)}>+ Add state</Btn>
      </div>

      {states.length === 0 && <EmptyState message="No states defined. Add the first state of play for this event type." />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {states.map((s, idx) => {
          const pc = priorityColors[s.commercialPriority] || priorityColors.medium;
          return (
            <div key={s.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                <IconBtn onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up" style={{ opacity: idx === 0 ? 0.3 : 1 }}>↑</IconBtn>
                <IconBtn onClick={() => move(idx, 1)} disabled={idx === states.length - 1} title="Move down">↓</IconBtn>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{s.label}</span>
                  <StatePill isInPlay={s.isInPlay} />
                  <FormatBadge format={s.defaultFormat} />
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>
                    {slotDurationLabel(s.slotDurationSecs || 30)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: pc.bg, color: pc.color }}>
                    {s.commercialPriority}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
                  <span>{formatMins(s.durationSecs)}</span>
                  <span>{s.slotCount} slots</span>
                  {s.notes && <span style={{ fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.notes}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <IconBtn onClick={() => setEditTarget(s)} title="Edit">✎</IconBtn>
                <IconBtn danger onClick={() => setConfirmDelete(s)} title="Delete">✕</IconBtn>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title={`Add state — ${template.label}`} onClose={() => setShowAdd(false)}>
          <StateForm existingIds={states.map(s => s.id)} onCancel={() => setShowAdd(false)}
            onSave={s => { addState(s); setShowAdd(false); }} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit state" onClose={() => setEditTarget(null)}>
          <StateForm initial={editTarget} existingIds={states.filter(s => s.id !== editTarget.id).map(s => s.id)}
            onCancel={() => setEditTarget(null)}
            onSave={s => { updateState(s); setEditTarget(null); }} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete state?" onClose={() => setConfirmDelete(null)} width={360}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 0 }}>
            Remove <strong>{confirmDelete.label}</strong> from this template?
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => { deleteState(confirmDelete.id); setConfirmDelete(null); }}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ZonesTab({ zones, onAddZone, onEditZone, onDeleteZone }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div>
      <SectionHeader title={`Venue zones (${zones.length})`} action={
        <Btn variant="primary" small onClick={() => setShowAdd(true)}>+ Add zone</Btn>
      } />
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 16 }}>
        Zones are venue-specific and apply across all event types. They define the physical screen groups that receive the same playlist simultaneously.
      </p>

      {zones.length === 0 && <EmptyState message="No zones configured. Add at least one zone to enable inventory calculations." />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {zones.map((z, idx) => {
          const tc = TIER_COLORS[z.pricingTier] || TIER_COLORS.standard;
          return (
            <div key={z.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{z.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: tc.bg, color: tc.color }}>
                    {z.pricingTier}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>${z.ratePerSlot}/slot</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {z.dmpPattern && <span style={{ fontFamily: "monospace" }}>{z.dmpPattern}</span>}
                  {z.notes && <span style={{ fontStyle: "italic" }}>{z.notes}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <IconBtn onClick={() => setEditTarget(z)} title="Edit">✎</IconBtn>
                <IconBtn danger onClick={() => setConfirmDelete(z)} title="Delete">✕</IconBtn>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="Add zone" onClose={() => setShowAdd(false)}>
          <ZoneForm existingIds={zones.map(z => z.id)} onCancel={() => setShowAdd(false)}
            onSave={z => { onAddZone(z); setShowAdd(false); }} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit zone" onClose={() => setEditTarget(null)}>
          <ZoneForm initial={editTarget} existingIds={zones.filter(z => z.id !== editTarget.id).map(z => z.id)}
            onCancel={() => setEditTarget(null)}
            onSave={z => { onEditZone(z); setEditTarget(null); }} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete zone?" onClose={() => setConfirmDelete(null)} width={360}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 0 }}>
            Remove <strong>{confirmDelete.label}</strong> from venue configuration?
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => { onDeleteZone(confirmDelete.id); setConfirmDelete(null); }}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InventoryTab({ templates, zones }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [filterZone, setFilterZone] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [gamesInSeason, setGamesInSeason] = useState(11);

  const template = templates.find(t => t.id === selectedTemplateId);
  const states = template?.states || [];

  const filteredStates = filterState === "all" ? states : states.filter(s => s.id === filterState);
  const filteredZones = filterZone === "all" ? zones : zones.filter(z => z.id === filterZone);

  const inventory = useMemo(() => {
    if (!template || zones.length === 0 || states.length === 0) return null;

    const cells = [];
    for (const s of filteredStates) {
      for (const z of filteredZones) {
        const capacity = s.slotCount;
        const contracted = Math.round(capacity * 0.72);
        const spare = capacity - contracted;
        const baseRate = z.ratePerSlot || 15;
        const multiplier = slotRateMultiplier(s.slotDurationSecs || 30);
        const effectiveRate = baseRate * multiplier;
        const revenueContracted = contracted * effectiveRate;
        const revenueSpare = spare * effectiveRate;
        cells.push({ state: s, zone: z, capacity, contracted, spare, effectiveRate, revenueContracted, revenueSpare });
      }
    }

    const totalCap = cells.reduce((a, c) => a + c.capacity, 0);
    const totalCont = cells.reduce((a, c) => a + c.contracted, 0);
    const totalSpare = cells.reduce((a, c) => a + c.spare, 0);
    const totalRevCont = cells.reduce((a, c) => a + c.revenueContracted, 0);
    const totalRevSpare = cells.reduce((a, c) => a + c.revenueSpare, 0);

    return { cells, totalCap, totalCont, totalSpare, totalRevCont, totalRevSpare };
  }, [template, filteredStates, filteredZones]);

  const fmt = n => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  if (templates.length === 0) {
    return <EmptyState message="Create at least one event type template to view inventory projections." />;
  }

  if (zones.length === 0) {
    return <EmptyState message="Add venue zones to enable inventory calculations." />;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Select value={selectedTemplateId} onChange={setSelectedTemplateId}
          options={templates.map(t => ({ value: t.id, label: t.label }))} />
        <Select value={filterZone} onChange={setFilterZone}
          options={[{ value: "all", label: "All zones" }, ...zones.map(z => ({ value: z.id, label: z.label }))]} />
        <Select value={filterState} onChange={setFilterState}
          options={[{ value: "all", label: "All states" }, ...states.map(s => ({ value: s.id, label: s.label }))]} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Games in season</label>
          <input type="number" min={1} max={100} value={gamesInSeason}
            onChange={e => setGamesInSeason(Number(e.target.value))}
            style={{ width: 64, fontFamily: "inherit" }} />
        </div>
      </div>

      {inventory && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total capacity", value: inventory.totalCap.toLocaleString(), sub: "slots" },
              { label: "Contracted", value: inventory.totalCont.toLocaleString(), sub: `${Math.round(inventory.totalCont / inventory.totalCap * 100)}% sold` },
              { label: "Available to sell", value: inventory.totalSpare.toLocaleString(), sub: "spare slots", accent: inventory.totalSpare > 0 },
              { label: "Contracted revenue", value: fmt(inventory.totalRevCont), sub: "per game" },
              { label: "Opportunity", value: fmt(inventory.totalRevSpare), sub: "spare @ rate", accent: true },
              { label: "Season projection", value: fmt((inventory.totalRevCont + inventory.totalRevSpare) * gamesInSeason), sub: `${gamesInSeason} games, full sell` },
            ].map(m => (
              <div key={m.label} style={{
                background: m.accent ? "#EAF3DE" : "var(--color-background-secondary)",
                borderRadius: "var(--border-radius-md)", padding: "12px 14px"
              }}>
                <div style={{ fontSize: 11, color: m.accent ? "#3B6D11" : "var(--color-text-secondary)", marginBottom: 4, fontWeight: 500 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: m.accent ? "#27500A" : "var(--color-text-primary)", lineHeight: 1.2 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: m.accent ? "#3B6D11" : "var(--color-text-tertiary)", marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>State of play</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Zone</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Slot dur.</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Capacity</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Contracted</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Spare</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Eff. rate</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Contracted $</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 11 }}>Opportunity $</th>
                </tr>
              </thead>
              <tbody>
                {inventory.cells.map((cell, i) => (
                  <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: cell.state.isInPlay ? "#FAEEDA22" : "transparent" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--color-text-primary)" }}>{cell.state.label}</span>
                        {cell.state.isInPlay && <StatePill isInPlay />}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)" }}>{cell.zone.label}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>
                        {slotDurationLabel(cell.state.slotDurationSecs || 30)}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-primary)" }}>{cell.capacity}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-secondary)" }}>{cell.contracted}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <span style={{ color: cell.spare > 0 ? "#3B6D11" : "var(--color-text-tertiary)", fontWeight: cell.spare > 0 ? 500 : 400 }}>
                        {cell.spare}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-secondary)" }}>${cell.effectiveRate.toFixed(2)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-secondary)" }}>{fmt(cell.revenueContracted)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <span style={{ color: cell.revenueSpare > 0 ? "#3B6D11" : "var(--color-text-tertiary)" }}>
                        {fmt(cell.revenueSpare)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)" }}>
                  <td colSpan={2} style={{ padding: "8px 10px", fontWeight: 500, fontSize: 12, color: "var(--color-text-primary)" }}>Total</td>
                  <td />
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, color: "var(--color-text-primary)" }}>{inventory.totalCap}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, color: "var(--color-text-secondary)" }}>{inventory.totalCont}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, color: "#3B6D11" }}>{inventory.totalSpare}</td>
                  <td />
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, color: "var(--color-text-secondary)" }}>{fmt(inventory.totalRevCont)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, color: "#3B6D11" }}>{fmt(inventory.totalRevSpare)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 12 }}>
            Contracted figures are estimated at 72% allocation. Effective rate = zone base rate × slot duration multiplier (30s = 1×, 15s = 0.5×, 60s = 2×). Opportunity = spare slots at effective rate. Excludes GST.
          </p>
        </>
      )}
    </div>
  );
}

export function OperatorTemplates({ templates, zones, onAddTemplate, onEditTemplate, onDeleteTemplate, onUpdateStates, onUpdateMomentTypes, onAddZone, onEditZone, onDeleteZone }) {
  const TABS = [
    { key: "templates", label: "Event templates" },
    { key: "states",    label: "States of play" },
    { key: "moments",   label: "Moment types" },
    { key: "zones",     label: "Venue zones" },
    { key: "inventory", label: "Inventory dashboard" },
  ];

  const [activeTab,        setActiveTab]        = useState("templates");
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || null;

  // Navigate to a template's states or moments editor directly from the template card
  const handleSelectTemplate = (id, tab = "states") => {
    setActiveTemplateId(id);
    setActiveTab(tab);
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>Templates & inventory</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Configure event type templates, states of play, moment types, venue zones, and view inventory projections.
      </p>

      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 24 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: "none", border: "none", borderBottom: activeTab === tab.key ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.key ? 500 : 400,
            color: activeTab === tab.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontFamily: "inherit", marginBottom: -1,
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "templates" && (
        <TemplatesTab templates={templates} zones={zones}
          onAddTemplate={onAddTemplate} onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate} onSelectTemplate={handleSelectTemplate} />
      )}
      {activeTab === "states" && (
        <StatesTab template={activeTemplate} templates={templates}
          onUpdateStates={onUpdateStates} onBack={() => setActiveTab("templates")} />
      )}
      {activeTab === "moments" && (
        <MomentsTab template={activeTemplate} templates={templates}
          onUpdateMomentTypes={onUpdateMomentTypes} onBack={() => setActiveTab("templates")} />
      )}
      {activeTab === "zones" && (
        <ZonesTab zones={zones} onAddZone={onAddZone} onEditZone={onEditZone} onDeleteZone={onDeleteZone} />
      )}
      {activeTab === "inventory" && (
        <InventoryTab templates={templates} zones={zones} />
      )}
    </div>
  );
}
