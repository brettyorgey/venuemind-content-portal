import { useState, useMemo, useRef, useEffect } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "TBC";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}

function slotDurationLabel(secs) {
  if (secs === 15)  return "15s";
  if (secs === 30)  return "30s";
  if (secs === 60)  return "60s";
  if (secs === 120) return "2min";
  return `${secs}s`;
}

// Enrich synthetic PoP records with zone/state labels where missing
function enrichPopRecords(records, eventId, partnerId) {
  return records.filter(r =>
    (!eventId  || String(r.eventId)  === String(eventId)) &&
    (!partnerId || String(r.partnerId) === String(partnerId))
  );
}

// Serialise PoP records into a compact, AI-readable summary
function buildPopSummary(popRecords, partner, event, eventTemplates) {
  if (!popRecords || popRecords.length === 0) {
    return "No proof of play records found for this partner and event.";
  }

  const template = eventTemplates?.find(t =>
    t.id === event?.eventType || t.id === "afl_football"
  );

  // Group by zone then state
  const byZone = {};
  for (const r of popRecords) {
    const zone = r.zoneId || r.zone || "Unknown zone";
    if (!byZone[zone]) byZone[zone] = [];
    byZone[zone].push(r);
  }

  const lines = [`EVENT: ${event?.name || event?.label || "Unknown event"}`];
  lines.push(`DATE: ${formatDate(event?.date)}`);
  lines.push(`PARTNER: ${partner?.label || partner?.name || "Unknown partner"}`);
  lines.push(`TOTAL RECORDS: ${popRecords.length}`);
  lines.push("");
  lines.push("PROOF OF PLAY BREAKDOWN:");

  for (const [zone, records] of Object.entries(byZone)) {
    const totalPlays       = records.reduce((a, r) => a + (r.playsDelivered || r.plays || 0), 0);
    const totalContracted  = records.reduce((a, r) => a + (r.slotsContracted || r.contracted || 0), 0);
    const totalDelivered   = records.reduce((a, r) => a + (r.slotsDelivered || r.delivered || totalPlays), 0);
    const deliveryRate     = totalContracted > 0 ? Math.round((totalDelivered / totalContracted) * 100) : 100;

    lines.push(`\nZone: ${zone}`);
    lines.push(`  Total plays: ${totalPlays}`);
    lines.push(`  Contracted slots: ${totalContracted}`);
    lines.push(`  Delivered slots: ${totalDelivered}`);
    lines.push(`  Delivery rate: ${deliveryRate}%`);

    // Per-state breakdown if available
    const byState = {};
    for (const r of records) {
      const state = r.stateId || r.state || r.stateLabel || "General";
      if (!byState[state]) byState[state] = [];
      byState[state].push(r);
    }
    for (const [state, stRecs] of Object.entries(byState)) {
      const statePlays      = stRecs.reduce((a, r) => a + (r.playsDelivered || r.plays || 0), 0);
      const stateContracted = stRecs.reduce((a, r) => a + (r.slotsContracted || r.contracted || 0), 0);
      const stateInfo       = template?.states?.find(s => s.id === state || s.label === state);
      const durLabel        = stateInfo ? slotDurationLabel(stateInfo.slotDurationSecs || 30) : "30s";
      lines.push(`    ${state}: ${statePlays} plays, ${stateContracted} contracted, ${durLabel} slots`);
    }
  }

  // Content performance if available
  const contentBreakdown = {};
  for (const r of popRecords) {
    const key = r.contentTitle || r.filename || r.contentId || "Unknown creative";
    if (!contentBreakdown[key]) contentBreakdown[key] = 0;
    contentBreakdown[key] += (r.playsDelivered || r.plays || 0);
  }
  if (Object.keys(contentBreakdown).length > 0) {
    lines.push("\nCREATIVE PERFORMANCE:");
    for (const [title, plays] of Object.entries(contentBreakdown)) {
      lines.push(`  "${title}": ${plays} plays`);
    }
  }

  return lines.join("\n");
}

