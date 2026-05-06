import { useState, useCallback, useRef, useMemo } from "react";
import { CONTENT_SPECS, STATES, PARTNERS_DATA } from "../data/constants";
import { StatusBadge, MetricCard, ValidationRow, HorizontalBar, ContentRow, ContentPreview } from "./SharedComponents";

// ── Partner Dashboard ──

export function PartnerDashboard({ partner, content, allocations, events, onNavigate }) {
  const myContent = content.filter(c => c.partnerId === partner.id);
  const myAllocations = (allocations ?? []).filter(a => a.partnerId === partner.id);
  const liveCount = myContent.filter(c => c.status === "live").length;
  const pendingCount = myContent.filter(c => c.status === "pending").length;
  const rejectedCount = myContent.filter(c => c.status === "rejected").length;
  const awaitingUpload = myAllocations.filter(a => a.status === "pending_content").length;
  const upcomingEvents = [...new Set(myAllocations.map(a => a.eventId))]
    .map(eid => (events ?? []).find(e => e.id === eid))
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Welcome back</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{partner.package} — {partner.slots} slots per hour rotation</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Content pieces" value={myContent.length} sub={`of ${partner.pieces} allowed`} />
        <MetricCard label="Live now" value={liveCount} />
        <MetricCard label="Pending review" value={pendingCount} />
        <MetricCard label="Slots / hour" value={partner.slots} />
      </div>

      {/* Awaiting upload alert */}
      {awaitingUpload > 0 && (
        <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, border: "1px solid #FDE68A" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#92400E" }}>
            {awaitingUpload} allocation{awaitingUpload > 1 ? "s" : ""} awaiting your content upload
          </span>
          <button onClick={() => onNavigate("p-upload")} style={{ marginLeft: "auto", fontSize: 13, color: "#B45309", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Upload now</button>
        </div>
      )}

      {/* Rejected alert */}
      {rejectedCount > 0 && (
        <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#791F1F" }}>
            {rejectedCount} item{rejectedCount > 1 ? "s" : ""} rejected — action required
          </span>
          <button onClick={() => onNavigate("p-library")} style={{ marginLeft: "auto", fontSize: 13, color: "#A32D2D", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>View</button>
        </div>
      )}

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#378ADD", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#0C447C" }}>
            {pendingCount} item{pendingCount > 1 ? "s" : ""} under review
          </span>
          <button onClick={() => onNavigate("p-library")} style={{ marginLeft: "auto", fontSize: 13, color: "#185FA5", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>View</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 28, marginTop: 20 }}>
        <button onClick={() => onNavigate("p-upload")} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "#1B2A4A", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Upload content</button>
        <button onClick={() => onNavigate("p-library")} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Content library</button>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>Your upcoming events</h3>
          {upcomingEvents.map(ev => {
            const evAllocs = myAllocations.filter(a => a.eventId === ev.id);
            const pending  = evAllocs.filter(a => a.status === "pending_content").length;
            const review   = evAllocs.filter(a => a.status === "under_review").length;
            const approved = evAllocs.filter(a => a.status === "approved" || a.status === "live").length;
            // Allocations where the operator has sent a brief and content is still needed
            const uploadable = evAllocs.filter(a => a.status === "pending_content" && a.briefSent);
            return (
              <div key={ev.id} style={{ borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", marginBottom: 8, overflow: "hidden" }}>
                {/* Event summary row */}
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {new Date(ev.date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })} — {evAllocs.length} allocation{evAllocs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {pending  > 0 && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 8, background: "#FFFBEB", color: "#92400E", fontWeight: 500 }}>{pending} to upload</span>}
                    {review   > 0 && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 8, background: "#E6F1FB", color: "#0C447C", fontWeight: 500 }}>{review} in review</span>}
                    {approved > 0 && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 8, background: "#EAF3DE", color: "#27500A", fontWeight: 500 }}>{approved} approved</span>}
                  </div>
                </div>
                {/* Per-allocation upload rows — only shown once brief has been sent by operator */}
                {uploadable.map(alloc => (
                  <div key={alloc.id} style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, background: "#FFFDF7" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alloc.label}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {alloc.displayFormat} · {alloc.slotCount} slots · {alloc.zones?.length ?? 0} zone{alloc.zones?.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate("p-upload", alloc.id)}
                      style={{ padding: "6px 14px", borderRadius: 6, background: "#1B2A4A", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, flexShrink: 0 }}
                    >
                      ↑ Upload
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>Recent content</h3>
        {myContent.slice(0, 3).map(item => (
          <ContentRow key={item.id} item={item} onClick={() => onNavigate("p-detail", item.id)} />
        ))}
      </div>
    </div>
  );
}

// ── Partner Upload — allocation-aware ──

export function PartnerUpload({ onNavigate, onUpload, partnerId, allocations, events, initialAllocId = null }) {
  const [selectedAllocId, setSelectedAllocId] = useState(initialAllocId);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);

  // Partner allocations awaiting content or replacement
  const myAllocations = (allocations ?? []).filter(
    a => a.partnerId === partnerId && (a.status === "pending_content" || a.status === "under_review")
  );

  const selectedAlloc = myAllocations.find(a => a.id === selectedAllocId) ?? null;
  const spec = selectedAlloc?.contentSpec ?? CONTENT_SPECS;
  const eventForAlloc = selectedAlloc ? (events ?? []).find(e => e.id === selectedAlloc.eventId) : null;

  const validateFile = useCallback((f) => {
    const checks = [];
    const acceptedFormats = spec.formats ?? CONTENT_SPECS.formats;
    const fmtOk = acceptedFormats.includes(f.type);
    checks.push({ label: "File format", passed: fmtOk, message: fmtOk ? f.type.split("/")[1].toUpperCase() : `${f.type || "Unknown"} — not accepted` });
    const maxBytes = (spec.maxFileSizeMB ?? 50) * 1024 * 1024;
    const szOk = f.size <= maxBytes;
    checks.push({ label: "File size", passed: szOk, message: szOk ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB exceeds ${spec.maxFileSizeMB ?? 50} MB limit` });

    if (f.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const w = spec.width ?? 1920, h = spec.height ?? 1080;
        const ok = img.width === w && img.height === h;
        checks.push({ label: "Resolution", passed: ok, message: ok ? `${img.width}×${img.height}` : `${img.width}×${img.height} (need ${w}×${h})` });
        setValidation([...checks]);
      };
      img.src = URL.createObjectURL(f);
    } else if (f.type === "video/mp4") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const w = spec.width ?? 1920, h = spec.height ?? 1080;
        const resOk = v.videoWidth === w && v.videoHeight === h;
        checks.push({ label: "Resolution", passed: resOk, message: resOk ? `${v.videoWidth}×${v.videoHeight}` : `${v.videoWidth}×${v.videoHeight} (need ${w}×${h})` });
        const maxDur = spec.maxDurationSecs ?? 30;
        const dur = Math.round(v.duration);
        checks.push({ label: "Duration", passed: dur <= maxDur, message: dur <= maxDur ? `${dur}s` : `${dur}s exceeds ${maxDur}s limit` });
        checks.push({ label: "Codec", passed: null, message: "Verified on server" });
        setValidation([...checks]);
        URL.revokeObjectURL(v.src);
      };
      v.src = URL.createObjectURL(f);
    } else {
      setValidation([...checks]);
    }
    setFile(f);
  }, [spec]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) validateFile(e.dataTransfer.files[0]);
  }, [validateFile]);

  const allPassed = validation && validation.every(v => v.passed !== false);

  const handleSubmit = () => {
    if (!allPassed || !selectedAlloc) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      onUpload({
        name: selectedAlloc.label,
        filename: file.name,
        type: file.type,
        size: file.size,
        status: "pending",
        uploaded: "2026-04-19",
        partnerId,
        allocationId: selectedAlloc.id,
      });
    }, 1200);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: "#1D9E75" }}>{"✓"}</div>
        <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px", color: "var(--color-text-primary)" }}>Content submitted</h3>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>Submitted for: <strong>{selectedAlloc?.label}</strong></p>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Your content has been submitted for venue review.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => { setFile(null); setValidation(null); setSubmitted(false); setSelectedAllocId(null); }} style={{ padding: "10px 20px", borderRadius: 8, background: "#1B2A4A", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Upload another</button>
          <button onClick={() => onNavigate("p-library")} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>View library</button>
        </div>
      </div>
    );
  }

  // Step 1 — choose allocation
  if (!selectedAllocId) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Upload content</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Select the allocation you are uploading content for.</p>
        {myAllocations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--color-text-secondary)", fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{"✓"}</div>
            All your allocations have approved content. Nothing to upload right now.
          </div>
        ) : (
          myAllocations.map(alloc => {
            const ev = (events ?? []).find(e => e.id === alloc.eventId);
            const needsReplacement = alloc.status === "under_review";
            return (
              <div key={alloc.id} onClick={() => setSelectedAllocId(alloc.id)}
                style={{ padding: 16, borderRadius: 10, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{alloc.label}</div>
                  {needsReplacement && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#E6F1FB", color: "#0C447C", fontWeight: 600 }}>Upload replacement</span>}
                </div>
                {ev && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{ev.name} — {new Date(ev.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>}
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span>Format: <strong style={{ color: "var(--color-text-primary)" }}>{alloc.contentSpec?.label ?? alloc.displayFormat}</strong></span>
                  <span>Slots: <strong style={{ color: "var(--color-text-primary)" }}>{alloc.slotCount}</strong></span>
                  <span>Zones: <strong style={{ color: "var(--color-text-primary)" }}>{alloc.zones?.length ?? 0}</strong></span>
                </div>
                {alloc.notes && <div style={{ marginTop: 8, fontSize: 12, color: "#D97706", fontStyle: "italic" }}>{alloc.notes}</div>}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Step 2 — upload file for selected allocation
  return (
    <div>
      <button onClick={() => { setSelectedAllocId(null); setFile(null); setValidation(null); }} style={{ fontSize: 13, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>
        {"← Change allocation"}
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Upload content</h2>
      <div style={{ padding: "12px 16px", borderRadius: 8, background: "#EEF2FF", border: "0.5px solid #C7D2FE", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#3730A3", marginBottom: 4 }}>{selectedAlloc.label}</div>
        {eventForAlloc && <div style={{ fontSize: 12, color: "#4338CA", marginBottom: 4 }}>{eventForAlloc.name} — {new Date(eventForAlloc.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>}
        <div style={{ fontSize: 12, color: "#4338CA", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>Required: <strong>{spec.label ?? spec.formats?.join(", ")}</strong></span>
          <span>Max size: <strong>{spec.maxFileSizeMB ?? 50}MB</strong></span>
          <span>Max duration: <strong>{spec.maxDurationSecs ?? 30}s</strong></span>
        </div>
        {selectedAlloc.notes && <div style={{ marginTop: 6, fontSize: 12, color: "#7C3AED", fontStyle: "italic" }}>{selectedAlloc.notes}</div>}
      </div>
      {!file ? (
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "#0D7C8F" : "var(--color-border-secondary)"}`, borderRadius: 12, padding: "60px 24px", textAlign: "center", cursor: "pointer", background: dragOver ? "#E1F5EE" : "var(--color-background-primary)" }}>
          <div style={{ fontSize: 36, marginBottom: 12, color: "var(--color-text-secondary)" }}>{"⬆"}</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>Drop your file here or click to browse</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{(spec.formats ?? CONTENT_SPECS.formats).map(f => f.split("/")[1].toUpperCase()).join(", ")} — {spec.width ?? 1920}×{spec.height ?? 1080}</div>
          <input ref={fileRef} type="file" accept={(spec.formats ?? CONTENT_SPECS.formats).map(f => "." + f.split("/")[1]).join(",")} style={{ display: "none" }} onChange={(e) => e.target.files.length && validateFile(e.target.files[0])} />
        </div>
      ) : (
        <div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--color-background-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>{file.type.includes("video") ? "MP4" : file.type.includes("png") ? "PNG" : "JPG"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{(file.size / (1024 * 1024)).toFixed(1)} MB</div>
            </div>
            <button onClick={() => { setFile(null); setValidation(null); }} style={{ fontSize: 13, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>Remove</button>
          </div>
          {validation && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8 }}>Validation checks</div>
              {validation.map((v, i) => <ValidationRow key={i} {...v} />)}
            </div>
          )}
          {allPassed && (
            <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", padding: "12px 16px", borderRadius: 8, background: submitting ? "var(--color-background-secondary)" : "#1B2A4A", color: submitting ? "var(--color-text-secondary)" : "#fff", border: "none", cursor: submitting ? "default" : "pointer", fontSize: 14, fontWeight: 500 }}>
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Partner Library ──

export function PartnerLibrary({ content, partnerId, allocations, events, onNavigate }) {
  const [filter, setFilter] = useState("all");
  const myContent = content.filter(c => c.partnerId === partnerId);
  const filtered = filter === "all" ? myContent : myContent.filter(c => c.status === filter);
  const counts = {};
  Object.keys(STATES).forEach(s => { counts[s] = myContent.filter(c => c.status === s).length; });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Content library</h2>
        <button onClick={() => onNavigate("p-upload")} style={{ padding: "8px 16px", borderRadius: 8, background: "#1B2A4A", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Upload new</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ key: "all", label: "All" }, ...Object.entries(STATES).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: filter === f.key ? "#1B2A4A" : "var(--color-background-primary)", color: filter === f.key ? "#fff" : "var(--color-text-secondary)", border: filter === f.key ? "none" : "0.5px solid var(--color-border-tertiary)" }}>
            {f.label}{f.key !== "all" && counts[f.key] ? ` (${counts[f.key]})` : f.key === "all" ? ` (${myContent.length})` : ""}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-secondary)", fontSize: 14 }}>No content in this category</div>
        : filtered.map(item => {
            // Show allocation and event context if available
            const alloc = item.allocationId ? (allocations ?? []).find(a => a.id === item.allocationId) : null;
            const ev    = alloc ? (events ?? []).find(e => e.id === alloc.eventId) : null;
            return (
              <div key={item.id}>
                <ContentRow item={item} onClick={() => onNavigate("p-detail", item.id)} />
                {alloc && ev && (
                  <div style={{ marginTop: -8, marginBottom: 10, padding: "5px 12px", fontSize: 11, color: "#4338CA", background: "#EEF2FF", borderRadius: "0 0 6px 6px", display: "flex", gap: 12 }}>
                    <span>{ev.name}</span>
                    <span style={{ color: "#6366F1" }}>{alloc.label}</span>
                  </div>
                )}
              </div>
            );
          })
      }
    </div>
  );
}

// ── Partner Content Detail ──

export function PartnerDetail({ item, onNavigate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!item) return null;
  const steps = [
    { label: "Uploaded", date: item.uploaded, done: true },
    { label: "Under review", date: item.reviewed, done: ["approved", "rejected", "scheduled", "live"].includes(item.status) },
    { label: item.status === "rejected" ? "Rejected" : "Approved", date: item.reviewed, done: ["approved", "rejected", "scheduled", "live"].includes(item.status), error: item.status === "rejected" },
    { label: "Scheduled", date: null, done: ["scheduled", "live"].includes(item.status) },
    { label: "Live", date: null, done: item.status === "live" },
  ];

  return (
    <div>
      <button onClick={() => onNavigate("p-library")} style={{ fontSize: 13, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back to library</button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>{item.name}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{item.filename}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <ContentPreview item={item} />
      {item.status === "rejected" && item.rejectReason && (
        <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#791F1F", marginBottom: 4 }}>Rejection reason</div>
          <div style={{ fontSize: 14, color: "#791F1F" }}>{item.rejectReason}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            <button onClick={() => onNavigate("p-upload")} style={{ fontSize: 13, fontWeight: 500, color: "#A32D2D", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Upload replacement</button>
            <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 13, fontWeight: 500, color: "#791F1F", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Delete</button>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div style={{ border: "0.5px solid #E24B4A", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#791F1F", marginBottom: 4 }}>Delete this content?</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>This will permanently remove "{item.name}" from your library. This cannot be undone.</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => { onDelete(item.id); onNavigate("p-library"); }} style={{ padding: "8px 20px", borderRadius: 8, background: "#791F1F", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancel</button>
          </div>
        </div>
      )}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-primary)" }}>Status timeline</h3>
        <div style={{ paddingLeft: 20 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < steps.length - 1 ? 24 : 0, position: "relative" }}>
              {i < steps.length - 1 && <div style={{ position: "absolute", left: 3, top: 16, bottom: 0, width: 1, background: step.done ? (step.error ? "#E24B4A" : "#1D9E75") : "var(--color-border-tertiary)" }} />}
              <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, position: "relative", zIndex: 1, background: step.done ? (step.error ? "#E24B4A" : "#1D9E75") : "var(--color-background-primary)", border: step.done ? "none" : "2px solid var(--color-border-secondary)" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: step.done ? 500 : 400, color: step.done ? (step.error ? "#791F1F" : "var(--color-text-primary)") : "var(--color-text-secondary)" }}>{step.label}</div>
                {step.date && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{step.date}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Partner Proof of Play ──

export function PartnerPoP({ popRecords }) {
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-04-18");
  const [view, setView] = useState("summary");
  const [contentFilter, setContentFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filtered = useMemo(() => popRecords.filter(r => r.date >= dateFrom && r.date <= dateTo && (contentFilter === "all" || r.contentFilename === contentFilter)), [popRecords, dateFrom, dateTo, contentFilter]);
  const totalPlays = filtered.length;
  const totalMinutes = Math.round((totalPlays * 30) / 60);
  const uniqueDays = new Set(filtered.map(r => r.date)).size;
  const avgPerDay = uniqueDays > 0 ? Math.round(totalPlays / uniqueDays) : 0;
  const contractedTotal = uniqueDays * 14 * 12;
  const deliveryPct = contractedTotal > 0 ? Math.min(100, Math.round((totalPlays / contractedTotal) * 100)) : 0;

  const byContent = useMemo(() => { const m = {}; filtered.forEach(r => { if (!m[r.contentFilename]) m[r.contentFilename] = { name: r.contentName, filename: r.contentFilename, count: 0 }; m[r.contentFilename].count++; }); return Object.values(m).sort((a, b) => b.count - a.count); }, [filtered]);
  const byZone = useMemo(() => { const m = {}; filtered.forEach(r => { m[r.zone] = (m[r.zone] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [filtered]);
  const byDay = useMemo(() => { const m = {}; filtered.forEach(r => { m[r.date] = (m[r.date] || 0) + 1; }); return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])); }, [filtered]);
  const maxDay = byDay.length > 0 ? Math.max(...byDay.map(d => d[1])) : 1;
  const cColors = ["#378ADD", "#1D9E75"];
  const zColors = ["#0D7C8F", "#639922", "#BA7517", "#534AB7", "#993C1D"];
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const handleExport = () => {
    const h = ["Date", "Time", "Content", "Filename", "Zone", "Device", "Duration(s)"];
    const rows = filtered.map(r => [r.date, r.time, r.contentName, r.contentFilename, r.zone, r.dmp, r.duration]);
    const csv = [h, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `proof_of_play_${dateFrom}_to_${dateTo}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Proof of play</h2>
        <button onClick={handleExport} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Export CSV</button>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <div><label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>From</label><input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} /></div>
        <div><label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>To</label><input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} /></div>
        <div style={{ marginLeft: "auto" }}><label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Content</label><select value={contentFilter} onChange={e => { setContentFilter(e.target.value); setPage(0); }} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}><option value="all">All content</option>{byContent.map(c => <option key={c.filename} value={c.filename}>{c.name}</option>)}</select></div>
      </div>
      <div style={{ background: deliveryPct >= 95 ? "#E1F5EE" : deliveryPct >= 80 ? "#FAEEDA" : "#FCEBEB", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 500, color: deliveryPct >= 95 ? "#085041" : deliveryPct >= 80 ? "#854F0B" : "#791F1F" }}>{deliveryPct}%</div>
        <div><div style={{ fontSize: 14, fontWeight: 500, color: deliveryPct >= 95 ? "#085041" : deliveryPct >= 80 ? "#854F0B" : "#791F1F" }}>Delivery rate</div><div style={{ fontSize: 13, color: deliveryPct >= 95 ? "#0F6E56" : deliveryPct >= 80 ? "#BA7517" : "#A32D2D" }}>{totalPlays.toLocaleString()} of {contractedTotal.toLocaleString()} contracted plays delivered</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}><MetricCard label="Total plays" value={totalPlays.toLocaleString()} /><MetricCard label="Total airtime" value={`${totalMinutes} min`} /><MetricCard label="Days active" value={uniqueDays} /><MetricCard label="Avg plays / day" value={avgPerDay} /></div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{[{ key: "summary", label: "Summary" }, { key: "daily", label: "Daily breakdown" }, { key: "detail", label: "Play records" }].map(v => <button key={v.key} onClick={() => { setView(v.key); setPage(0); }} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: view === v.key ? "#1B2A4A" : "var(--color-background-primary)", color: view === v.key ? "#fff" : "var(--color-text-secondary)", border: view === v.key ? "none" : "0.5px solid var(--color-border-tertiary)" }}>{v.label}</button>)}</div>
      {view === "summary" && <div><div style={{ marginBottom: 28 }}><h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-primary)" }}>Plays by content</h3>{byContent.map((c, i) => <HorizontalBar key={c.filename} label={c.name} value={c.count} total={totalPlays} color={cColors[i % cColors.length]} />)}</div><div><h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-primary)" }}>Plays by zone</h3>{byZone.map(([z, cnt], i) => <HorizontalBar key={z} label={z} value={cnt} total={totalPlays} color={zColors[i % zColors.length]} />)}</div></div>}
      {view === "daily" && <div><h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-primary)" }}>Daily play count</h3>{byDay.map(([date, cnt]) => { const pct = Math.round((cnt / maxDay) * 100); const dn = new Date(date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" }); return <div key={date} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}><span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 80, flexShrink: 0 }}>{dn} {date.slice(5)}</span><div style={{ flex: 1, height: 20, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "#378ADD", borderRadius: 4 }} /></div><span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", width: 32, textAlign: "right", flexShrink: 0 }}>{cnt}</span></div>; })}</div>}
      {view === "detail" && <div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}><thead><tr style={{ borderBottom: "0.5px solid var(--color-border-secondary)" }}>{["Date", "Time", "Content", "Zone", "Device", "Duration"].map(h => <th key={h} style={{ textAlign: "left", padding: 8, fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12 }}>{h}</th>)}</tr></thead><tbody>{paged.map(r => <tr key={r.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}><td style={{ padding: 8, color: "var(--color-text-primary)" }}>{r.date}</td><td style={{ padding: 8 }}>{r.time}</td><td style={{ padding: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.contentName}</td><td style={{ padding: 8, color: "var(--color-text-secondary)" }}>{r.zone}</td><td style={{ padding: 8, color: "var(--color-text-secondary)", fontSize: 12 }}>{r.dmp}</td><td style={{ padding: 8, color: "var(--color-text-secondary)" }}>{r.duration}s</td></tr>)}</tbody></table></div>{totalPages > 1 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}><span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span><div style={{ display: "flex", gap: 4 }}><button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: page === 0 ? "default" : "pointer", background: "var(--color-background-primary)", color: page === 0 ? "var(--color-text-tertiary)" : "var(--color-text-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>Previous</button><button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: page >= totalPages - 1 ? "default" : "pointer", background: "var(--color-background-primary)", color: page >= totalPages - 1 ? "var(--color-text-tertiary)" : "var(--color-text-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>Next</button></div></div>}</div>}
    </div>
  );
}
