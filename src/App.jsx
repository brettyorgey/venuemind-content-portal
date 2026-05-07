import { useState, useEffect, useCallback } from "react";
import {
  BASE_PARTNERS,
  PARTNERS_DATA,
  INITIAL_CONTENT,
  INITIAL_CAMPAIGNS,
  SEPARATION_RULES,
  getMomentTypesForEvent,
  buildDefaultMoments,
  generatePopRecords,
} from "./data/constants";
import { api } from "./api";
import { PartnerAvatar } from "./components/SharedComponents";
import { PartnerDashboard, PartnerUpload, PartnerLibrary, PartnerDetail, PartnerPoP } from "./components/PartnerScreens";
import { PartnerPoPChat } from "./components/PartnerPoPChat";
import { OperatorDashboard, OperatorReviewQueue, OperatorReviewDetail, OperatorPartners, OperatorPartnerDetail, OperatorRules, OperatorCampaigns } from "./components/OperatorScreens";
import { OperatorEventSetup } from "./components/OperatorEventSetup";
import { OperatorAllocationBuilder } from './components/OperatorAllocationBuilder';
import { OperatorTemplates } from "./components/OperatorTemplates";
import { OperatorBriefGenerator } from "./components/OperatorBriefGenerator";
import Header from "./components/Header";

const MOCK_POP = generatePopRecords();