// Build the system prompt — this stays constant for the conversation session
function buildSystemPrompt(partner, event, popSummary) {
  return `You are a helpful commercial performance assistant for ${partner?.label || partner?.name || "a venue commercial partner"} at Adelaide Oval.

Your role is to help the partner understand their proof of play data — how their advertising content performed across the venue's digital signage network during the event.

You have access to the following proof of play data for this event:

${popSummary}

Guidelines for your responses:
- Be conversational, clear, and helpful. This is a commercial partner — treat them as a valued customer.
- Explain performance in plain business language. Avoid technical jargon.
- When discussing delivery rates, frame them positively where performance is strong, and constructively where there are gaps.
- If asked about data you don't have, say so clearly rather than guessing.
- Keep responses concise — 2-4 short paragraphs unless the partner asks for detail.
- Where relevant, highlight standout performances (best-performing zone, state, or creative).
- If the partner asks about ROI or commercial value, you can discuss it in terms of audience reach and slot delivery, but do not speculate on revenue figures you don't have.
- You cannot make changes to allocations or bookings — direct those requests to the venue commercial team.`;
}

// ── Synthetic PoP data enrichment ─────────────────────────────────────────────
// Generates richer synthetic records if the existing ones lack zone/state detail

function generateRichPopRecords(partnerId, eventId) {
  const zones  = ["Concourse A / B / C", "Gate 1 Entry", "Members Bar", "Corporate Suites"];
  const states = [
    { id: "gates_open",   label: "Gates Open",       contracted: 180, plays: 178, slotDuration: 60 },
    { id: "one_hr_prior", label: "1 Hour Prior",      contracted: 120, plays: 119, slotDuration: 30 },
    { id: "q1",           label: "1st Quarter",       contracted: 50,  plays: 48,  slotDuration: 15 },
    { id: "quarter_time", label: "Quarter Time",      contracted: 12,  plays: 12,  slotDuration: 30 },
    { id: "q2",           label: "2nd Quarter",       contracted: 50,  plays: 50,  slotDuration: 15 },
    { id: "half_time",    label: "Half Time",         contracted: 40,  plays: 40,  slotDuration: 30 },
    { id: "q3",           label: "3rd Quarter",       contracted: 50,  plays: 47,  slotDuration: 15 },
    { id: "three_qtr",    label: "Three Qtr Time",    contracted: 12,  plays: 11,  slotDuration: 30 },
    { id: "q4",           label: "4th Quarter",       contracted: 50,  plays: 50,  slotDuration: 15 },
    { id: "post_game",    label: "Post Game",         contracted: 120, plays: 115, slotDuration: 60 },
  ];
  const creatives = ["Main brand 60s", "Half time promo 30s", "In-play ribbon 15s"];

  const records = [];
  for (const zone of zones) {
    for (const state of states) {
      // Only include states the partner has allocations for (simplified: all)
      const creative = state.id.includes("q") && !state.id.includes("quarter_time")
        ? creatives[2]
        : state.id === "half_time" ? creatives[1] : creatives[0];
      records.push({
        partnerId,
        eventId,
        zoneId:         zone,
        stateId:        state.id,
        stateLabel:     state.label,
        slotsContracted: state.contracted,
        slotsDelivered:  state.plays,
        playsDelivered:  state.plays,
        contentTitle:    creative,
        slotDurationSecs: state.slotDuration,
      });
    }
  }
  return records;
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      fontFamily: "inherit", fontSize: 13, padding: "7px 10px",
      borderRadius: "var(--border-radius-md)",
      border: "0.5px solid var(--color-border-secondary)",
      background: "var(--color-background-primary)",
      color: value ? "var(--color-text-primary)" : "var(--color-text-secondary)",
      minWidth: 200,
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ onClick, variant = "default", disabled, children, small }) {
  const styles = {
    default: { background: "none", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)" },
    primary: { background: "#1B2A4A", border: "0.5px solid #1B2A4A", color: "#fff" },
    ghost:   { background: "none", border: "none", color: "var(--color-text-secondary)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "4px 10px" : "7px 16px",
      borderRadius: "var(--border-radius-md)",
      fontSize: small ? 12 : 13, fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10, alignItems: "flex-start", marginBottom: 16,
    }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "#E6F1FB" : "#1B2A4A",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 500,
        color: isUser ? "#185FA5" : "#fff",
      }}>
        {isUser ? "ME" : "VM"}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "75%",
        background: isUser ? "#E6F1FB" : "var(--color-background-secondary)",
        border: `0.5px solid ${isUser ? "#B8D4F0" : "var(--color-border-tertiary)"}`,
        borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
        padding: "10px 14px",
      }}>
        {message.isLoading ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--color-text-tertiary)",
                animation: `popBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <p style={{
            margin: 0, fontSize: 13, lineHeight: 1.65,
            color: isUser ? "#185FA5" : "var(--color-text-primary)",
            whiteSpace: "pre-wrap",
          }}>
            {message.content}
          </p>
        )}
        {message.timestamp && !message.isLoading && (
          <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--color-text-tertiary)", textAlign: isUser ? "left" : "right" }}>
            {message.timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "How did my content perform overall?",
  "Which zone delivered the strongest results?",
  "Were all my contracted slots delivered?",
  "How did my Half Time slots perform?",
  "Which creative got the most plays?",
  "Were there any delivery shortfalls I should know about?",
];

function SuggestedQuestions({ onSelect, disabled }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Suggested questions
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SUGGESTED_QUESTIONS.map(q => (
          <button key={q} onClick={() => onSelect(q)} disabled={disabled} style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 20, padding: "5px 12px",
            fontSize: 12, color: "var(--color-text-secondary)",
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: disabled ? 0.5 : 1,
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { if (!disabled) { e.target.style.background = "#1B2A4A"; e.target.style.color = "#fff"; e.target.style.borderColor = "#1B2A4A"; } }}
            onMouseLeave={e => { e.target.style.background = "var(--color-background-secondary)"; e.target.style.color = "var(--color-text-secondary)"; e.target.style.borderColor = "var(--color-border-tertiary)"; }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Stats summary bar ─────────────────────────────────────────────────────────

function PopStatBar({ popRecords, event }) {
  const totalContracted = popRecords.reduce((a, r) => a + (r.slotsContracted || r.contracted || 0), 0);
  const totalDelivered  = popRecords.reduce((a, r) => a + (r.slotsDelivered  || r.delivered  || r.playsDelivered || r.plays || 0), 0);
  const deliveryRate    = totalContracted > 0 ? Math.round((totalDelivered / totalContracted) * 100) : 0;
  const zones           = [...new Set(popRecords.map(r => r.zoneId || r.zone || "Unknown"))];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
      gap: 8, padding: "12px 14px",
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-md)", marginBottom: 16,
    }}>
      {[
        { label: "Contracted",    value: totalContracted.toLocaleString(), sub: "slots" },
        { label: "Delivered",     value: totalDelivered.toLocaleString(),  sub: "slots" },
        { label: "Delivery rate", value: `${deliveryRate}%`, sub: deliveryRate >= 95 ? "on target" : "review needed", accent: deliveryRate >= 95 },
        { label: "Zones covered", value: zones.length, sub: "screen groups" },
      ].map(m => (
        <div key={m.label}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{m.label}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: m.accent ? "#3B6D11" : "var(--color-text-primary)", lineHeight: 1.2 }}>{m.value}</div>
          <div style={{ fontSize: 10, color: m.accent ? "#3B6D11" : "var(--color-text-tertiary)" }}>{m.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PartnerPoPChat({ partner, events, allocations, popRecords: rawPopRecords, eventTemplates }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState("");
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [summary,         setSummary]         = useState(null);
  const [isSummarising,   setIsSummarising]   = useState(false);
  const [summaryCopied,   setSummaryCopied]   = useState(false);
  const summaryRef = useRef(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const event = events.find(e =>
    String(e.id) === String(selectedEventId)
  ) || null;

  // Filter events this partner has allocations for
  const partnerEvents = useMemo(() => {
    const eventIds = new Set(
      allocations
        .filter(a => a.partnerId === partner?.id)
        .map(a => String(a.eventId))
    );
    return events.filter(e => eventIds.has(String(e.id)));
  }, [partner, events, allocations]);

  // Get PoP records — use rich synthetic data for prototype fidelity
  const popRecords = useMemo(() => {
    if (!selectedEventId || !partner) return [];
    // Try existing records first
    const existing = enrichPopRecords(rawPopRecords || [], selectedEventId, partner.id);
    // Fall back to rich synthetic records if none found or they lack zone detail
    if (existing.length === 0 || !existing[0]?.zoneId) {
      return generateRichPopRecords(partner.id, selectedEventId);
    }
    return existing;
  }, [selectedEventId, partner, rawPopRecords]);

  // System prompt — assembled once per event selection, stable for the conversation
  const systemPrompt = useMemo(() => {
    if (!partner || !event) return "";
    const summary = buildPopSummary(popRecords, partner, event, eventTemplates);
    return buildSystemPrompt(partner, event, summary);
  }, [partner, event, popRecords, eventTemplates]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEventChange = v => {
    setSelectedEventId(v);
    setMessages([]);
    setInput("");
    setError(null);
    setShowSuggestions(true);
    setSummary(null);
  };

  const timestamp = () => new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading || !event) return;

    setInput("");
    setShowSuggestions(false);
    setError(null);

    const userMessage = { role: "user", content: userText, timestamp: timestamp() };
    const loadingMessage = { role: "assistant", content: "", isLoading: true };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    // Build conversation history for API — all prior turns plus new user message
    const history = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    try {
      const response = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `API error ${response.status}`);
      }

      const replyText = data.content
        ?.filter(b => b.type === "text")
        .map(b => b.text)
        .join("") || "";

      setMessages(prev => [
        ...prev.slice(0, -1), // remove loading bubble
        { role: "assistant", content: replyText, timestamp: timestamp() },
      ]);

    } catch (err) {
      setMessages(prev => prev.slice(0, -1)); // remove loading bubble
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSummarise = async () => {
    if (messages.length < 2 || isSummarising) return;
    setIsSummarising(true);
    setSummary(null);

    const conversationText = messages
      .filter(m => !m.isLoading)
      .map(m => `${m.role === "user" ? "Partner" : "VenueMind"}: ${m.content}`)
      .join("\n\n");

    try {
      const response = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Summarise the following proof of play performance conversation into a concise internal report that the partner can share with their marketing team. 

The summary should:
- Open with the event name and date if mentioned
- Cover the key performance highlights discussed
- Note any delivery shortfalls or issues raised
- Include any specific figures or zones mentioned
- Close with any next steps or action items discussed
- Be written in third person, professional tone, suitable for internal distribution
- Be concise — no more than 250 words

CONVERSATION:
${conversationText}`,
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `API error ${response.status}`);

      const text = data.content
        ?.filter(b => b.type === "text")
        .map(b => b.text)
        .join("") || "";

      setSummary(text);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    } catch (err) {
      setSummary(`Summary generation failed: ${err.message}`);
    } finally {
      setIsSummarising(false);
    }
  };

  const handleCopySummary = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(() => {
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    });
  };

  const canChat = !!event && popRecords.length > 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 780 }}>

      {/* Header */}
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>
        Performance chat
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Ask questions about your proof of play data in plain language.
      </p>

      {/* Event selector */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap",
        marginBottom: 20, padding: "14px 16px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-lg)",
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Select event
          </label>
          <Select
            value={selectedEventId}
            onChange={handleEventChange}
            placeholder={partnerEvents.length === 0 ? "No events found" : "Choose an event to review…"}
            options={partnerEvents.map(e => ({
              value: String(e.id),
              label: `${e.name || e.label}${e.date ? ` — ${new Date(e.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}`,
            }))}
          />
        </div>
        {messages.length > 0 && (
          <Btn small onClick={() => { setMessages([]); setShowSuggestions(true); setError(null); setSummary(null); }}>
            Clear conversation
          </Btn>
        )}
      </div>

      {/* No event selected */}
      {!event && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
          Select an event above to start reviewing your performance data.
        </div>
      )}

      {/* Event selected — stats + chat */}
      {event && popRecords.length > 0 && (
        <>
          {/* Stats bar */}
          <PopStatBar popRecords={popRecords} event={event} />

          {/* Conversation */}
          <div style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            overflow: "hidden",
          }}>
            {/* Chat header */}
            <div style={{
              padding: "10px 14px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B6D11" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", flex: 1 }}>
                {event.name || event.label} · {popRecords.length} records loaded
              </span>
              {messages.filter(m => !m.isLoading).length >= 2 && (
                <Btn small onClick={handleSummarise} disabled={isSummarising}>
                  {isSummarising ? (
                    <>
                      <span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid rgba(0,0,0,0.2)", borderTopColor: "var(--color-text-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Summarising…
                    </>
                  ) : "Summarise conversation"}
                </Btn>
              )}
            </div>

            {/* Messages area */}
            <div style={{
              minHeight: 300, maxHeight: 420,
              overflowY: "auto", padding: "16px 14px",
              background: "var(--color-background-primary)",
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                  Ask a question below to start reviewing your performance data.
                </div>
              )}
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: "0 14px 10px", padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "#FCEBEB", border: "0.5px solid #E8A0A0", fontSize: 12, color: "#A32D2D" }}>
                {error}
              </div>
            )}

            {/* Input area */}
            <div style={{
              padding: "12px 14px",
              borderTop: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
            }}>
              {showSuggestions && messages.length === 0 && (
                <SuggestedQuestions onSelect={q => sendMessage(q)} disabled={isLoading} />
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your performance data…"
                  disabled={isLoading}
                  rows={1}
                  style={{
                    flex: 1, fontFamily: "inherit", fontSize: 13,
                    padding: "8px 12px", borderRadius: "var(--border-radius-md)",
                    border: "0.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-primary)",
                    resize: "none", outline: "none",
                    lineHeight: 1.5, minHeight: 36,
                  }}
                />
                <Btn
                  variant="primary"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  ) : "Send"}
                </Btn>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--color-text-tertiary)" }}>
                Enter to send · Shift+Enter for new line · Conversation history maintained within this session
              </p>
            </div>
          </div>

          {/* Conversation summary panel */}
          {summary && (
            <div ref={summaryRef} style={{
              marginTop: 16,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-secondary)",
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Conversation summary — ready to share
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small onClick={handleSummarise} disabled={isSummarising}>Regenerate</Btn>
                  <Btn small variant="primary" onClick={handleCopySummary}>
                    {summaryCopied ? "✓ Copied" : "Copy to clipboard"}
                  </Btn>
                </div>
              </div>
              <div style={{ padding: "16px 18px", background: "var(--color-background-primary)" }}>
                <p style={{
                  margin: 0, fontSize: 13, lineHeight: 1.7,
                  color: "var(--color-text-primary)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}>
                  {summary}
                </p>
              </div>
              <div style={{ padding: "8px 14px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                  AI-generated summary of your performance conversation. Review before sharing internally.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes popBounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
      `}</style>
    </div>
  );
}
