import { useState, useMemo, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FORMAT_LABELS = { fullscreen: "Full-screen (16:9)", lwrap: "L-wrap", ribbon: "Footer ribbon" };
const FORMAT_SPECS  = {
  fullscreen: "1920 × 1080 px, MP4 or MOV, H.264, max 50 MB",
  lwrap:      "1920 × 1080 px with safe zone: content occupies bottom-right 75% — top-left 25% must remain transparent for live broadcast overlay. MP4 or MOV, H.264, max 30 MB",
  ribbon:     "1920 × 200 px footer strip, MP4 or MOV, H.264, max 10 MB",
};

function slotDurationLabel(secs) {
  if (secs === 15)  return "15-second";
  if (secs === 30)  return "30-second";
  if (secs === 60)  return "60-second";
  if (secs === 120) return "2-minute";
  return `${secs}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return "TBC";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

// Assemble all data relevant to a partner + event into a structured context object
// for feeding to the AI prompt. Python handles calculations; AI handles language.
function buildBriefContext({ partner, event, allocations, content, eventTemplates }) {
  // Partner allocations for this event
  const partnerAllocs = allocations.filter(
    a => a.partnerId === partner.id && a.eventId === event.id
  );

  // Partner content items
  const partnerContent = content.filter(c => c.partnerId === partner.id);
  const approvedContent = partnerContent.filter(c => c.status === "approved");
  const pendingContent  = partnerContent.filter(c => c.status === "pending" || c.status === "under_review");
  const rejectedContent = partnerContent.filter(c => c.status === "rejected");

  // Match event to template for state/format requirements
  const template = eventTemplates?.find(t => t.id === event.eventType || t.id === "afl_football");
  const states   = template?.states || [];

  // Per-allocation asset requirements — what format does each allocation need?
  const assetRequirements = partnerAllocs.map(alloc => {
    const state = states.find(s => s.id === alloc.stateId) || null;
    const hasApprovedAsset = approvedContent.some(c =>
      c.allocationId === alloc.id ||
      (state && c.format === state.defaultFormat)
    );
    return {
      allocationId: alloc.id,
      stateLabel:   state?.label || alloc.stateId || "General rotation",
      slotCount:    alloc.slotCount || state?.slotCount || 0,
      slotDuration: state?.slotDurationSecs || 30,
      format:       state?.defaultFormat || "fullscreen",
      isInPlay:     state?.isInPlay || false,
      hasAsset:     hasApprovedAsset,
      status:       alloc.status,
    };
  });

  // Unique formats needed
  const formatsNeeded = [...new Set(assetRequirements.map(r => r.format))];

  // Gap analysis — which allocations have no approved asset
  const gaps = assetRequirements.filter(r => !r.hasAsset);

  return {
    partner,
    event,
    template,
    partnerAllocs,
    approvedContent,
    pendingContent,
    rejectedContent,
    assetRequirements,
    formatsNeeded,
    gaps,
    hasGaps: gaps.length > 0,
    totalSlots: assetRequirements.reduce((a, r) => a + r.slotCount, 0),
  };
}

// Build the AI prompt from the structured context
function buildPrompt(ctx) {
  const { partner, event, assetRequirements, formatsNeeded, gaps, approvedContent, pendingContent } = ctx;

  const requirementLines = assetRequirements.map(r =>
    `- ${r.stateLabel}: ${r.slotCount} × ${slotDurationLabel(r.slotDuration)} slots, format: ${FORMAT_LABELS[r.format] || r.format}${r.isInPlay ? " (IN-PLAY — game visible, L-wrap creative required)" : ""}. Status: ${r.hasAsset ? "✓ Asset approved" : "⚠ Asset needed"}`
  ).join("\n");

  const formatSpecLines = formatsNeeded.map(f =>
    `- ${FORMAT_LABELS[f] || f}: ${FORMAT_SPECS[f] || "Contact venue for specifications"}`
  ).join("\n");

  const approvedLines = approvedContent.length > 0
    ? approvedContent.map(c => `- "${c.filename || c.title || "Unnamed"}" (${c.format || "fullscreen"}) — approved`).join("\n")
    : "None currently approved.";

  const pendingLines = pendingContent.length > 0
    ? pendingContent.map(c => `- "${c.filename || c.title || "Unnamed"}" — under review`).join("\n")
    : "None pending.";

  const gapLines = gaps.length > 0
    ? gaps.map(g => `- ${g.stateLabel}: ${FORMAT_LABELS[g.format] || g.format}, ${slotDurationLabel(g.slotDuration)}`).join("\n")
    : "All allocations have approved assets.";

  return `You are a venue commercial content coordinator writing a professional creative brief for a commercial partner.

Write a partner brief for ${partner.label || partner.name} for the following event:

EVENT: ${event.name || event.label}
DATE: ${formatDate(event.date)}
VENUE: Adelaide Oval

PARTNER ALLOCATION SUMMARY:
${requirementLines}

CURRENT ASSET STATUS:
Approved and ready:
${approvedLines}

Under review:
${pendingLines}

CONTENT GAPS (assets still needed):
${gapLines}

TECHNICAL SPECIFICATIONS FOR REQUIRED FORMATS:
${formatSpecLines}

Write a professional, clear partner brief that:
1. Opens with a friendly but professional greeting and event context
2. Summarises what the partner has contracted (slots, states, formats) in plain language — avoid jargon
3. Lists what creative assets are needed, with exact specifications, clearly flagging which are urgent
4. Explains any in-play format constraints in plain language (no jargon — say "the creative needs to leave space for the game broadcast" not "L-wrap safe zone compliance")
5. States the asset submission deadline (use "as soon as possible, and no later than 5 business days before the event" if no specific deadline is provided)
6. Provides a clear next steps section
7. Closes professionally

Tone: professional but warm. This is a commercial partnership — the partner is a valued customer.
Format: use clear headings and short paragraphs. Do not use bullet points for the main content sections — prose only. Asset requirement tables or lists are acceptable where they genuinely aid clarity.
Length: comprehensive but not padded. Every sentence should earn its place.

Return only the brief text. No preamble, no explanation of what you're doing.`;
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Btn({ onClick, variant = "default", disabled, children, small }) {
  const styles = {
    default: { background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)" },
    primary: { background: "var(--color-text-primary)", border: "0.5px solid var(--color-border-primary)", color: "var(--color-background-primary)" },
    ghost:   { background: "none", border: "none", color: "var(--color-text-secondary)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "4px 10px" : "7px 16px",
      borderRadius: "var(--border-radius-md)",
      fontSize: small ? 12 : 13,
      fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ fontFamily: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: value ? "var(--color-text-primary)" : "var(--color-text-secondary)", minWidth: 200 }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function StatusPill({ ok, children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
      background: ok ? "#EAF3DE" : "#FAEEDA",
      color:      ok ? "#3B6D11" : "#854F0B" }}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: accent ? "#EAF3DE" : "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: accent ? "#3B6D11" : "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: accent ? "#27500A" : "var(--color-text-primary)", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: accent ? "#3B6D11" : "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Context summary panel ─────────────────────────────────────────────────────

function ContextSummary({ ctx }) {
  const { assetRequirements, gaps, approvedContent, totalSlots, event, template } = ctx;

  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Brief context — {event.name || event.label}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total slots" value={totalSlots} sub={`across ${assetRequirements.length} allocation${assetRequirements.length !== 1 ? "s" : ""}`} />
        <MetricCard label="Assets approved" value={approvedContent.length} sub="ready for play" accent={approvedContent.length > 0} />
        <MetricCard label="Assets needed" value={gaps.length} sub="content gaps" accent={gaps.length === 0} />
        <MetricCard label="Event date" value={event.date ? new Date(event.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "TBC"} sub={template?.label || "Event"} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {assetRequirements.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <StatusPill ok={r.hasAsset}>{r.hasAsset ? "✓ Ready" : "⚠ Needed"}</StatusPill>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{r.stateLabel}</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{r.slotCount} × {slotDurationLabel(r.slotDuration)} · {FORMAT_LABELS[r.format] || r.format}</span>
            {r.isInPlay && <span style={{ fontSize: 11, color: "#854F0B", background: "#FAEEDA", padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>in-play</span>}
          </div>
        ))}
        {assetRequirements.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>No allocations found for this partner and event.</p>
        )}
      </div>
    </div>
  );
}

// ── Brief editor ──────────────────────────────────────────────────────────────

function BriefEditor({ briefText, onChange, onCopy, copied }) {
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Generated brief — edit before sending</span>
        <Btn small onClick={onCopy} variant="default">
          {copied ? "✓ Copied" : "Copy to clipboard"}
        </Btn>
      </div>
      <textarea
        value={briefText}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          minHeight: 480, padding: "16px 18px",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 14, lineHeight: 1.7,
          color: "var(--color-text-primary)",
          background: "var(--color-background-primary)",
          border: "none", outline: "none", resize: "vertical",
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OperatorBriefGenerator({ partners, events, allocations, content, eventTemplates }) {
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [selectedEventId,   setSelectedEventId]   = useState("");
  const [briefText,         setBriefText]         = useState("");
  const [isGenerating,      setIsGenerating]      = useState(false);
  const [error,             setError]             = useState(null);
  const [copied,            setCopied]            = useState(false);
  const [hasGenerated,      setHasGenerated]      = useState(false);
  const briefRef = useRef(null);

  const partner = partners.find(p => p.id === selectedPartnerId) || null;
  const event   = events.find(e => e.id === selectedEventId || e.id === Number(selectedEventId)) || null;

  // Filter events that have allocations for the selected partner
  const partnerEvents = useMemo(() => {
    if (!selectedPartnerId) return events;
    const eventIds = new Set(
      allocations
        .filter(a => a.partnerId === selectedPartnerId)
        .map(a => String(a.eventId))
    );
    return events.filter(e => eventIds.has(String(e.id)));
  }, [selectedPartnerId, events, allocations]);

  const ctx = useMemo(() => {
    if (!partner || !event) return null;
    return buildBriefContext({ partner, event, allocations, content, eventTemplates });
  }, [partner, event, allocations, content, eventTemplates]);

  const canGenerate = partner && event && ctx && ctx.partnerAllocs.length > 0;

  const handleGenerate = async () => {
    if (!ctx) return;
    setIsGenerating(true);
    setError(null);
    setBriefText("");
    setHasGenerated(false);

    try {
      const prompt = buildPrompt(ctx);

      const response = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `API error ${response.status}`);
      }

      const text = data.content
        ?.filter(b => b.type === "text")
        .map(b => b.text)
        .join("") || "";

      setBriefText(text);
      setHasGenerated(true);

      // Scroll to brief after generation
      setTimeout(() => briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    } catch (err) {
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(briefText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Reset brief when partner or event changes
  const handlePartnerChange = v => {
    setSelectedPartnerId(v);
    setSelectedEventId("");
    setBriefText("");
    setHasGenerated(false);
    setError(null);
  };

  const handleEventChange = v => {
    setSelectedEventId(v);
    setBriefText("");
    setHasGenerated(false);
    setError(null);
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 820 }}>

      {/* Page header */}
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>
        Partner brief generation
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Select a partner and event to generate a creative brief. Review and edit before sending to the partner's marketing team.
      </p>

      {/* Selector row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24, padding: "16px 18px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)" }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Partner</label>
          <Select
            value={selectedPartnerId}
            onChange={handlePartnerChange}
            placeholder="Select partner…"
            options={partners.filter(p => !p.placeholder).map(p => ({ value: p.id, label: p.label || p.name }))}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Event</label>
          <Select
            value={selectedEventId}
            onChange={handleEventChange}
            placeholder={selectedPartnerId ? (partnerEvents.length === 0 ? "No events found" : "Select event…") : "Select partner first…"}
            options={partnerEvents.map(e => ({ value: String(e.id), label: `${e.name || e.label}${e.date ? ` — ${new Date(e.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}` }))}
          />
        </div>

        <div style={{ marginLeft: "auto", paddingBottom: 1 }}>
          <Btn
            variant="primary"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
          >
            {isGenerating ? (
              <>
                <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Generating…
              </>
            ) : hasGenerated ? "Regenerate brief" : "Generate brief"}
          </Btn>
        </div>
      </div>

      {/* No allocations warning */}
      {partner && event && ctx && ctx.partnerAllocs.length === 0 && (
        <div style={{ padding: "14px 16px", borderRadius: "var(--border-radius-md)", background: "#FAEEDA", border: "0.5px solid #F0C070", fontSize: 13, color: "#854F0B", marginBottom: 20 }}>
          No allocations found for <strong>{partner.label || partner.name}</strong> at <strong>{event.name || event.label}</strong>. Set up allocations in Event Setup before generating a brief.
        </div>
      )}

      {/* Context summary — shown when partner + event selected */}
      {ctx && ctx.partnerAllocs.length > 0 && (
        <ContextSummary ctx={ctx} />
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: "14px 16px", borderRadius: "var(--border-radius-md)", background: "#FCEBEB", border: "0.5px solid #E8A0A0", fontSize: 13, color: "#A32D2D", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Generating skeleton */}
      {isGenerating && (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
            Generating brief…
          </div>
          <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[80, 60, 90, 50, 70, 40, 85].map((w, i) => (
              <div key={i} style={{ height: 14, borderRadius: 4, background: "var(--color-background-secondary)", width: `${w}%`, animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* Generated brief editor */}
      {hasGenerated && !isGenerating && (
        <div ref={briefRef}>
          <BriefEditor briefText={briefText} onChange={setBriefText} onCopy={handleCopy} copied={copied} />
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 10 }}>
            AI-generated draft. Review all asset specifications, deadlines, and partner details before sending. Edit the text above directly.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
