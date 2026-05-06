/**
 * OperatorEventSetup.jsx
 *
 * Operator screen for creating events and defining partner allocations.
 * This is the pre-portal step that must happen before partners get access —
 * allocations created here appear in the partner upload flow automatically.
 *
 * Screen flow:
 *   Event List → Event Detail → Add Allocation (per partner)
 *
 * Each allocation record defines:
 *   - Which partner
 *   - Which zones and states
 *   - Slot count
 *   - Display format (fullscreen / lwrap / ribbon)
 *   - Content spec (derived from display format)
 *   - Notes for the partner
 *
 * Exports: OperatorEventSetup
 */

import { useState } from 'react';
import {
  ZONES,
  AFL_STATES,
  EVENT_TYPES,
  BASE_PARTNERS,
  CONTENT_SPECS_BY_FORMAT,
  getAllocationsForEvent,
  resolveInterleaveOrder,
} from '../data/constants';

// ── Shared styles ────────────────────────────────────────────────────────────

const btn = (variant = 'primary', small = false) => ({
  fontSize: small ? 12 : 13,
  fontWeight: 600,
  padding: small ? '5px 12px' : '9px 18px',
  borderRadius: 7,
  border: 'none',
  cursor: 'pointer',
  background:
    variant === 'primary' ? '#1B2A4A'
    : variant === 'danger'  ? '#DC2626'
    : variant === 'success' ? '#166534'
    : 'var(--color-background-secondary)',
  color: variant === 'ghost' ? 'var(--color-text-secondary)' : '#fff',
});

const input = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', borderRadius: 7,
  border: '1px solid var(--color-border-primary)',
  fontSize: 13, fontFamily: 'inherit',
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
};

const card = {
  background: 'var(--color-background-secondary)',
  borderRadius: 10, padding: 16,
  border: '0.5px solid var(--color-border-tertiary)',
  marginBottom: 12,
};

const sectionTitle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', color: 'var(--color-text-tertiary)',
  marginBottom: 10,
};

const statusColors = {
  pending_content: { bg: '#F0F0F0', text: '#555', label: 'Pending content' },
  under_review:    { bg: '#E6F1FB', text: '#0C447C', label: 'Under review' },
  approved:        { bg: '#EAF3DE', text: '#27500A', label: 'Approved' },
  live:            { bg: '#E1F5EE', text: '#085041', label: 'Live' },
};

function StatusPill({ status }) {
  const s = statusColors[status] ?? { bg: '#F3F4F6', text: '#6B7280', label: status };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function PartnerAvatar({ partner }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 5, flexShrink: 0,
      background: partner.color, color: partner.text,
      fontSize: 9, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(0,0,0,.08)',
    }}>
      {partner.initials}
    </div>
  );
}

// ── Add / Edit Allocation modal ──────────────────────────────────────────────

