import { useState, useEffect, useCallback } from "react";
import {
  PARTNERS_DATA,
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

function App() {
  const [role,           setRole]           = useState("partner");
  const [screen,         setScreen]         = useState("p-dashboard");
  const [detailId,       setDetailId]       = useState(null);

  // ── Gate 2 complete: all eight collections load from Cosmos via API ───────────
  const [events,         setEvents]         = useState([]);
  const [allocations,    setAllocations]    = useState([]);
  const [content,        setContent]        = useState([]);
  const [partners,       setPartners]       = useState([]);
  const [eventTemplates, setEventTemplates] = useState([]);
  const [venueZones,     setVenueZones]     = useState([]);
  const [campaigns,      setCampaigns]      = useState([]);
  const [rules,          setRules]          = useState([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [dataError,      setDataError]      = useState(null);

  const partner = PARTNERS_DATA.maccas;

  // ── Boot: seed if empty, then load all eight collections ─────────────────────
  const bootData = useCallback(async () => {
    try {
      setLoadingData(true);
      setDataError(null);

      // All seeds are idempotent — safe to call every boot
      await Promise.all([
        api.events.seed(),
        api.allocations.seed(),
        api.content.seed(),
        api.partners.seed(),
        api.templates.seed(),
        api.zones.seed(),
        api.campaigns.seed(),
        api.rules.seed(),
      ]);

      // Load all eight collections in parallel
      const [eventsData, allocsData, contentData, partnersData, templatesData, zonesData, campaignsData, rulesData] = await Promise.all([
        api.events.list(),
        api.allocations.list(),
        api.content.list(),
        api.partners.list(),
        api.templates.list(),
        api.zones.list(),
        api.campaigns.list(),
        api.rules.list(),
      ]);

      setEvents(eventsData);
      setAllocations(allocsData);
      setContent(contentData);
      setPartners(partnersData);
      setEventTemplates(templatesData);
      setVenueZones(zonesData);
      setCampaigns(campaignsData);
      setRules(rulesData);
    } catch (err) {
      console.error("Failed to load portal data:", err);
      setDataError("Unable to load event data. Please refresh the page.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { bootData(); }, [bootData]);

  // ── Content handlers — async, API-first ──────────────────────────────────────

  const handleUpload = async (item) => {
    try {
      const saved = await api.content.create({ ...item, reviewed: null });
      setContent(prev => [saved, ...prev]);
      if (item.allocationId) {
        const alloc = allocations.find(a => a.id === item.allocationId);
        if (alloc) await handleEditAllocation({ ...alloc, status: "under_review" });
      }
    } catch (err) {
      console.error("Failed to upload content:", err);
      setContent(prev => [{ ...item, id: `ctn-${Date.now()}`, reviewed: null }, ...prev]);
    }
  };

  const handleApprove = async (id) => {
    const patch = { status: "approved", reviewed: new Date().toISOString().split("T")[0], rejectReason: null };
    setContent(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      await api.content.update(id, patch);
      const item = content.find(c => c.id === id);
      if (item?.allocationId) {
        const alloc = allocations.find(a => a.id === item.allocationId);
        if (alloc) await handleEditAllocation({ ...alloc, status: "approved", contentItemId: id });
      }
      if (item?.partnerId) {
        // Update content pool in any matching campaign — optimistic local update only
        // (campaign contentPool is a display concern, not a critical write path)
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
    } catch (err) {
      console.error("Failed to approve content:", err);
    }
  };

  const handleReject = async (id, reason) => {
    const patch = { status: "rejected", reviewed: new Date().toISOString().split("T")[0], rejectReason: reason };
    setContent(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      await api.content.update(id, patch);
      const item = content.find(c => c.id === id);
      if (item?.allocationId) {
        const alloc = allocations.find(a => a.id === item.allocationId);
        if (alloc) await handleEditAllocation({ ...alloc, status: "pending_content", contentItemId: null });
      }
    } catch (err) {
      console.error("Failed to reject content:", err);
    }
  };

  const handleRemoveFromRotation = async (id) => {
    const patch = { status: "pending", reviewed: null };
    setContent(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      await api.content.update(id, patch);
      const item = content.find(c => c.id === id);
      if (item?.allocationId) {
        const alloc = allocations.find(a => a.id === item.allocationId);
        if (alloc) await handleEditAllocation({ ...alloc, status: "under_review", contentItemId: null });
      }
    } catch (err) {
      console.error("Failed to remove content from rotation:", err);
    }
  };

  const handleDelete = async (id) => {
    setContent(prev => prev.filter(c => c.id !== id));
    try {
      await api.content.delete(id);
    } catch (err) {
      console.error("Failed to delete content:", err);
    }
  };

  const handleAddContent = async (contentItem) => {
    try {
      const saved = await api.content.create(contentItem);
      setContent(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to add content:", err);
      setContent(prev => [...prev, contentItem]);
    }
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
      setEvents(prev => [...prev, { ...newEvent, venueId: "adelaideoval" }]);
    }
  };

  const handleEditEvent = async (updated) => {
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

  // ── Partner handlers — async, API-first ──────────────────────────────────────

  const handleAddPartner = async (newPartner) => {
    try {
      const saved = await api.partners.create(newPartner);
      setPartners(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to add partner:", err);
      setPartners(prev => [...prev, newPartner]);
    }
  };

  // ── Template handlers — async, API-first ─────────────────────────────────────

  const handleAddTemplate = async (t) => {
    try {
      const saved = await api.templates.create({ ...t, states: t.states || [], momentTypes: t.momentTypes || [] });
      setEventTemplates(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to add template:", err);
      setEventTemplates(prev => [...prev, { ...t, states: [] }]);
    }
  };

  const handleEditTemplate = async (t) => {
    setEventTemplates(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x));
    try {
      await api.templates.update(t.id, t);
    } catch (err) {
      console.error("Failed to update template:", err);
    }
  };

  const handleDeleteTemplate = async (id) => {
    setEventTemplates(prev => prev.filter(x => x.id !== id));
    try {
      await api.templates.delete(id);
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  const handleUpdateStates = async (templateId, states) => {
    setEventTemplates(prev => prev.map(t => t.id === templateId ? { ...t, states } : t));
    try {
      await api.templates.update(templateId, { states });
    } catch (err) {
      console.error("Failed to update template states:", err);
    }
  };

  const handleUpdateMomentTypes = async (templateId, momentTypes) => {
    setEventTemplates(prev => prev.map(t => t.id === templateId ? { ...t, momentTypes } : t));
    try {
      await api.templates.update(templateId, { momentTypes });
    } catch (err) {
      console.error("Failed to update template moment types:", err);
    }
  };

  // ── Zone handlers — async, API-first ─────────────────────────────────────────

  const handleAddZone = async (z) => {
    try {
      const saved = await api.zones.create(z);
      setVenueZones(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to add zone:", err);
      setVenueZones(prev => [...prev, z]);
    }
  };

  const handleEditZone = async (z) => {
    setVenueZones(prev => prev.map(x => x.id === z.id ? z : x));
    try {
      await api.zones.update(z.id, z);
    } catch (err) {
      console.error("Failed to update zone:", err);
    }
  };

  const handleDeleteZone = async (id) => {
    setVenueZones(prev => prev.filter(x => x.id !== id));
    try {
      await api.zones.delete(id);
    } catch (err) {
      console.error("Failed to delete zone:", err);
    }
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
      if (priorityOrder === null) delete zonePriority[zoneId];
      else zonePriority[zoneId] = priorityOrder;
      return { ...e, zonePriority };
    }));
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

  // ── Campaign handlers — async, API-first ──────────────────────────────────────

  const handleAddCampaign = async (campaign) => {
    const now = new Date().toISOString().split('T')[0];
    const doc = { ...campaign, id: campaign.id || `cmp-${Date.now()}`, createdAt: now, updatedAt: now };
    try {
      const saved = await api.campaigns.create(doc);
      setCampaigns(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to add campaign:", err);
      setCampaigns(prev => [...prev, doc]);
    }
  };

  const handleUpdateCampaign = async (updated) => {
    const patch = { ...updated, updatedAt: new Date().toISOString().split('T')[0] };
    setCampaigns(prev => prev.map(c => c.id === updated.id ? patch : c));
    try {
      await api.campaigns.update(updated.id, patch);
    } catch (err) {
      console.error("Failed to update campaign:", err);
    }
  };

  const handleDeleteCampaign = async (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    try {
      await api.campaigns.delete(id);
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  };

  const handleAttachEventToCampaign = async (campaignId, eventId) => {
    // Optimistic update — remove event from any other campaign, add to this one
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) return { ...c, eventIds: [...new Set([...(c.eventIds ?? []), eventId])], updatedAt: new Date().toISOString().split('T')[0] };
      if ((c.eventIds ?? []).includes(eventId)) return { ...c, eventIds: c.eventIds.filter(id => id !== eventId), updatedAt: new Date().toISOString().split('T')[0] };
      return c;
    }));
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        const eventIds = [...new Set([...(campaign.eventIds ?? []), eventId])];
        await api.campaigns.update(campaignId, { eventIds });
      }
    } catch (err) {
      console.error("Failed to attach event to campaign:", err);
    }
    await handleEditEvent({ id: eventId, campaignId });
  };

  const handleDetachEventFromCampaign = async (campaignId, eventId) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId
        ? { ...c, eventIds: (c.eventIds ?? []).filter(id => id !== eventId), updatedAt: new Date().toISOString().split('T')[0] }
        : c
    ));
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        const eventIds = (campaign.eventIds ?? []).filter(id => id !== eventId);
        await api.campaigns.update(campaignId, { eventIds });
      }
    } catch (err) {
      console.error("Failed to detach event from campaign:", err);
    }
    await handleEditEvent({ id: eventId, campaignId: null });
  };

  // Campaign rules are embedded in the campaign document — update via campaign PATCH
  const handleAddCampaignRule = async (campaignId, rule) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const newRule  = { ...rule, id: `rule-${Date.now()}` };
    const updated  = { ...campaign, rules: [...(campaign.rules ?? []), newRule], updatedAt: new Date().toISOString().split('T')[0] };
    setCampaigns(prev => prev.map(c => c.id === campaignId ? updated : c));
    try {
      await api.campaigns.update(campaignId, { rules: updated.rules });
    } catch (err) {
      console.error("Failed to add campaign rule:", err);
    }
  };

  const handleUpdateCampaignRule = async (campaignId, updatedRule) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const rules   = (campaign.rules ?? []).map(r => r.id === updatedRule.id ? updatedRule : r);
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, rules, updatedAt: new Date().toISOString().split('T')[0] } : c));
    try {
      await api.campaigns.update(campaignId, { rules });
    } catch (err) {
      console.error("Failed to update campaign rule:", err);
    }
  };

  const handleDeleteCampaignRule = async (campaignId, ruleId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const rules   = (campaign.rules ?? []).filter(r => r.id !== ruleId);
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, rules, updatedAt: new Date().toISOString().split('T')[0] } : c));
    try {
      await api.campaigns.update(campaignId, { rules });
    } catch (err) {
      console.error("Failed to delete campaign rule:", err);
    }
  };

  const handleUpdateCampaignPool = async (campaignId, contentPool) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, contentPool, updatedAt: new Date().toISOString().split('T')[0] } : c
    ));
    try {
      await api.campaigns.update(campaignId, { contentPool });
    } catch (err) {
      console.error("Failed to update campaign pool:", err);
    }
  };

  // ── Separation rules handlers — async, API-first ──────────────────────────────

  const handleAddRule = async (rule) => {
    const doc = { ...rule, id: rule.id || `rule-${Date.now()}` };
    try {
      const saved = await api.rules.create(doc);
      setRules(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to add rule:", err);
      setRules(prev => [...prev, doc]);
    }
  };

  const handleUpdateRule = async (updated) => {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    try {
      await api.rules.update(updated.id, updated);
    } catch (err) {
      console.error("Failed to update rule:", err);
    }
  };

  const handleDeleteRule = async (id) => {
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await api.rules.delete(id);
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
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
      <button onClick={() => switchRole("partner")} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
        background: role === "partner" ? "var(--color-background-primary)" : "transparent",
        color: role === "partner" ? "var(--vm-color-primary)" : "var(--color-text-secondary)",
        boxShadow: role === "partner" ? "0 1px 3px rgba(0,33,55,0.10)" : "none",
      }}>Partner view</button>
      <button onClick={() => switchRole("operator")} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
        background: role === "operator" ? "var(--color-background-primary)" : "transparent",
        color: role === "operator" ? "var(--vm-color-primary)" : "var(--color-text-secondary)",
        boxShadow: role === "operator" ? "0 1px 3px rgba(0,33,55,0.10)" : "none",
      }}>Operator view</button>
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

      <Header
        subProduct={role === "partner" ? "Content Portal" : "Operations"}
        actions={<div style={{ display: "flex", alignItems: "center", gap: 16 }}>{roleSwitcher}{userPill}</div>}
      />

      <div style={{ flex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>

      <div style={{ display: "flex", gap: 4, marginBottom: 28, flexWrap: "wrap" }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => navigate(n.key)} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer",
            background: isActiveNav(n.key) ? "var(--vm-color-primary)" : "transparent",
            color: isActiveNav(n.key) ? "#fff" : "var(--color-text-secondary)",
            border: "none",
          }}>{n.label}</button>
        ))}
      </div>

      {screen === "p-dashboard" && (
        <PartnerDashboard partner={partner} content={content} allocations={allocations} events={events} onNavigate={navigate} />
      )}
      {screen === "p-upload" && (
        <PartnerUpload onNavigate={navigate} onUpload={handleUpload} partnerId="maccas" allocations={allocations} events={events} initialAllocId={detailId} />
      )}
      {screen === "p-library" && (
        <PartnerLibrary content={content} partnerId="maccas" allocations={allocations} events={events} onNavigate={navigate} />
      )}
      {screen === "p-detail"   && <PartnerDetail item={detailItem} onNavigate={navigate} onDelete={handleDelete} />}
      {screen === "p-pop"      && <PartnerPoP popRecords={MOCK_POP} />}
      {screen === "p-pop-chat" && (
        <PartnerPoPChat partner={partner} events={events} allocations={allocations} popRecords={MOCK_POP} eventTemplates={eventTemplates} />
      )}

      {screen === "o-dashboard" && <OperatorDashboard content={content} onNavigate={navigate} />}
      {screen === "o-review"    && <OperatorReviewQueue content={content} allocations={allocations} events={events} onNavigate={navigate} />}
      {screen === "o-review-detail" && (
        <OperatorReviewDetail item={detailItem} allocations={allocations} events={events} onApprove={handleApprove} onReject={handleReject} onRemoveFromRotation={handleRemoveFromRotation} onNavigate={navigate} />
      )}
      {screen === "o-partners" && (
        <OperatorPartners partners={partners} content={content} onNavigate={navigate} onAddPartner={handleAddPartner} />
      )}
      {screen === "o-partner-detail" && (
        <OperatorPartnerDetail partnerId={detailId} partners={partners} content={content} events={events} allocations={allocations} onAddAllocation={handleAddAllocation} onNavigate={navigate} />
      )}
      {screen === "o-rules" && (
        <OperatorRules rules={rules} partners={partners} onAddRule={handleAddRule} onUpdateRule={handleUpdateRule} onDeleteRule={handleDeleteRule} />
      )}
      {screen === "o-templates" && (
        <OperatorTemplates
          templates={eventTemplates} zones={venueZones}
          onAddTemplate={handleAddTemplate} onEditTemplate={handleEditTemplate} onDeleteTemplate={handleDeleteTemplate}
          onUpdateStates={handleUpdateStates} onUpdateMomentTypes={handleUpdateMomentTypes}
          onAddZone={handleAddZone} onEditZone={handleEditZone} onDeleteZone={handleDeleteZone}
        />
      )}
      {screen === "o-briefs" && (
        <OperatorBriefGenerator partners={partners} events={events} allocations={allocations} content={content} eventTemplates={eventTemplates} />
      )}
      {screen === "o-campaigns" && (
        <OperatorCampaigns
          campaigns={campaigns} partners={partners} events={events} content={content}
          onAddCampaign={handleAddCampaign} onUpdateCampaign={handleUpdateCampaign} onDeleteCampaign={handleDeleteCampaign}
          onAttachEvent={handleAttachEventToCampaign} onDetachEvent={handleDetachEventFromCampaign}
          onAddRule={handleAddCampaignRule} onUpdateRule={handleUpdateCampaignRule} onDeleteRule={handleDeleteCampaignRule}
          onUpdateCampaignPool={handleUpdateCampaignPool}
        />
      )}
      {screen === "o-events" && (
        <OperatorEventSetup
          events={events} allocations={allocations} partners={partners} campaigns={campaigns} eventTemplates={eventTemplates}
          onAddEvent={handleAddEvent} onEditEvent={handleEditEvent}
          onAddAllocation={handleAddAllocation} onEditAllocation={handleEditAllocation} onDeleteAllocation={handleDeleteAllocation}
          onUpdatePriority={handleUpdateEventPriority} onUpdateZonePriority={handleUpdateZonePriority}
          onAddPartner={handleAddPartner}
          onAttachEventToCampaign={handleAttachEventToCampaign} onDetachEventFromCampaign={handleDetachEventFromCampaign}
          onUpdateEventMoments={handleUpdateEventMoments} onAddContent={handleAddContent}
        />
      )}
      {screen === "allocation" && (
        <OperatorAllocationBuilder partners={partners} events={events} campaigns={campaigns} content={content} rules={rules} onNavigateToEvents={() => navigate('o-events')} />
      )}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid var(--color-border-secondary)", fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" }}>
        VenueMind Content Delivery Portal — Prototype v1.0
      </div>

      </div>
    </div>
  );
}

export default App;