// ── CDP-030 seed data ─────────────────────────────────────────────────────────
const SEED_TEMPLATES = [
  {
    id: "afl_football",
    label: "AFL Football",
    sport: "AFL",
    status: "active",
    notes: "Full AFL game format",
    momentTypes: [
      { id: 'goal',   label: 'Goal Replay',   icon: '⚽', defaultFormat: 'lwrap', notes: 'Triggered on every goal — highest frequency, highest value' },
      { id: 'mark',   label: 'Mark Replay',   icon: '🤚', defaultFormat: 'lwrap', notes: 'Triggered on spectacular marks' },
      { id: 'tackle', label: 'Tackle Replay', icon: '💪', defaultFormat: 'lwrap', notes: 'Triggered on highlight tackles' },
      { id: 'behind', label: 'Behind',        icon: '🎯', defaultFormat: 'lwrap', notes: 'Triggered on behinds — high frequency, lower commercial value' },
    ],
    states: [
      { id: "gates_open",   label: "Gates Open (1.5 hr)",  durationSecs: 5400, slotCount: 180, slotDurationSecs: 60, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "high",   sortOrder: 0, notes: "Highest dwell — branding and F&B promotions" },
      { id: "one_hr_prior", label: "1 Hour Prior",         durationSecs: 3600, slotCount: 120, slotDurationSecs: 30, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", sortOrder: 1, notes: "Club content primary, commercial secondary" },
      { id: "q1",           label: "1st Quarter",          durationSecs: 1500, slotCount: 50,  slotDurationSecs: 15, defaultFormat: "lwrap",      isInPlay: true,  commercialPriority: "low",    sortOrder: 2, notes: "In-play — creative must allow game visibility" },
      { id: "quarter_time", label: "Quarter Time Break",   durationSecs: 360,  slotCount: 12,  slotDurationSecs: 30, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", sortOrder: 3, notes: "Short but captive — fan engagement and F&B" },
      { id: "q2",           label: "2nd Quarter",          durationSecs: 1500, slotCount: 50,  slotDurationSecs: 15, defaultFormat: "lwrap",      isInPlay: true,  commercialPriority: "low",    sortOrder: 4, notes: "In-play — creative must allow game visibility" },
      { id: "half_time",    label: "Half Time",            durationSecs: 1200, slotCount: 40,  slotDurationSecs: 30, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "high",   sortOrder: 5, notes: "Longest break — highest commercial value state" },
      { id: "q3",           label: "3rd Quarter",          durationSecs: 1500, slotCount: 50,  slotDurationSecs: 15, defaultFormat: "lwrap",      isInPlay: true,  commercialPriority: "low",    sortOrder: 6, notes: "In-play — creative must allow game visibility" },
      { id: "three_qtr",    label: "Three Quarter Time",   durationSecs: 360,  slotCount: 12,  slotDurationSecs: 30, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", sortOrder: 7, notes: "Short but captive — post-game offers" },
      { id: "q4",           label: "4th Quarter",          durationSecs: 1500, slotCount: 50,  slotDurationSecs: 15, defaultFormat: "lwrap",      isInPlay: true,  commercialPriority: "low",    sortOrder: 8, notes: "In-play — creative must allow game visibility" },
      { id: "post_game",    label: "Post Game (1 hr)",     durationSecs: 3600, slotCount: 120, slotDurationSecs: 60, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", sortOrder: 9, notes: "Departing crowd — post-game and F&B offers" },
    ],
  },
  {
    id: "cricket_t20",
    label: "Cricket T20",
    sport: "Cricket",
    status: "draft",
    notes: "T20 format — 20 overs per innings",
    momentTypes: [
      { id: 'six',      label: 'Six',           icon: '6️⃣', defaultFormat: 'lwrap', notes: 'Triggered on every six' },
      { id: 'wicket',   label: 'Wicket',        icon: '🏏', defaultFormat: 'lwrap', notes: 'Triggered on every wicket' },
      { id: 'boundary', label: 'Boundary Four', icon: '4️⃣', defaultFormat: 'lwrap', notes: 'Triggered on boundaries' },
      { id: 'catch',    label: 'Catch',         icon: '🙌', defaultFormat: 'lwrap', notes: 'Triggered on taken catches' },
    ],
    states: [],
  },
  {
    id: "cricket_test",
    label: "Cricket Test / ODI",
    sport: "Cricket",
    status: "draft",
    notes: "Multi-session with lunch and tea intervals",
    momentTypes: [
      { id: 'six',      label: 'Six',           icon: '6️⃣', defaultFormat: 'lwrap',      notes: 'Triggered on every six' },
      { id: 'wicket',   label: 'Wicket',        icon: '🏏', defaultFormat: 'lwrap',      notes: 'Triggered on every wicket' },
      { id: 'boundary', label: 'Boundary Four', icon: '4️⃣', defaultFormat: 'lwrap',      notes: 'Triggered on boundaries' },
      { id: 'century',  label: 'Century',       icon: '💯', defaultFormat: 'fullscreen', notes: 'Triggered on player century' },
    ],
    states: [],
  },
  {
    id: "concert",
    label: "Concert / Live Event",
    sport: "Live Event",
    status: "draft",
    notes: "Pre-show, support, main act, post-show",
    momentTypes: [
      { id: 'encore',    label: 'Encore',    icon: '🎤', defaultFormat: 'fullscreen', notes: 'Triggered at encore' },
      { id: 'highlight', label: 'Highlight', icon: '⭐', defaultFormat: 'lwrap',      notes: 'Triggered on key song moments' },
    ],
    states: [],
  },
  {
    id: "function",
    label: "Function / Conference",
    sport: "Function",
    status: "active",
    notes: "Hosted function or conference — pre-function, main, break, post-function states",
    momentTypes: [
      { id: 'speaker',    label: 'Speaker Introduction', icon: '🎙️', defaultFormat: 'fullscreen', notes: 'Triggered when a new speaker is introduced' },
      { id: 'award',      label: 'Award Presentation',   icon: '🏆', defaultFormat: 'fullscreen', notes: 'Triggered during award or recognition moments' },
      { id: 'sponsor',    label: 'Sponsor Recognition',  icon: '⭐', defaultFormat: 'fullscreen', notes: 'Triggered for scheduled sponsor shout-outs' },
      { id: 'networking', label: 'Networking Break',     icon: '🤝', defaultFormat: 'fullscreen', notes: 'Triggered when networking break is announced' },
    ],
    states: [],
  },
  {
    id: "non_event",
    label: "Non-event / Background",
    sport: "Background",
    status: "active",
    notes: "Single hourly rotation — no matrix, no states",
    momentTypes: [],
    states: [
      { id: "background", label: "Background rotation", durationSecs: 3600, slotCount: 120, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", sortOrder: 0, notes: "Standard 60-minute loop" },
    ],
  },
];

const SEED_ZONES = [
  { id: "concourse",      label: "Concourse A / B / C",  dmpPattern: "DMP-CA-*, DMP-CB-*, DMP-CC-*", pricingTier: "standard",  ratePerSlot: 15, sortOrder: 0, notes: "In-transit, break dwell time" },
  { id: "gate1",          label: "Gate 1 Entry",          dmpPattern: "DMP-G1-*",                     pricingTier: "premium",   ratePerSlot: 20, sortOrder: 1, notes: "Arriving crowd, peak pre-game exposure" },
  { id: "members_bar",    label: "Members Bar",           dmpPattern: "DMP-MB-*",                     pricingTier: "premium+",  ratePerSlot: 25, sortOrder: 2, notes: "High dwell, high spend, hospitality context" },
  { id: "corp_suites",    label: "Corporate Suites",      dmpPattern: "DMP-CS-*",                     pricingTier: "premium+",  ratePerSlot: 25, sortOrder: 3, notes: "Exclusive audience, high-value partners" },
  { id: "corp_functions", label: "Corporate Functions",   dmpPattern: "DMP-CF-*",                     pricingTier: "standard+", ratePerSlot: 15, sortOrder: 4, notes: "Event-specific, function bookings, variable attendance" },
];

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [role,           setRole]           = useState("partner");
  const [screen,         setScreen]         = useState("p-dashboard");
  const [detailId,       setDetailId]       = useState(null);

  // ── Gate 2: events and allocations now load from Cosmos via API ──────────────
  // loadingData gates the UI until both collections are hydrated on first boot.
  const [events,         setEvents]         = useState([]);
  const [allocations,    setAllocations]    = useState([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [dataError,      setDataError]      = useState(null);

  // ── Still on useState (Gate 2.5) ─────────────────────────────────────────────
  const [content,        setContent]        = useState(INITIAL_CONTENT);
  const [campaigns,      setCampaigns]      = useState(INITIAL_CAMPAIGNS);
  const [partners,       setPartners]       = useState(BASE_PARTNERS);
  const [rules,          setRules]          = useState(SEPARATION_RULES);
  const [eventTemplates, setEventTemplates] = useState(SEED_TEMPLATES);
  const [venueZones,     setVenueZones]     = useState(SEED_ZONES);

  const partner = PARTNERS_DATA.maccas;

  // ── Boot: seed if empty, then load ───────────────────────────────────────────
  // On first load: call seed (no-op if already seeded), then fetch both collections.
  const bootData = useCallback(async () => {
    try {
      setLoadingData(true);
      setDataError(null);

      // Seed is idempotent — safe to call every boot. Returns immediately if already seeded.
      await Promise.all([api.events.seed(), api.allocations.seed()]);

      // Load both collections in parallel
      const [eventsData, allocsData] = await Promise.all([
        api.events.list(),
        api.allocations.list(),
      ]);

      setEvents(eventsData);
      setAllocations(allocsData);
    } catch (err) {
      console.error("Failed to load portal data:", err);
      setDataError("Unable to load event data. Please refresh the page.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { bootData(); }, [bootData]);

  // ── Content handlers ──────────────────────────────────────────────────────

  const handleUpload = (item) => {
    setContent(prev => [{ ...item, id: Date.now(), reviewed: null }, ...prev]);
    if (item.allocationId) {
      const alloc = allocations.find(a => a.id === item.allocationId);
      if (alloc) handleEditAllocation({ ...alloc, status: "under_review" });
    }
  };

  const handleApprove = (id) => {
    setContent(prev => prev.map(c =>
      c.id === id ? { ...c, status: "approved", reviewed: "2026-04-19", rejectReason: undefined } : c
    ));
    const item = content.find(c => c.id === id);
    if (item?.allocationId) {
      const alloc = allocations.find(a => a.id === item.allocationId);
      if (alloc) handleEditAllocation({ ...alloc, status: "approved", contentItemId: id });
    }
    if (item?.partnerId) {
      setCampaigns(prev => prev.map(c => {
        if (c.partnerId !== item.partnerId) return c;
        const updatedPool = (c.contentPool ?? []).map(piece => {
          if (piece.contentId) return piece;
          if (piece.format !== item.format) return piece;
          return { ...piece, contentId: id };
        });
        return { ...c, contentPool: updatedPool };
      }));
    }
  };

  const handleReject = (id, reason) => {
    setContent(prev => prev.map(c =>
      c.id === id ? { ...c, status: "rejected", reviewed: "2026-04-19", rejectReason: reason } : c
    ));
    const item = content.find(c => c.id === id);
    if (item?.allocationId) {
      const alloc = allocations.find(a => a.id === item.allocationId);
      if (alloc) handleEditAllocation({ ...alloc, status: "pending_content", contentItemId: null });
    }
  };

  const handleRemoveFromRotation = (id) => {
    setContent(prev => prev.map(c =>
      c.id === id ? { ...c, status: "pending", reviewed: null } : c
    ));
    const item = content.find(c => c.id === id);
    if (item?.allocationId) {
      const alloc = allocations.find(a => a.id === item.allocationId);
      if (alloc) handleEditAllocation({ ...alloc, status: "under_review", contentItemId: null });
    }
  };

  const handleDelete = (id) => {
    setContent(prev => prev.filter(c => c.id !== id));
  };

  // ── Event handlers — async, API-first ────────────────────────────────────────

  const handleAddEvent = async (event) => {
    const moments = buildDefaultMoments(event.eventType);
    const newEvent = { ...event, moments };
    try {
      const saved = await api.events.create(newEvent);
      setEvents(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to create event:", err);
      // Optimistic fallback — keep local state consistent even if API fails
      setEvents(prev => [...prev, { ...newEvent, venueId: "adelaideoval" }]);
    }
  };

  const handleEditEvent = async (updated) => {
    // Optimistic update — apply immediately, sync in background
    setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    try {
      await api.events.update(updated.id, updated);
    } catch (err) {
      console.error("Failed to update event:", err);
    }
  };

  const handleUpdateEventMoments = async (eventId, moments) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, moments } : e));
    try {
      await api.events.update(eventId, { moments });
    } catch (err) {
      console.error("Failed to update event moments:", err);
    }
  };

  // ── Allocation handlers — async, API-first ────────────────────────────────────

  const handleAddAllocation = async (alloc) => {
    try {
      const saved = await api.allocations.create(alloc);
      setAllocations(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to create allocation:", err);
      setAllocations(prev => [...prev, { ...alloc, venueId: "adelaideoval" }]);
    }
  };

  const handleEditAllocation = async (updated) => {
    setAllocations(prev => prev.map(a => a.id === updated.id ? updated : a));
    try {
      await api.allocations.update(updated.id, updated);
    } catch (err) {
      console.error("Failed to update allocation:", err);
    }
  };

  const handleDeleteAllocation = async (id) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
    try {
      await api.allocations.delete(id);
    } catch (err) {
      console.error("Failed to delete allocation:", err);
    }
  };

  // ── Campaign handlers (unchanged — still useState) ────────────────────────────

  const handleAddCampaign = (campaign) => {
    setCampaigns(prev => [...prev, { ...campaign, id: `cmp-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] }]);
  };

  const handleUpdateCampaign = (updated) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString().split('T')[0] } : c));
  };

  const handleDeleteCampaign = (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const handleAttachEventToCampaign = async (campaignId, eventId) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, eventIds: [...new Set([...(c.eventIds ?? []), eventId])], updatedAt: new Date().toISOString().split('T')[0] };
      }
      if ((c.eventIds ?? []).includes(eventId)) {
        return { ...c, eventIds: c.eventIds.filter(id => id !== eventId), updatedAt: new Date().toISOString().split('T')[0] };
      }
      return c;
    }));
    // Campaign attachment stamps onto the event record
    await handleEditEvent({ id: eventId, campaignId });
  };

  const handleDetachEventFromCampaign = async (campaignId, eventId) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId
        ? { ...c, eventIds: (c.eventIds ?? []).filter(id => id !== eventId), updatedAt: new Date().toISOString().split('T')[0] }
        : c
    ));
    await handleEditEvent({ id: eventId, campaignId: null });
  };

  const handleAddCampaignRule = (campaignId, rule) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId
        ? { ...c, rules: [...(c.rules ?? []), { ...rule, id: `rule-${Date.now()}` }], updatedAt: new Date().toISOString().split('T')[0] }
        : c
    ));
  };

  const handleUpdateCampaignRule = (campaignId, updatedRule) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId
        ? { ...c, rules: (c.rules ?? []).map(r => r.id === updatedRule.id ? updatedRule : r), updatedAt: new Date().toISOString().split('T')[0] }
        : c
    ));
  };

  const handleDeleteCampaignRule = (campaignId, ruleId) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId
        ? { ...c, rules: (c.rules ?? []).filter(r => r.id !== ruleId), updatedAt: new Date().toISOString().split('T')[0] }
        : c
    ));
  };

  const handleUpdateCampaignPool = (campaignId, contentPool) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId
        ? { ...c, contentPool, updatedAt: new Date().toISOString().split('T')[0] }
        : c
    ));
  };

  const handleAddContent = (contentItem) => {
    setContent(prev => [...prev, contentItem]);
  };

  // ── Event priority handlers ───────────────────────────────────────────────────

  const handleUpdateEventPriority = async (eventId, priorityOrder) => {
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, partnerPriority: priorityOrder } : e
    ));
    try {
      await api.events.update(eventId, { partnerPriority: priorityOrder });
    } catch (err) {
      console.error("Failed to update event priority:", err);
    }
  };

  const handleUpdateZonePriority = async (eventId, zoneId, priorityOrder) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const zonePriority = { ...(e.zonePriority ?? {}) };
      if (priorityOrder === null) {
        delete zonePriority[zoneId];
      } else {
        zonePriority[zoneId] = priorityOrder;
      }
      return { ...e, zonePriority };
    }));
    // Read the updated zonePriority from state to persist
    const event = events.find(e => e.id === eventId);
    if (event) {
      const zonePriority = { ...(event.zonePriority ?? {}) };
      if (priorityOrder === null) delete zonePriority[zoneId];
      else zonePriority[zoneId] = priorityOrder;
      try {
        await api.events.update(eventId, { zonePriority });
      } catch (err) {
        console.error("Failed to update zone priority:", err);
      }
    }
  };

  // ── Partners handler (useState — Gate 2.5) ────────────────────────────────────
  const handleAddPartner = (newPartner) => {
    setPartners(prev => [...prev, newPartner]);
  };

  // ── Rules handlers (useState — Gate 2.5) ─────────────────────────────────────
  const handleAddRule = (rule) => {
    setRules(prev => [...prev, { ...rule, id: `rule-${Date.now()}` }]);
  };
  const handleUpdateRule = (updated) => {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
  };
  const handleDeleteRule = (id) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  // ── Template & zone handlers (useState — Gate 2.5) ───────────────────────────
  const handleAddTemplate = (t) => {
    setEventTemplates(prev => [...prev, { ...t, states: [] }]);
  };
  const handleEditTemplate = (t) => {
    setEventTemplates(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x));
  };
  const handleDeleteTemplate = (id) => {
    setEventTemplates(prev => prev.filter(x => x.id !== id));
  };
  const handleUpdateStates = (templateId, states) => {
    setEventTemplates(prev => prev.map(t => t.id === templateId ? { ...t, states } : t));
  };
  const handleUpdateMomentTypes = (templateId, momentTypes) => {
    setEventTemplates(prev => prev.map(t => t.id === templateId ? { ...t, momentTypes } : t));
  };
  const handleAddZone = (z) => {
    setVenueZones(prev => [...prev, z]);
  };
  const handleEditZone = (z) => {
    setVenueZones(prev => prev.map(x => x.id === z.id ? z : x));
  };
  const handleDeleteZone = (id) => {
    setVenueZones(prev => prev.filter(x => x.id !== id));
  };

  // ── Role / nav ────────────────────────────────────────────────────────────────

  const switchRole = (r) => {
    setRole(r);
    setScreen(r === "partner" ? "p-dashboard" : "o-dashboard");
    setDetailId(null);
  };

  const navigate = (s, id) => {
    setScreen(s);
    if (id !== undefined) setDetailId(id);
  };

  const detailItem = content.find(c => c.id === detailId);

  const partnerNav = [
    { key: "p-dashboard", label: "Dashboard" },
    { key: "p-upload",    label: "Upload" },
    { key: "p-library",   label: "Library" },
    { key: "p-pop",       label: "Proof of play" },
    { key: "p-pop-chat",  label: "PoP Chat" },
  ];

  const operatorNav = [
    { key: "o-dashboard",  label: "Dashboard" },
    { key: "o-review",     label: "Review queue" },
    { key: "o-partners",   label: "Partners" },
    { key: "o-campaigns",  label: "Campaigns" },
    { key: "o-rules",      label: "Rules" },
    { key: "o-templates",  label: "Templates" },
    { key: "o-briefs",     label: "Briefs" },
    { key: "o-events",     label: "Event setup" },
    { key: "allocation",   label: "Allocation" },
  ];

  const navItems = role === "partner" ? partnerNav : operatorNav;

  const isActiveNav = (key) => {
    if (screen === key) return true;
    if (key === "p-library"  && screen === "p-detail")         return true;
    if (key === "o-review"   && screen === "o-review-detail")  return true;
    if (key === "o-partners" && screen === "o-partner-detail") return true;
    return false;
  };

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--vm-color-surface)", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--vm-color-border)", borderTopColor: "var(--vm-color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--vm-color-secondary)", fontSize: 14 }}>Loading portal data…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (dataError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--vm-color-surface)", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#791F1F", fontSize: 15 }}>{dataError}</p>
        <button onClick={bootData} style={{ padding: "8px 20px", background: "var(--vm-color-primary)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          Retry
        </button>
      </div>
    );
  }

  // ── Role switcher ─────────────────────────────────────────────────────────────
  const roleSwitcher = (
    <div style={{ display: "flex", gap: 3, background: "var(--color-border-secondary)", borderRadius: 8, padding: 3 }}>
      <button
        onClick={() => switchRole("partner")}
        style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
          background: role === "partner" ? "var(--color-background-primary)" : "transparent",
          color: role === "partner" ? "var(--vm-color-primary)" : "var(--color-text-secondary)",
          boxShadow: role === "partner" ? "0 1px 3px rgba(0,33,55,0.10)" : "none",
        }}
      >Partner view</button>
      <button
        onClick={() => switchRole("operator")}
        style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
          background: role === "operator" ? "var(--color-background-primary)" : "transparent",
          color: role === "operator" ? "var(--vm-color-primary)" : "var(--color-text-secondary)",
          boxShadow: role === "operator" ? "0 1px 3px rgba(0,33,55,0.10)" : "none",
        }}
      >Operator view</button>
    </div>
  );

  // ── User identity pill ────────────────────────────────────────────────────────
  const userPill = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {role === "partner"
        ? <PartnerAvatar partner="maccas" />
        : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--vm-color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>AO</div>
      }
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
        {role === "partner" ? partner.name : "Adelaide Oval"}
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--vm-color-surface)" }}>

      {/* Brand header */}
      <Header
        subProduct={role === "partner" ? "Content Portal" : "Operations"}
        actions={<div style={{ display: "flex", alignItems: "center", gap: 16 }}>{roleSwitcher}{userPill}</div>}
      />

      {/* Content wrapper */}
      <div style={{ flex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, flexWrap: "wrap" }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => navigate(n.key)} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer",
            background: isActiveNav(n.key) ? "var(--vm-color-primary)" : "transparent",
            color: isActiveNav(n.key) ? "#fff" : "var(--color-text-secondary)",
            border: "none",
          }}>
            {n.label}
          </button>
        ))}
      </div>

      {/* Partner screens */}
      {screen === "p-dashboard" && (
        <PartnerDashboard
          partner={partner}
          content={content}
          allocations={allocations}
          events={events}
          onNavigate={navigate}
        />
      )}
      {screen === "p-upload" && (
        <PartnerUpload
          onNavigate={navigate}
          onUpload={handleUpload}
          partnerId="maccas"
          allocations={allocations}
          events={events}
          initialAllocId={detailId}
        />
      )}
      {screen === "p-library" && (
        <PartnerLibrary
          content={content}
          partnerId="maccas"
          allocations={allocations}
          events={events}
          onNavigate={navigate}
        />
      )}
      {screen === "p-detail" && <PartnerDetail item={detailItem} onNavigate={navigate} onDelete={handleDelete} />}
      {screen === "p-pop"     && <PartnerPoP popRecords={MOCK_POP} />}
      {screen === "p-pop-chat" && (
        <PartnerPoPChat
          partner={partner}
          events={events}
          allocations={allocations}
          popRecords={MOCK_POP}
          eventTemplates={eventTemplates}
        />
      )}

      {/* Operator screens */}
      {screen === "o-dashboard" && <OperatorDashboard content={content} onNavigate={navigate} />}
      {screen === "o-review"    && <OperatorReviewQueue content={content} allocations={allocations} events={events} onNavigate={navigate} />}
      {screen === "o-review-detail" && (
        <OperatorReviewDetail
          item={detailItem}
          allocations={allocations}
          events={events}
          onApprove={handleApprove}
          onReject={handleReject}
          onRemoveFromRotation={handleRemoveFromRotation}
          onNavigate={navigate}
        />
      )}
      {screen === "o-partners" && (
        <OperatorPartners
          partners={partners}
          content={content}
          onNavigate={navigate}
          onAddPartner={handleAddPartner}
        />
      )}
      {screen === "o-partner-detail" && (
        <OperatorPartnerDetail
          partnerId={detailId}
          partners={partners}
          content={content}
          events={events}
          allocations={allocations}
          onAddAllocation={handleAddAllocation}
          onNavigate={navigate}
        />
      )}
      {screen === "o-rules" && (
        <OperatorRules
          rules={rules}
          partners={partners}
          onAddRule={handleAddRule}
          onUpdateRule={handleUpdateRule}
          onDeleteRule={handleDeleteRule}
        />
      )}
      {screen === "o-templates" && (
        <OperatorTemplates
          templates={eventTemplates}
          zones={venueZones}
          onAddTemplate={handleAddTemplate}
          onEditTemplate={handleEditTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onUpdateStates={handleUpdateStates}
          onUpdateMomentTypes={handleUpdateMomentTypes}
          onAddZone={handleAddZone}
          onEditZone={handleEditZone}
          onDeleteZone={handleDeleteZone}
        />
      )}
      {screen === "o-briefs" && (
        <OperatorBriefGenerator
          partners={partners}
          events={events}
          allocations={allocations}
          content={content}
          eventTemplates={eventTemplates}
        />
      )}
      {screen === "o-campaigns" && (
        <OperatorCampaigns
          campaigns={campaigns}
          partners={partners}
          events={events}
          content={content}
          onAddCampaign={handleAddCampaign}
          onUpdateCampaign={handleUpdateCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onAttachEvent={handleAttachEventToCampaign}
          onDetachEvent={handleDetachEventFromCampaign}
          onAddRule={handleAddCampaignRule}
          onUpdateRule={handleUpdateCampaignRule}
          onDeleteRule={handleDeleteCampaignRule}
          onUpdateCampaignPool={handleUpdateCampaignPool}
        />
      )}
      {screen === "o-events" && (
        <OperatorEventSetup
          events={events}
          allocations={allocations}
          partners={partners}
          campaigns={campaigns}
          eventTemplates={eventTemplates}
          onAddEvent={handleAddEvent}
          onEditEvent={handleEditEvent}
          onAddAllocation={handleAddAllocation}
          onEditAllocation={handleEditAllocation}
          onDeleteAllocation={handleDeleteAllocation}
          onUpdatePriority={handleUpdateEventPriority}
          onUpdateZonePriority={handleUpdateZonePriority}
          onAddPartner={handleAddPartner}
          onAttachEventToCampaign={handleAttachEventToCampaign}
          onDetachEventFromCampaign={handleDetachEventFromCampaign}
          onUpdateEventMoments={handleUpdateEventMoments}
          onAddContent={handleAddContent}
        />
      )}
      {screen === "allocation" && (
        <OperatorAllocationBuilder
          partners={partners}
          events={events}
          campaigns={campaigns}
          content={content}
          rules={rules}
          onNavigateToEvents={() => navigate('o-events')}
        />
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid var(--color-border-secondary)", fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" }}>
        VenueMind Content Delivery Portal — Prototype v1.0
      </div>

      </div>{/* /content wrapper */}
    </div>
  );
}

export default App;