function AllocationModal({ eventId, eventType, allocation, partners, onSave, onClose, onAddPartner }) {
  const isEdit = !!allocation;
  const [partnerId,    setPartnerId]    = useState(allocation?.partnerId ?? partners[0]?.id ?? BASE_PARTNERS[0].id);
  const [label,        setLabel]        = useState(allocation?.label ?? '');
  const [zones,        setZones]        = useState(allocation?.zones ?? []);
  const [states,       setStates]       = useState(allocation?.states ?? []);
  const [slotCount,    setSlotCount]    = useState(allocation?.slotCount ?? 12);
  const [format,       setFormat]       = useState(allocation?.displayFormat ?? 'fullscreen');
  const [notes,        setNotes]        = useState(allocation?.notes ?? '');
  const [showAddNew,   setShowAddNew]   = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');

  const allPartners = partners.length > 0 ? partners : BASE_PARTNERS;
  const partner     = allPartners.find(p => p.id === partnerId) ?? allPartners[0];
  const spec        = CONTENT_SPECS_BY_FORMAT[format];

  // Resolve states from the event's type — Non-Event has no state-of-play concept
  const resolvedEventType = EVENT_TYPES.find(et => et.id === eventType);
  const allStates   = resolvedEventType?.states ?? null;
  const hasStates   = allStates !== null && allStates.length > 0;

  const toggleZone  = (id) => setZones(z => z.includes(id) ? z.filter(x => x !== id) : [...z, id]);
  const toggleState = (id) => setStates(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // For Non-Event, states are not applicable — canSave ignores states requirement
  const canSave = label.trim() && zones.length > 0 && (hasStates ? states.length > 0 : true) && slotCount > 0;

  const AVATAR_COLORS = [
    { color: '#FAEEDA', text: '#854F0B' }, { color: '#E6F1FB', text: '#0C447C' },
    { color: '#B5D4F4', text: '#185FA5' }, { color: '#EEEDFE', text: '#3C3489' },
    { color: '#FCEBEB', text: '#791F1F' }, { color: '#E1F5EE', text: '#085041' },
    { color: '#FFF3E0', text: '#8A5200' }, { color: '#F5E6FB', text: '#6B2F8A' },
  ];

  const handleInlineAddPartner = () => {
    if (!newPartnerName.trim()) return;
    const n = newPartnerName.trim();
    const words = n.split(/\s+/).filter(Boolean);
    const initials = words.length === 1 ? words[0].slice(0,2).toUpperCase() : words.map(w=>w[0]).join('').slice(0,3).toUpperCase();
    const color = AVATAR_COLORS[allPartners.length % AVATAR_COLORS.length];
    const newPartner = {
      id:             `partner_${Date.now()}`,
      name:           n,
      label:          n,
      initials,
      pkg:            'Custom package',
      contracted:     0,
      contractedSecs: 0,
      bonusSecs:      0,
      pieces:         1,
      color:          color.color,
      text:           color.text,
      textColor:      color.text,
      slots:          0,
      package:        'Custom package',
      category:       'contracted',
      guest:          false,
    };
    onAddPartner(newPartner);
    setPartnerId(newPartner.id);
    setNewPartnerName('');
    setShowAddNew(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id:            allocation?.id ?? `alloc-${Date.now()}`,
      eventId,
      partnerId,
      label:         label.trim(),
      zones,
      states,
      slotCount:     Number(slotCount),
      displayFormat: format,
      contentSpec:   spec,
      contentItemId: allocation?.contentItemId ?? null,
      status:        allocation?.status ?? 'pending_content',
      notes:         notes.trim(),
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: '92%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{isEdit ? 'Edit allocation' : 'Add allocation'}</div>
          <button style={btn('ghost', true)} onClick={onClose}>Close</button>
        </div>

        {/* Partner */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={sectionTitle}>Partner</label>
            <button
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              onClick={() => setShowAddNew(v => !v)}
            >
              {showAddNew ? '— Cancel' : '+ New partner'}
            </button>
          </div>

          {/* Inline new partner quick-add */}
          {showAddNew && (
            <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-primary)', fontSize: 13, fontFamily: 'inherit', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
                placeholder="Partner name (e.g. Coopers Brewery)"
                value={newPartnerName}
                onChange={e => setNewPartnerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInlineAddPartner()}
                autoFocus
              />
              <button
                style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: newPartnerName.trim() ? 'pointer' : 'default', background: newPartnerName.trim() ? '#1B2A4A' : 'var(--color-background-secondary)', color: newPartnerName.trim() ? '#fff' : 'var(--color-text-tertiary)' }}
                onClick={handleInlineAddPartner}
                disabled={!newPartnerName.trim()}
              >
                Add
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allPartners.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: partnerId === p.id ? p.color : 'var(--color-background-secondary)', cursor: 'pointer', border: partnerId === p.id ? `1.5px solid ${(p.text||p.textColor)}33` : '1px solid transparent' }}>
                <input type="radio" name="partner" value={p.id} checked={partnerId === p.id} onChange={() => setPartnerId(p.id)} style={{ margin: 0 }} />
                <PartnerAvatar partner={p} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: partnerId === p.id ? (p.text||p.textColor) : 'var(--color-text-primary)' }}>
                    {p.label || p.name}
                    {p.guest && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(0,0,0,.08)', color: 'inherit' }}>guest</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{p.pkg || p.package}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Label */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Allocation label</label>
          <input style={input} placeholder="e.g. McDonald's — Half Time full-screen" value={label} onChange={e => setLabel(e.target.value)} />
        </div>

        {/* Display format */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Display format</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(CONTENT_SPECS_BY_FORMAT).map(([key, s]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: `1.5px solid ${format === key ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: format === key ? '#EEF2FF' : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                <input type="radio" name="format" value={key} checked={format === key} onChange={() => setFormat(key)} style={{ margin: 0 }} />
                {s.label}
              </label>
            ))}
          </div>
          {spec.note && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#D97706', padding: '5px 8px', borderRadius: 5, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              {spec.note}
            </div>
          )}
        </div>

        {/* Zones */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Zones <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>({zones.length} selected)</span></label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ZONES.map(z => (
              <label key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${zones.includes(z.id) ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: zones.includes(z.id) ? '#EEF2FF' : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                <input type="checkbox" checked={zones.includes(z.id)} onChange={() => toggleZone(z.id)} style={{ margin: 0 }} />
                {z.label}
              </label>
            ))}
          </div>
        </div>

        {/* States — only shown for event types that have defined states of play */}
        {hasStates ? (
          <div>
            <label style={{ ...sectionTitle, display: 'block' }}>States of play <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>({states.length} selected)</span></label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allStates.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${states.includes(s.id) ? '#1B2A4A' : 'var(--color-border-secondary)'}`, background: states.includes(s.id) ? (s.isInPlay ? '#EFF6FF' : '#EEF2FF') : 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  <input type="checkbox" checked={states.includes(s.id)} onChange={() => toggleState(s.id)} style={{ margin: 0 }} />
                  {s.label}
                  {s.isInPlay && <span style={{ fontSize: 9, padding: '1px 3px', borderRadius: 2, background: '#DBEAFE', color: '#1E3A8A', fontWeight: 700 }}>L</span>}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#F3F4F6', border: '0.5px solid var(--color-border-tertiary)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            States of play are not applicable for this event type — the allocation runs as a continuous rotation.
          </div>
        )}

        {/* Slot count */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Contracted slots</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" min={1} max={200} style={{ ...input, width: 80 }} value={slotCount} onChange={e => setSlotCount(e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>× 30s = {slotCount * 30}s airtime per zone per game</span>
          </div>
        </div>

        {/* Notes for partner */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Notes for partner <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(shown in upload screen)</span></label>
          <textarea
            style={{ ...input, resize: 'vertical', minHeight: 60 }}
            placeholder="e.g. L-wrap creative — keep key content left of 1440px. Separate creative required from full-screen."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Content spec summary */}
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Content spec partner will see</div>
          <div style={{ color: 'var(--color-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            <span>Format: <strong style={{ color: 'var(--color-text-primary)' }}>{spec.label}</strong></span>
            <span>Max size: <strong style={{ color: 'var(--color-text-primary)' }}>{spec.maxFileSizeMB}MB</strong></span>
            <span>Max duration: <strong style={{ color: 'var(--color-text-primary)' }}>{spec.maxDurationSecs}s</strong></span>
            <span>Accepted: <strong style={{ color: 'var(--color-text-primary)' }}>{spec.formats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btn('primary'), flex: 1, opacity: canSave ? 1 : .4 }} onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Save changes' : 'Add allocation'}
          </button>
          <button style={btn('ghost')} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Partner Priority Ranking ─────────────────────────────────────────────────

// Shared drag-to-reorder list used by both event-level and zone-level panels.
function PriorityOrderList({ orderedIds, partnerMap, onReorder }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, id) => { setDragging(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(id); };
  const handleDrop      = (e, targetId) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const next = [...orderedIds];
    const from = next.indexOf(dragging), to = next.indexOf(targetId);
    next.splice(from, 1); next.splice(to, 0, dragging);
    onReorder(next);
    setDragging(null); setDragOver(null);
  };
  const moveUp   = (id) => { const idx = orderedIds.indexOf(id); if (idx <= 0) return; const n = [...orderedIds]; n.splice(idx,1); n.splice(idx-1,0,id); onReorder(n); };
  const moveDown = (id) => { const idx = orderedIds.indexOf(id); if (idx >= orderedIds.length-1) return; const n = [...orderedIds]; n.splice(idx,1); n.splice(idx+1,0,id); onReorder(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {orderedIds.map((id, idx) => {
        const p = partnerMap[id];
        if (!p) return null;
        const isDraggingThis = dragging === id;
        const isDragTarget   = dragOver === id && dragging !== id;
        return (
          <div key={id} draggable
            onDragStart={e => handleDragStart(e, id)} onDragOver={e => handleDragOver(e, id)}
            onDrop={e => handleDrop(e, id)} onDragEnd={() => { setDragging(null); setDragOver(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
              background: isDragTarget ? '#EEF2FF' : isDraggingThis ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
              border: isDragTarget ? '1.5px solid #6366F1' : isDraggingThis ? '1.5px dashed var(--color-border-secondary)' : '1px solid var(--color-border-tertiary)',
              cursor: 'grab', opacity: isDraggingThis ? .5 : 1, transition: 'background .1s, border .1s', userSelect: 'none',
            }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1B2A4A', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {idx + 1}
            </div>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14, cursor: 'grab', flexShrink: 0 }}>⠿</span>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: p.color, color: p.text || p.textColor, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }}>
              {p.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.label || p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{p.pkg || p.package}</div>
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button onClick={() => moveUp(id)} disabled={idx === 0}
                style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 13, opacity: idx === 0 ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
              <button onClick={() => moveDown(id)} disabled={idx === orderedIds.length - 1}
                style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', cursor: idx === orderedIds.length - 1 ? 'default' : 'pointer', fontSize: 13, opacity: idx === orderedIds.length - 1 ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Fix 4 — Operator upload content on behalf of partner
function UploadContentModal({ alloc, partner, onSave, onClose }) {
  const [label,  setLabel]  = useState(alloc?.label ?? '');
  const [url,    setUrl]    = useState('');
  const [notes,  setNotes]  = useState('');

  const canSave = label.trim();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={onClose}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: '92%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Upload content — {partner?.label || partner?.name}</div>

        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: 12, color: '#3730A3' }}>
          Content added by the operator is marked as <strong>Approved</strong> and bypasses the partner review queue.
          Use this for house content, direct uploads on behalf of a partner, or placeholder content.
        </div>

        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Content label</label>
          <input style={input} placeholder={`e.g. ${partner?.label ?? 'Partner'} — ${alloc?.displayFormat ?? 'Fullscreen'} — Round 8`} value={label} onChange={e => setLabel(e.target.value)} />
        </div>

        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>
            File reference <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(URL or filename — full upload pipeline is Phase 3)</span>
          </label>
          <input style={input} placeholder="e.g. maccas_r8_fullscreen_v2.mp4" value={url} onChange={e => setUrl(e.target.value)} />
        </div>

        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Notes</label>
          <input style={input} placeholder="Optional notes for this content item" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...btn('success'), flex: 1, opacity: canSave ? 1 : .4 }}
            disabled={!canSave}
            onClick={() => {
              onSave({
                id:          `content-${Date.now()}`,
                allocationId: alloc?.id,
                eventId:      alloc?.eventId,
                partnerId:    alloc?.partnerId,
                label:        label.trim(),
                url:          url.trim() || null,
                displayFormat: alloc?.displayFormat ?? 'fullscreen',
                contentSpec:  alloc?.contentSpec ?? null,
                status:       'approved',
                notes:        notes.trim(),
                uploadedBy:   'operator',
                uploadedAt:   new Date().toISOString(),
              });
              onClose();
            }}
          >
            ✓ Add as approved
          </button>
          <button style={btn('ghost')} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PartnerPriorityPanel({ event, partners, eventAllocs, onUpdatePriority, onUpdateZonePriority }) {
  const [activeSection, setActiveSection] = useState('event'); // 'event' | 'zones'
  const [selectedZoneId, setSelectedZoneId] = useState(ZONES[0].id);
  const [eventSaved,     setEventSaved]     = useState(false);
  const [zoneSaved,      setZoneSaved]      = useState(false);

  const allocPartnerIds = [...new Set(eventAllocs.map(a => a.partnerId))];
  const currentPriority = event.partnerPriority ?? allocPartnerIds;
  const allPartnerMap   = Object.fromEntries(partners.map(p => [p.id, p]));

  // Event-level order — merge saved priority with any newly-added partners
  const baseEventOrder = [
    ...currentPriority.filter(id => allocPartnerIds.includes(id)),
    ...allocPartnerIds.filter(id => !currentPriority.includes(id)),
  ];
  const [eventOrder, setEventOrder] = useState(baseEventOrder);

  // Zone-level order — seeded from resolveInterleaveOrder each time the zone changes
  const zoneOverrideExists = !!(event.zonePriority?.[selectedZoneId]);
  const resolvedZoneOrder  = resolveInterleaveOrder(event, selectedZoneId, allocPartnerIds);
  const [zoneOrder, setZoneOrder] = useState(resolvedZoneOrder);

  // Re-seed zone order when selected zone changes
  const handleZoneChange = (zoneId) => {
    setSelectedZoneId(zoneId);
    setZoneSaved(false);
    setZoneOrder(resolveInterleaveOrder(event, zoneId, allocPartnerIds));
  };

  const overrideCount = Object.keys(event.zonePriority ?? {}).length;

  const handleSaveEvent = () => { onUpdatePriority(event.id, eventOrder); setEventSaved(true); };
  const handleSaveZone  = () => { onUpdateZonePriority(event.id, selectedZoneId, zoneOrder); setZoneSaved(true); };
  const handleClearZone = () => {
    onUpdateZonePriority(event.id, selectedZoneId, null);
    setZoneOrder(resolveInterleaveOrder({ ...event, zonePriority: { ...(event.zonePriority ?? {}), [selectedZoneId]: undefined } }, selectedZoneId, allocPartnerIds));
    setZoneSaved(false);
  };

  if (baseEventOrder.length < 2) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        Add at least 2 partner allocations to set priority ordering.
      </div>
    );
  }

  return (
    <div>
      {/* Section toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--color-background-secondary)', borderRadius: 8, padding: 4 }}>
        <button onClick={() => setActiveSection('event')} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: activeSection === 'event' ? 'var(--color-background-primary)' : 'transparent', color: activeSection === 'event' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', boxShadow: activeSection === 'event' ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
          Event default
        </button>
        <button onClick={() => setActiveSection('zones')} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: activeSection === 'zones' ? 'var(--color-background-primary)' : 'transparent', color: activeSection === 'zones' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', boxShadow: activeSection === 'zones' ? '0 1px 3px rgba(0,0,0,.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Zone overrides
          {overrideCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#0D7C8F', color: '#fff' }}>
              {overrideCount}
            </span>
          )}
        </button>
      </div>

      {/* Event-level section */}
      {activeSection === 'event' && (
        <>
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Default interleave order applied across all zones. Drag to reorder, or use the arrows. Position 1 plays first.
          </div>
          <div style={{ marginBottom: 12 }}>
            <PriorityOrderList
              orderedIds={eventOrder}
              partnerMap={allPartnerMap}
              onReorder={(next) => { setEventOrder(next); setEventSaved(false); }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleSaveEvent} style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#1B2A4A', color: '#fff' }}>
              Save event default
            </button>
            {eventSaved && <span style={{ fontSize: 12, color: '#27500A', fontWeight: 600 }}>✓ Saved — applies to all zones without an override</span>}
          </div>
        </>
      )}

      {/* Zone override section */}
      {activeSection === 'zones' && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Set a different interleave order for a specific zone. Partners not in the zone's override inherit the event default.
          </div>

          {/* Zone selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {ZONES.map(z => {
              const hasOverride = !!(event.zonePriority?.[z.id]);
              return (
                <button key={z.id} onClick={() => handleZoneChange(z.id)}
                  style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: selectedZoneId === z.id ? '#1B2A4A' : hasOverride ? '#CCFBF1' : 'var(--color-background-secondary)',
                    color: selectedZoneId === z.id ? '#fff' : hasOverride ? '#134E4A' : 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  {z.label}
                  {hasOverride && selectedZoneId !== z.id && <span style={{ fontSize: 9, fontWeight: 700 }}>✎</span>}
                </button>
              );
            })}
          </div>

          {/* Override indicator */}
          <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 7,
            background: zoneOverrideExists ? '#CCFBF1' : 'var(--color-background-secondary)',
            border: `1px solid ${zoneOverrideExists ? '#99F6E4' : 'var(--color-border-tertiary)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: zoneOverrideExists ? '#134E4A' : 'var(--color-text-secondary)' }}>
              {zoneOverrideExists ? `✎ Zone override active — ${ZONES.find(z => z.id === selectedZoneId)?.label}` : `Using event default — no override for ${ZONES.find(z => z.id === selectedZoneId)?.label}`}
            </span>
            {zoneOverrideExists && (
              <button onClick={handleClearZone} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5, border: '1px solid #99F6E4', background: 'var(--color-background-primary)', color: '#134E4A', cursor: 'pointer' }}>
                Reset to event default
              </button>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <PriorityOrderList
              orderedIds={zoneOrder}
              partnerMap={allPartnerMap}
              onReorder={(next) => { setZoneOrder(next); setZoneSaved(false); }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleSaveZone} style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#0D7C8F', color: '#fff' }}>
              Save zone override
            </button>
            {zoneSaved && <span style={{ fontSize: 12, color: '#27500A', fontWeight: 600 }}>✓ Saved — override active for {ZONES.find(z => z.id === selectedZoneId)?.label}</span>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Event Detail — allocations list + priority + add ─────────────────────────

// ── Edit event form (metadata only — name, date, type, venue, playlist) ───────
function EditEventForm({ event, onSave, onClose }) {
  const [name,         setName]         = useState(event.name ?? '');
  const [date,         setDate]         = useState(event.date ?? '');
  const [eventType,    setEventType]    = useState(event.eventType ?? 'afl');
  const [venue,        setVenue]        = useState(event.venue ?? '');
  const [playlistName, setPlaylistName] = useState(event.playlistName ?? '');

  const namePlaceholders = {
    afl: 'e.g. AFL — Port Adelaide vs Richmond', function: 'e.g. Disney+ Executive Function',
    non_event: 'e.g. Weekly Plaza Displays', cricket_t20: 'e.g. Sheffield Shield — SA vs VIC', concert: 'e.g. Taylor Swift — The Eras Tour',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ ...sectionTitle, display: 'block' }}>Event type</label>
        <select style={{ ...input, appearance: 'auto' }} value={eventType} onChange={e => setEventType(e.target.value)}>
          {EVENT_TYPES.filter(e => e.status === 'active').map(e => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ ...sectionTitle, display: 'block' }}>Event name</label>
        <input style={input} placeholder={namePlaceholders[eventType] ?? 'Event name'} value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label style={{ ...sectionTitle, display: 'block' }}>Date</label>
        <input type="date" style={{ ...input, width: 'auto' }} value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div>
        <label style={{ ...sectionTitle, display: 'block' }}>Venue</label>
        <input style={input} value={venue} onChange={e => setVenue(e.target.value)} />
      </div>
      <div>
        <label style={{ ...sectionTitle, display: 'block' }}>Playlist name <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(sent to media player)</span></label>
        <input style={input} value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder={name || 'Defaults to event name'} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          style={{ ...btn('primary'), flex: 1, opacity: name.trim() && date ? 1 : 0.4 }}
          disabled={!name.trim() || !date}
          onClick={() => onSave({ ...event, name: name.trim(), date, eventType, venue: venue.trim(), playlistName: (playlistName.trim() || name.trim()) })}
        >
          Save changes
        </button>
        <button style={btn('ghost')} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function EventDetail({ event, allocations, partners, campaigns = [], eventTemplates = [], onBack, onAddAllocation, onEditAllocation, onDeleteAllocation, onUpdatePriority, onUpdateZonePriority, onAddPartner, onUpdateEventMoments, onAddContent, onEditEvent, onAttachEventToCampaign, onDetachEventFromCampaign }) {
  const [showModal,     setShowModal]     = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [activeTab,     setActiveTab]     = useState('allocations');
  const [uploadAlloc,   setUploadAlloc]   = useState(null); // allocation being uploaded to
  const [showEditEvent, setShowEditEvent] = useState(false); // edit event metadata

  const eventAllocs      = getAllocationsForEvent(allocations, event.id);
  const attachedCampaign = campaigns.find(c => (c.eventIds ?? []).includes(event.id)) ?? null;
  const coveredTypes     = new Set((attachedCampaign?.rules ?? []).map(r => r.eventTypeId));
  const eventTypeCovered = attachedCampaign ? coveredTypes.has(event.eventType) : false;
  const allPartners = partners.length > 0 ? partners : BASE_PARTNERS;
  const partnerMap  = Object.fromEntries(allPartners.map(p => [p.id, p]));

  const statusCounts = {
    pending_content: eventAllocs.filter(a => a.status === 'pending_content').length,
    under_review:    eventAllocs.filter(a => a.status === 'under_review').length,
    approved:        eventAllocs.filter(a => a.status === 'approved').length,
    live:            eventAllocs.filter(a => a.status === 'live').length,
  };

  const overrideCount = Object.keys(event.zonePriority ?? {}).length;

  // CDP-037 — moment types come from the event type template only.
  // Operators define moment types in Templates > Moment types, not per-event.
  const template      = eventTemplates.find(t => t.id === event.eventType || t.id === `${event.eventType}_football` || t.sport?.toLowerCase() === event.eventType);
  const momentTypes   = template?.momentTypes ?? [];
  const moments       = event.moments ?? [];
  const assignedCount = moments.filter(m => m.partnerId !== null).length;

  const handleAssignMoment = (momentTypeId, partnerId) => {
    const updated = [...moments];
    ZONES.forEach(zone => {
      const idx = updated.findIndex(m => m.momentTypeId === momentTypeId && m.zoneId === zone.id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], partnerId: partnerId || null };
      } else {
        updated.push({ id: `mom-${event.id}-${momentTypeId}-${zone.id}`, momentTypeId, zoneId: zone.id, partnerId: partnerId || null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 });
      }
    });
    onUpdateEventMoments(event.id, updated);
  };

  const handleSetPackageLabel = (momentTypeId, label) => {
    const updated = moments.map(m =>
      m.momentTypeId === momentTypeId ? { ...m, packageLabel: label } : m
    );
    onUpdateEventMoments(event.id, updated);
  };

  const handleEdit = (alloc) => { setEditTarget(alloc); setShowModal(true); };
  const handleAdd  = () => { setEditTarget(null); setShowModal(true); };

  return (
    <div>
      <button onClick={onBack} style={{ fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Back to events
      </button>

      {/* Event header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>{event.name}</h2>
          {(() => {
            const et = EVENT_TYPES.find(t => t.id === event.eventType);
            return et ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F3F4F6', color: '#555', flexShrink: 0 }}>
                {et.label}
              </span>
            ) : null;
          })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {event.venue}
          </p>
          {onEditEvent && (
            <button onClick={() => setShowEditEvent(true)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'none', border: '0.5px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              ✎ Edit event
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {event.playlistName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 5, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '.04em' }}>Playlist</span>
              <span style={{ fontSize: 12, color: '#3730A3', fontWeight: 500 }}>{event.playlistName}</span>
            </div>
          )}
          {attachedCampaign && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 5, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '.04em' }}>Campaign</span>
              <span style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>{attachedCampaign.name}</span>
              {!eventTypeCovered && <span style={{ fontSize: 10, color: '#92400E', fontWeight: 700 }}>⚠ No rule</span>}
            </div>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'pending_content', label: 'Awaiting upload' },
          { key: 'under_review',    label: 'Under review' },
          { key: 'approved',        label: 'Approved' },
          { key: 'live',            label: 'Live' },
        ].map(({ key, label }) => {
          const s = statusColors[key];
          return (
            <div key={key} style={{ padding: '10px 14px', borderRadius: 8, background: s.bg, border: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.text }}>{statusCounts[key]}</div>
              <div style={{ fontSize: 11, color: s.text, opacity: .8 }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--color-background-secondary)', borderRadius: 8, padding: 4 }}>
        {[
          { id: 'allocations', label: `Allocations (${eventAllocs.length})` },
          { id: 'priority',    label: 'Partner priority' },
          { id: 'moments',     label: momentTypes.length > 0 ? `Moments (${momentTypes.length})` : 'Moments' },
          { id: 'campaign',    label: attachedCampaign ? `Campaign` : 'Campaign' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: 'none',
              background: activeTab === tab.id ? 'var(--color-background-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.id === 'priority' && overrideCount > 0 && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#0D7C8F', color: '#fff', fontWeight: 700 }}>
                {overrideCount} zone{overrideCount !== 1 ? 's' : ''}
              </span>
            )}
            {tab.id === 'priority' && overrideCount === 0 && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#EEF2FF', color: '#3730A3', fontWeight: 700 }}>
                Event-level
              </span>
            )}
            {tab.id === 'moments' && assignedCount > 0 && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                {assignedCount} sold
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Allocations tab */}
      {activeTab === 'allocations' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={sectionTitle}>Partner allocations ({eventAllocs.length})</div>
            <button style={btn('primary', true)} onClick={handleAdd}>+ Add allocation</button>
          </div>

          {eventAllocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              No allocations yet. Add the first allocation to open the upload portal for partners.
            </div>
          ) : (
            eventAllocs.map(alloc => {
              const partner = partnerMap[alloc.partnerId];
              if (!partner) return null;
              return (
                <div key={alloc.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <PartnerAvatar partner={partner} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{alloc.label}</span>
                      <StatusPill status={alloc.status} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                      {partner.label || partner.name} — {alloc.displayFormat} — {alloc.slotCount} slots
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {alloc.zones.map(zid => {
                        const z = ZONES.find(z => z.id === zid);
                        return z ? <span key={zid} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#EEF2FF', color: '#3730A3', fontWeight: 500 }}>{z.label}</span> : null;
                      })}
                    </div>
                    {alloc.notes && (
                      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{alloc.notes}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      style={{ ...btn('success', true) }}
                      onClick={() => setUploadAlloc(alloc)}
                      title="Upload content on behalf of partner (bypasses review queue)"
                    >
                      ↑ Upload
                    </button>
                    <button style={btn('ghost', true)} onClick={() => handleEdit(alloc)}>Edit</button>
                    <button style={{ ...btn('ghost', true), color: '#DC2626' }} onClick={() => onDeleteAllocation(alloc.id)}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* Priority tab */}
      {activeTab === 'priority' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Interleave order for this event</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Set the default order across all zones, then add per-zone overrides where a specific zone needs a different sequence.
            </div>
          </div>
          <PartnerPriorityPanel
            event={event}
            partners={allPartners}
            eventAllocs={eventAllocs}
            onUpdatePriority={onUpdatePriority}
            onUpdateZonePriority={onUpdateZonePriority}
          />
        </>
      )}

      {/* CDP-037 — Moments tab: zone × moment grid */}
      {activeTab === 'moments' && (
        <>
          {/* Info banner */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 16, fontSize: 12, color: '#3730A3' }}>
            <strong>Moments</strong> are trigger-activated signage outside the standard slot rotation. Assign a partner to each zone for each moment type. To add or edit moment types for this event type, go to <strong>Templates → Moment types</strong>. VisionEDGE integration is Phase 3.
          </div>

          {momentTypes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', borderRadius: 10, background: 'var(--color-background-secondary)', border: '0.5px dashed var(--color-border-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>No moment types defined</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Moment types for this event type are managed in <strong>Templates → Moment types</strong>.
              </div>
            </div>
          ) : (
            momentTypes.map(mt => {
              const zoneAssignments = ZONES.map(zone => ({
                zone,
                assignment: moments.find(m => m.momentTypeId === mt.id && m.zoneId === zone.id) ?? {
                  id: `mom-new-${mt.id}-${zone.id}`, momentTypeId: mt.id, zoneId: zone.id,
                  partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0,
                },
              }));

              const assignedZones  = zoneAssignments.filter(za => za.assignment.partnerId).length;
              const totalTriggered = zoneAssignments.reduce((s, za) => s + (za.assignment.triggeredCount ?? 0), 0);
              const totalDelivered = zoneAssignments.reduce((s, za) => s + (za.assignment.deliveredCount ?? 0), 0);

              return (
                <div key={mt.id} style={{ ...card, marginBottom: 16 }}>
                  {/* Moment type header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{mt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{mt.label}</div>
                      {mt.notes && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{mt.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {totalTriggered > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: totalDelivered === totalTriggered ? '#166534' : '#92400E' }}>
                          {totalDelivered}/{totalTriggered} delivered
                        </span>
                      )}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: assignedZones === ZONES.length ? '#DCFCE7' : assignedZones > 0 ? '#FEF9C3' : '#F3F4F6', color: assignedZones === ZONES.length ? '#166534' : assignedZones > 0 ? '#854D0E' : '#6B7280', fontWeight: 600 }}>
                        {assignedZones}/{ZONES.length} zones assigned
                      </span>
                    </div>
                  </div>

                  {/* Apply to all zones shortcut */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, padding: '8px 10px', borderRadius: 6, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0 }}>Apply to all zones:</span>
                    <select
                      style={{ ...input, flex: 1, padding: '5px 8px', fontSize: 12, appearance: 'auto' }}
                      defaultValue=""
                      onChange={e => {
                        const pid = e.target.value || null;
                        const updated = [...moments];
                        ZONES.forEach(zone => {
                          const idx = updated.findIndex(m => m.momentTypeId === mt.id && m.zoneId === zone.id);
                          const record = idx >= 0 ? updated[idx] : { id: `mom-${event.id}-${mt.id}-${zone.id}`, momentTypeId: mt.id, zoneId: zone.id, partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 };
                          const newRecord = { ...record, partnerId: pid };
                          if (idx >= 0) updated[idx] = newRecord; else updated.push(newRecord);
                        });
                        onUpdateEventMoments(event.id, updated);
                        e.target.value = '';
                      }}
                    >
                      <option value="">— Select partner for all zones</option>
                      <option value="">Unassign all zones</option>
                      {allPartners.filter(p => !p.guest).map(p => (
                        <option key={p.id} value={p.id}>{p.label || p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone-by-zone assignment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {zoneAssignments.map(({ zone, assignment }) => {
                      const owner = assignment.partnerId ? allPartners.find(p => p.id === assignment.partnerId) : null;
                      return (
                        <div key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: owner ? 'var(--color-background-primary)' : 'var(--color-background-secondary)', border: `1px solid ${owner ? 'var(--color-border-secondary)' : 'transparent'}` }}>
                          {/* Zone label */}
                          <div style={{ width: 140, flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{zone.label}</div>
                            {assignment.triggeredCount > 0 && (
                              <div style={{ fontSize: 10, color: assignment.deliveredCount === assignment.triggeredCount ? '#166534' : '#92400E' }}>
                                {assignment.deliveredCount}/{assignment.triggeredCount} delivered
                              </div>
                            )}
                          </div>

                          {/* Partner selector */}
                          <select
                            style={{ ...input, flex: 1, padding: '5px 8px', fontSize: 12, appearance: 'auto', background: owner ? owner.color : undefined, color: owner ? (owner.text || owner.textColor) : undefined }}
                            value={assignment.partnerId ?? ''}
                            onChange={e => {
                              const pid = e.target.value || null;
                              const updated = [...moments];
                              const idx = updated.findIndex(m => m.momentTypeId === mt.id && m.zoneId === zone.id);
                              const newRecord = { ...assignment, partnerId: pid };
                              if (idx >= 0) updated[idx] = newRecord; else updated.push(newRecord);
                              onUpdateEventMoments(event.id, updated);
                            }}
                          >
                            <option value="">Unassigned (house content)</option>
                            {allPartners.filter(p => !p.guest).map(p => (
                              <option key={p.id} value={p.id}>{p.label || p.name}</option>
                            ))}
                          </select>

                          {/* Owner avatar */}
                          {owner ? (
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: owner.color, color: owner.text || owner.textColor, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {owner.initials}
                            </div>
                          ) : (
                            <div style={{ width: 28, height: 28, flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* Campaign tab */}
      {activeTab === 'campaign' && (
        <div>
          {/* Attached campaign */}
          {attachedCampaign ? (
            <div>
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 2 }}>{attachedCampaign.name}</div>
                    <div style={{ fontSize: 12, color: '#15803D' }}>
                      {attachedCampaign.startDate} → {attachedCampaign.endDate} · {attachedCampaign.partnerId}
                    </div>
                    <div style={{ fontSize: 12, color: '#15803D', marginTop: 2 }}>
                      {(attachedCampaign.eventIds ?? []).length} event{(attachedCampaign.eventIds ?? []).length !== 1 ? 's' : ''} attached · {(attachedCampaign.rules ?? []).length} rule{(attachedCampaign.rules ?? []).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {onDetachEventFromCampaign && (
                    <button
                      onClick={() => onDetachEventFromCampaign(attachedCampaign.id, event.id)}
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid #86EFAC', background: '#fff', color: '#166534', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
                    >
                      Detach
                    </button>
                  )}
                </div>
                {!eventTypeCovered && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: '#FEF9C3', border: '0.5px solid #FDE047', fontSize: 12, color: '#854D0E' }}>
                    ⚠ This campaign has no rule covering <strong>{EVENT_TYPES.find(t => t.id === event.eventType)?.label ?? event.eventType}</strong> events. The allocation builder has no entitlement terms to apply. Add a rule in the Campaign screen.
                  </div>
                )}
              </div>

              {/* Show relevant campaign rules */}
              {(attachedCampaign.rules ?? []).filter(r => r.eventTypeId === event.eventType).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Applicable rules</div>
                  {(attachedCampaign.rules ?? []).filter(r => r.eventTypeId === event.eventType).map(rule => (
                    <div key={rule.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', marginBottom: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                        {rule.zoneId ? (ZONES.find(z => z.id === rule.zoneId)?.label ?? rule.zoneId) : 'All zones'} — {rule.entitlementType === 'percentage' ? `${rule.value}%` : rule.entitlementType === 'seconds' ? `${rule.value}s/hr` : `${rule.value} slots`}
                      </div>
                      {rule.notes && <div style={{ color: 'var(--color-text-secondary)' }}>{rule.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* No campaign attached — show available campaigns */
            <div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 16, fontSize: 12, color: '#3730A3' }}>
                Attach this event to a campaign to apply partner entitlement rules. Only campaigns with a rule covering <strong>{EVENT_TYPES.find(t => t.id === event.eventType)?.label ?? event.eventType}</strong> events are shown.
              </div>
              {(() => {
                const eligible = campaigns.filter(c =>
                  c.status === 'active' &&
                  (c.rules ?? []).some(r => r.eventTypeId === event.eventType)
                );
                if (eligible.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '32px 16px', borderRadius: 10, background: 'var(--color-background-secondary)', border: '0.5px dashed var(--color-border-secondary)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      No active campaigns have a rule for {EVENT_TYPES.find(t => t.id === event.eventType)?.label ?? event.eventType} events. Create a campaign with the right event type rule first.
                    </div>
                  );
                }
                return eligible.map(c => (
                  <div key={c.id} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {c.startDate} → {c.endDate} · {(c.eventIds ?? []).length} event{(c.eventIds ?? []).length !== 1 ? 's' : ''} · {(c.rules ?? []).length} rule{(c.rules ?? []).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {onAttachEventToCampaign && (
                      <button
                        onClick={() => onAttachEventToCampaign(c.id, event.id)}
                        style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#DCFCE7', color: '#166534', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
                      >
                        Attach
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Edit event modal */}
      {showEditEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowEditEvent(false)}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: '92%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Edit event</div>
            <EditEventForm
              event={event}
              onSave={updated => { onEditEvent(updated); setShowEditEvent(false); }}
              onClose={() => setShowEditEvent(false)}
            />
          </div>
        </div>
      )}

      {showModal && (
        <AllocationModal
          eventId={event.id}
          eventType={event.eventType}
          allocation={editTarget}
          partners={allPartners}
          onSave={editTarget ? onEditAllocation : onAddAllocation}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onAddPartner={onAddPartner}
        />
      )}

      {uploadAlloc && (
        <UploadContentModal
          alloc={uploadAlloc}
          partner={partnerMap[uploadAlloc.partnerId]}
          onSave={(contentItem) => {
            if (onAddContent) onAddContent(contentItem);
            // Mark allocation as approved once content is uploaded
            onEditAllocation({ ...uploadAlloc, status: 'approved', contentItemId: contentItem.id });
            setUploadAlloc(null);
          }}
          onClose={() => setUploadAlloc(null)}
        />
      )}
    </div>
  );
}

// ── New Event form ───────────────────────────────────────────────────────────

function NewEventForm({ onSave, onClose, campaigns = [], onAttachEventToCampaign }) {
  const [name,         setName]         = useState('');
  const [date,         setDate]         = useState('');
  const [eventType,    setEventType]    = useState('afl');
  const [venue,        setVenue]        = useState('Adelaide Oval');
  const [playlistName, setPlaylistName] = useState('');
  const [campaignId,   setCampaignId]   = useState('');

  const canSave = name.trim() && date;

  // Filter campaigns to active ones only — draft campaigns can still be attached
  const availableCampaigns = campaigns.filter(c => c.status !== 'completed');

  // Dynamic name placeholder based on selected event type
  const namePlaceholders = {
    afl:       'e.g. AFL — Port Adelaide vs Richmond',
    function:  'e.g. Disney+ Executive Function',
    non_event: 'e.g. Weekly Plaza Displays',
    cricket_t20: 'e.g. Sheffield Shield — SA vs VIC',
    concert:   'e.g. Taylor Swift — The Eras Tour',
  };
  const namePlaceholder = namePlaceholders[eventType] ?? 'e.g. Event name';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, width: '92%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Create event</div>

        {/* Event type FIRST — determines what zones, states and placeholders apply */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Event type</label>
          <select style={{ ...input, appearance: 'auto' }} value={eventType} onChange={e => setEventType(e.target.value)}>
            {EVENT_TYPES.filter(e => e.status === 'active').map(e => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Event name</label>
          <input style={input} placeholder={namePlaceholder} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Date</label>
          <input type="date" style={{ ...input, width: 'auto' }} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>Venue</label>
          <input style={input} value={venue} onChange={e => setVenue(e.target.value)} />
        </div>

        {/* Playlist name — required by Wipro VisionEDGE integration */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>
            Playlist name <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(sent to media player — must be unique per event)</span>
          </label>
          <input
            style={input}
            placeholder="e.g. Port Adelaide v Richmond — 3 May 2026"
            value={playlistName}
            onChange={e => setPlaylistName(e.target.value)}
          />
          {!playlistName.trim() && name.trim() && date && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#92400E' }}>
              Playlist name will default to event name if left blank
            </div>
          )}
        </div>

        {/* CDP-035 — Campaign selector */}
        <div>
          <label style={{ ...sectionTitle, display: 'block' }}>
            Campaign <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional — attach to an existing campaign)</span>
          </label>
          {availableCampaigns.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
              No active campaigns — create a campaign first to attach events.
            </div>
          ) : (
            <select style={{ ...input, appearance: 'auto' }} value={campaignId} onChange={e => setCampaignId(e.target.value)}>
              <option value="">No campaign</option>
              {availableCampaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {campaignId && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#166534', padding: '4px 8px', borderRadius: 5, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
              ✓ This event will inherit entitlement rules from the selected campaign
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btn('primary'), flex: 1, opacity: canSave ? 1 : .4 }} disabled={!canSave} onClick={() => {
            const newEvent = { id: `evt-${Date.now()}`, name: name.trim(), date, eventType, venue: venue.trim(), playlistName: playlistName.trim() || name.trim(), status: 'upcoming', campaignId: campaignId || null };
            onSave(newEvent);
            if (campaignId && onAttachEventToCampaign) {
              onAttachEventToCampaign(campaignId, newEvent.id);
            }
            onClose();
          }}>
            Create event
          </button>
          <button style={btn('ghost')} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Event List (top-level view) ──────────────────────────────────────────────

export function OperatorEventSetup({ events, allocations, partners, campaigns = [], eventTemplates = [], onAddEvent, onEditEvent, onAddAllocation, onEditAllocation, onDeleteAllocation, onUpdatePriority, onUpdateZonePriority, onAddPartner, onAttachEventToCampaign, onDetachEventFromCampaign, onUpdateEventMoments, onAddContent }) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showNewEvent,    setShowNewEvent]    = useState(false);

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        allocations={allocations}
        partners={partners ?? []}
        campaigns={campaigns}
        eventTemplates={eventTemplates}
        onBack={() => setSelectedEventId(null)}
        onEditEvent={onEditEvent}
        onAddAllocation={onAddAllocation}
        onEditAllocation={onEditAllocation}
        onDeleteAllocation={onDeleteAllocation}
        onUpdatePriority={onUpdatePriority}
        onUpdateZonePriority={onUpdateZonePriority}
        onAddPartner={onAddPartner}
        onAttachEventToCampaign={onAttachEventToCampaign}
        onDetachEventFromCampaign={onDetachEventFromCampaign}
        onUpdateEventMoments={onUpdateEventMoments}
        onAddContent={onAddContent}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>Event setup</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Create events and define partner allocations before opening the upload portal.
          </p>
        </div>
        <button style={btn('primary')} onClick={() => setShowNewEvent(true)}>+ New event</button>
      </div>

      {/* Process note */}
      <div style={{ padding: '12px 16px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 20, fontSize: 13 }}>
        <strong style={{ color: '#3730A3' }}>Pre-portal process</strong>
        <span style={{ color: '#4338CA' }}> — Create the event, add each partner's allocation (zones, states, slot count, content spec), then partners will see their allocations in the upload portal and upload against them.</span>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>No events yet</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Create your first event to begin setting up partner allocations.</div>
          <button style={btn('primary')} onClick={() => setShowNewEvent(true)}>Create first event</button>
        </div>
      ) : (() => {
        // Group events by type category — each active type that has events gets its own section.
        // Sporting events (states-based types other than function) share one section.
        // Functions and Non-Events each get their own section.
        const sportingTypes = EVENT_TYPES.filter(et => et.status === 'active' && et.id !== 'function' && et.id !== 'non_event');
        const sportingIds   = new Set(sportingTypes.map(et => et.id));

        const groups = [
          {
            key:    'sporting',
            label:  'Sporting Events',
            icon:   '🏟',
            events: events.filter(e => sportingIds.has(e.eventType)).sort((a, b) => a.date.localeCompare(b.date)),
          },
          {
            key:    'function',
            label:  'Functions & Conferences',
            icon:   '🎯',
            events: events.filter(e => e.eventType === 'function').sort((a, b) => a.date.localeCompare(b.date)),
          },
          {
            key:    'non_event',
            label:  'Non-Event / Background',
            icon:   '📺',
            events: events.filter(e => e.eventType === 'non_event').sort((a, b) => a.date.localeCompare(b.date)),
          },
        ].filter(g => g.events.length > 0);

        const renderEventRow = (event) => {
          const eventAllocs   = getAllocationsForEvent(allocations, event.id);
          const pendingCount  = eventAllocs.filter(a => a.status === 'pending_content').length;
          const reviewCount   = eventAllocs.filter(a => a.status === 'under_review').length;
          const approvedCount = eventAllocs.filter(a => a.status === 'approved' || a.status === 'live').length;
          const attachedCampaign = campaigns.find(c => c.eventIds?.includes(event.id));
          const et = EVENT_TYPES.find(t => t.id === event.eventType);

          return (
            <div key={event.id} onClick={() => setSelectedEventId(event.id)} style={{ ...card, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{event.name}</span>
                  {attachedCampaign && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#EEF2FF', color: '#3730A3' }}>
                      📅 {attachedCampaign.name}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {new Date(event.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} — {eventAllocs.length} allocation{eventAllocs.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {pendingCount  > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#FFF3E0', color: '#92400E' }}>{pendingCount} pending</span>}
                {reviewCount   > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#E6F1FB', color: '#0C447C' }}>{reviewCount} in review</span>}
                {approvedCount > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#EAF3DE', color: '#27500A' }}>{approvedCount} approved</span>}
                {eventAllocs.length === 0 && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No allocations</span>}
              </div>
              <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>›</span>
            </div>
          );
        };

        return groups.map(group => (
          <div key={group.key} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>{group.icon}</span>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group.label}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>({group.events.length})</span>
            </div>
            {group.events.map(renderEventRow)}
          </div>
        ));
      })()}

      {showNewEvent && (
        <NewEventForm
          campaigns={campaigns}
          onSave={onAddEvent}
          onAttachEventToCampaign={onAttachEventToCampaign}
          onClose={() => setShowNewEvent(false)}
        />
      )}
    </div>
  );
}
