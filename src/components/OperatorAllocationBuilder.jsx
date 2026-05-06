/**
 * OperatorAllocationBuilder.jsx — v9
 *
 * v9 changes (this sprint):
 *  CDP-033 — Function / Conference event type support.
 *    - FUNCTION_STATES and FUNCTION_TOTAL_SLOTS_PER_ZONE added to constants.js.
 *    - 'function' entry added to EVENT_TYPES — active status, 4 states of play.
 *    - BASE_ROTATION_BLOCKS.function added with conservative default allocation.
 *    - Revenue summary line is context-aware: shows "per booking" for Functions.
 *
 *  CDP-034 — Percentage-Based Slot Allocation.
 *    - allocationMode state: 'entitlement' (default) | 'percentage'.
 *    - partnerPercentages state: { [partnerId]: number } — operator-defined % per partner.
 *    - Mode toggle in context bar (event mode only). Locked after push.
 *    - Confirmation modal on mode switch — warns overrides will be cleared.
 *    - PercentageEditorPanel: per-partner % inputs, live capacity indicator, unallocated spare.
 *    - buildMatrixAllocationByPercentage() routes matrix rebuild in percentage mode.
 *    - Switching mode clears cellOverrides and rebuilds baseMatrix via correct builder.
 *    - Context bar shows "X% allocated · Y% spare" live indicator in percentage mode.
 *
 *  CDP-008 — Drag-to-reorder within AFL matrix cells (partner block only).
 *    - Slot tiles in CellAllocationView are draggable (partner slots only; spare block
 *      is not draggable and cannot receive partner drops).
 *    - Native HTML5 drag events — no external library.
 *    - On drop: buildInterleavedDisplay() output becomes the starting order; the
 *      reconstructed sequence is written to cellOverrides so the display order becomes
 *      the data order for that cell.
 *    - Visual: dragging tile renders at 35% opacity; drop target shows a 2px teal
 *      left-border insertion indicator.
 *    - Drag state is local ephemeral state — never persisted. Reset on zone/state change.
 *    - CellAllocationView now receives an onReorder callback from the main component.
 *      The callback receives the new ordered Slot[] array (partner slots only, in new
 *      display sequence) and handles the cellOverride write.
 *
 *  CDP-011 — Non-event spare slot promotion (was a hardcoded limitation in v7).
 *    - nonEventOverride state added to main component (Slot[] | null; null = base rotation).
 *    - Non-event slot grid now reads from nonEventOverride when set, falling back to
 *      the base allocation.
 *    - Spare → Bonus and Spare → Partner assignment handlers now write to
 *      nonEventOverride instead of setAllocation, preserving the base rotation as
 *      an immutable reference.
 *    - "Reset Non-Event Rotation" button added to the non-event grid header when an
 *      override is active.
 *
 *  Drag-to-reorder also works on the non-event 120-slot partner rotation:
 *    - Same drag pattern applied; on drop writes to nonEventOverride.
 *    - Starting order is the current interleavedAllocation display order.
 *
 * v7 changes (carried forward):
 *  - Runtime partners prop (from App state via controlled prop pattern).
 *  - Guest partners tracked in localGuests (builder-local, ephemeral).
 *  - handleEventTypeChange uses propPartners for buildMatrixAllocation.
 *  - Event selector → zone priority interleave order.
 *
 * Phase 2 additions (carried from v6):
 *  1. Spare → Bonus promotion
 *  2. Guest partner workflow
 *  3. Override model (cellOverrides + effectiveMatrix)
 *  4. Matrix Overview — interactive cells
 *  5. Revenue Calculator panel
 *  6. Rate configuration modal
 *  7. Per-event-type base rotation
 *
 * Bug fixes (carried from v5):
 *  Bug 1: Spare slots excluded from interleave, rendered as separate block with divider.
 *  Bug 2: CellAllocationView derives display-only arrays locally (never mutates prop).
 *
 * Named export: OperatorAllocationBuilder
 * Props: partners (Partner[]) — master partner list from App state. Optional; defaults to BASE_PARTNERS.
 *        events   (Event[])   — event list from App state. Optional; defaults to [].
 */

import { useState, useCallback, useMemo } from 'react';
import {
  SLOT_TYPES,
  GUEST_COLORS,
  ZONES,
  EVENT_TYPES,
  BASE_PARTNERS,
  INITIAL_CONTENT,
  SEPARATION_RULES,
  DEFAULT_ZONE_RATES,
  STATE_RATE_MULTIPLIERS,
  buildDefaultAllocation,
  buildBaseAllocationForEvent,
  buildMatrixAllocation,
  buildMatrixAllocationByPercentage,
  getCampaignForEvent,
  resolveCampaignRule,
  validateMatrix,
  validateAllocation,
  generateMatrixMpiXml,
  generateMpiXml,
  computeMatrixRevenue,
  isCellOverridden,
  promoteSlotToBonus,
  revertBonusToSpare,
  assignSpareToPartner,
  createGuestPartner,
  resolveInterleaveOrder,
} from '../data/constants';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const S = {
  wrap: {
    fontFamily: 'var(--font-sans, system-ui)',
    fontSize: 14,
    color: 'var(--color-text-primary)',
    padding: '0 0 32px',
  },
  contextBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px',
    background: 'var(--color-background-secondary)',
    borderBottom: '1px solid var(--color-border-secondary)',
    flexWrap: 'wrap',
  },
  contextLabel: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--color-text-tertiary)', marginRight: 2,
  },
  select: {
    fontSize: 13, fontWeight: 500, padding: '5px 28px 5px 10px',
    borderRadius: 6, border: '1px solid var(--color-border-primary)',
    background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
    cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
  },
  contextSep: { width: 1, height: 22, background: 'var(--color-border-secondary)', margin: '0 4px' },
  tabBar: {
    display: 'flex', gap: 2, padding: '10px 16px 0',
    borderBottom: '1px solid var(--color-border-secondary)',
  },
  tab: (active) => ({
    fontSize: 13, fontWeight: 500, padding: '8px 14px',
    borderRadius: '6px 6px 0 0', border: '1px solid transparent', borderBottom: 'none',
    cursor: 'pointer',
    background: active ? 'var(--color-background-primary)' : 'transparent',
    color: active ? '#1B2A4A' : 'var(--color-text-secondary)',
    borderColor: active ? 'var(--color-border-secondary)' : 'transparent',
    marginBottom: active ? -1 : 0, position: 'relative', zIndex: active ? 1 : 0, transition: 'all .12s',
  }),
  pageBody: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, padding: '16px 16px 0' },
  pageBodyFull: { padding: '16px' },
  panelTitle: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--color-text-tertiary)', marginBottom: 10,
  },
  matrixWrap: { overflowX: 'auto' },
  matrixTable: { borderCollapse: 'separate', borderSpacing: 3, width: '100%' },
  matrixHeaderCell: {
    fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
    padding: '4px 8px', textAlign: 'center', whiteSpace: 'nowrap',
  },
  matrixRowLabel: {
    fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)',
    padding: '4px 10px 4px 0', whiteSpace: 'nowrap', textAlign: 'right',
  },
  matrixCell: (hasErrors, hasWarnings, isInPlay, isEmpty, isOverridden) => ({
    width: 92, height: 72, boxSizing: 'border-box', padding: '4px 6px',
    borderRadius: 6, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    background: hasErrors ? '#FEF2F2' : hasWarnings ? '#FFFBEB' : isInPlay ? '#F0F4FF' : 'var(--color-background-secondary)',
    border: `${isOverridden ? '2px' : '1px'} solid ${hasErrors ? '#FECACA' : hasWarnings ? '#FDE68A' : isOverridden ? '#0D7C8F' : 'var(--color-border-tertiary)'}`,
    cursor: 'pointer', transition: 'all .1s', opacity: isEmpty ? .5 : 1,
  }),
  matrixCellSlots: { fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center' },
  matrixCellSub: { fontSize: 9, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 1, lineHeight: 1.3 },
  matrixCellBadge: (type) => ({
    fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
    display: 'inline-block', marginTop: 2,
    background: type === 'error' ? '#FEE2E2' : type === 'warning' ? '#FEF3C7' : type === 'inplay' ? '#DBEAFE' : type === 'override' ? '#CCFBF1' : '#F3F4F6',
    color:      type === 'error' ? '#991B1B' : type === 'warning' ? '#92400E' : type === 'inplay' ? '#1E3A8A' : type === 'override' ? '#134E4A' : '#6B7280',
  }),
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3 },
  slot: (bg, text, selected, dimmed, isDragging, isDropTarget) => ({
    height: 28, borderRadius: 4, cursor: 'grab',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 500,
    background: bg || 'var(--color-background-secondary)',
    color: text || 'var(--color-text-tertiary)',
    border: isDropTarget
      ? '2px solid #0D7C8F'
      : selected
        ? '2px solid #1B2A4A'
        : '1.5px solid transparent',
    opacity: isDragging ? .35 : dimmed ? .3 : 1,
    transition: 'opacity .1s, border .08s',
    userSelect: 'none',
    boxSizing: 'border-box',
  }),
  slotSpare: (selected) => ({
    height: 28, borderRadius: 4, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 500,
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-tertiary)',
    border: selected ? '2px solid #1B2A4A' : '1.5px solid transparent',
    opacity: 1, transition: 'opacity .1s', userSelect: 'none',
    boxSizing: 'border-box',
  }),
  card: {
    background: 'var(--color-background-secondary)', borderRadius: 8, padding: 14,
    border: '0.5px solid var(--color-border-tertiary)', marginBottom: 12,
  },
  cardTitle: { fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' },
  partnerRow: (color) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
    borderRadius: 5, background: color, marginBottom: 5,
  }),
  partnerAvatar: (color, text) => ({
    width: 24, height: 24, borderRadius: 4, background: color, color: text,
    fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,0,0,.08)',
  }),
  issueRow: (sev) => ({
    fontSize: 11, padding: '4px 8px', borderRadius: 4, marginBottom: 3,
    background: sev === 'error' ? '#FEF2F2' : '#FFFBEB',
    color:      sev === 'error' ? '#991B1B' : '#92400E',
    border: `1px solid ${sev === 'error' ? '#FECACA' : '#FDE68A'}`,
  }),
  btn: (v = 'primary') => ({
    fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 6,
    border: 'none', cursor: 'pointer',
    background: v === 'primary' ? '#1B2A4A' : v === 'danger' ? '#DC2626' : v === 'teal' ? '#0D7C8F' : 'var(--color-background-secondary)',
    color: v === 'ghost' ? 'var(--color-text-secondary)' : '#fff', transition: 'opacity .1s',
  }),
  btnSm: (v = 'primary') => ({
    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5,
    border: 'none', cursor: 'pointer',
    background: v === 'primary' ? '#1B2A4A' : v === 'danger' ? '#DC2626' : v === 'teal' ? '#0D7C8F' : 'var(--color-background-secondary)',
    color: v === 'ghost' ? 'var(--color-text-secondary)' : '#fff',
  }),
  btnGroup: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modalBox: {
    background: 'var(--color-background-primary)', borderRadius: 12, padding: 20,
    width: '90%', maxWidth: 640, maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  modalBoxSm: {
    background: 'var(--color-background-primary)', borderRadius: 12, padding: 20,
    width: '90%', maxWidth: 480,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  xmlPre: {
    fontSize: 11, fontFamily: 'monospace',
    background: 'var(--color-background-secondary)', borderRadius: 6, padding: 12,
    overflowY: 'auto', flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-tertiary)',
  },
  sopLegend: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  sopPill: (isInPlay, active, isOverridden) => ({
    fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 12,
    border: `1.5px solid ${isOverridden ? '#0D7C8F' : isInPlay ? '#93C5FD' : active ? '#1B2A4A' : 'var(--color-border-secondary)'}`,
    background: isInPlay ? '#EFF6FF' : active ? '#1B2A4A' : 'transparent',
    color:      isInPlay ? '#1E40AF' : active ? '#fff'    : 'var(--color-text-secondary)',
    cursor: 'pointer', transition: 'all .1s',
  }),
  summaryRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 12,
  },
  infoTag: (color) => ({
    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
    background: color === 'navy' ? '#EEF2FF' : color === 'amber' ? '#FEF3C7' : color === 'teal' ? '#CCFBF1' : '#F3F4F6',
    color:      color === 'navy' ? '#3730A3' : color === 'amber' ? '#92400E' : color === 'teal' ? '#134E4A' : '#6B7280',
  }),
  revPanel: {
    background: 'var(--color-background-secondary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 8, marginBottom: 16, overflow: 'hidden',
  },
  revHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', cursor: 'pointer',
  },
  revBody: { padding: '0 14px 14px' },
  revBar: (pct, color) => ({
    height: 6, borderRadius: 3,
    background: `linear-gradient(90deg, ${color} ${pct}%, var(--color-border-tertiary) ${pct}%)`,
    marginTop: 3,
  }),
  rateGrid: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', alignItems: 'center' },
  rateInput: {
    fontSize: 12, fontWeight: 600, padding: '4px 8px', width: 64,
    borderRadius: 5, border: '1px solid var(--color-border-primary)',
    background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
    textAlign: 'right',
  },
  spareDivider: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '12px 0 8px', paddingTop: 10,
    borderTop: '1px dashed var(--color-border-secondary)',
  },
};

// ---------------------------------------------------------------------------
// Utility — Round-robin display reorder (display-only, data model unchanged)
// Returns { interleaved: Slot[], spare: Slot[] }
// Spare slots are never interleaved — they form a separate inventory block below.
// priorityOrder (optional): ordered array of partnerIds from resolveInterleaveOrder.
// When provided, the round-robin cycles partners in that order instead of data order.
// ---------------------------------------------------------------------------
function buildInterleavedDisplay(slots, priorityOrder = null) {
  const partnerSlots = slots.filter(s => s.partnerId !== null);
  const spareSlots   = slots.filter(s => s.partnerId === null);
  const groups = {}, dataOrder = [];
  partnerSlots.forEach(slot => {
    const key = slot.partnerId;
    if (!groups[key]) { groups[key] = []; dataOrder.push(key); }
    groups[key].push(slot);
  });
  const order = priorityOrder
    ? [
        ...priorityOrder.filter(id => groups[id]),
        ...dataOrder.filter(id => !priorityOrder.includes(id) && groups[id]),
      ]
    : dataOrder;
  const interleaved = [], cursors = Object.fromEntries(order.map(k => [k, 0]));
  while (interleaved.length < partnerSlots.length) {
    let added = false;
    order.forEach(k => { if (cursors[k] < groups[k].length) { interleaved.push(groups[k][cursors[k]++]); added = true; } });
    if (!added) break;
  }
  return { interleaved, spare: spareSlots };
}

// ---------------------------------------------------------------------------
// applySwap — swaps two slots in the interleaved array by index.
// Returns a new array; never mutates the input.
// ---------------------------------------------------------------------------
function applySwap(interleaved, idxA, idxB) {
  if (idxA === idxB || idxA < 0 || idxB < 0 || idxA >= interleaved.length || idxB >= interleaved.length) {
    return interleaved;
  }
  const result = [...interleaved];
  [result[idxA], result[idxB]] = [result[idxB], result[idxA]];
  return result;
}

// ---------------------------------------------------------------------------
// MatrixOverview — Items 4, 5: interactive cells + Revenue Calculator
// ---------------------------------------------------------------------------
function MatrixOverview({ matrix, eventType, partners, validation, onCellClick, revenue, onOpenRates }) {
  const [revOpen, setRevOpen] = useState(true);
  if (!eventType?.states || !matrix) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Select an event type with zones and states to view the matrix.</div>;
  }
  const states     = eventType.states;
  const totalSlots = states.reduce((s, st) => s + st.slotCount, 0);
  const fmt        = n => n?.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }) ?? '—';

  return (
    <div>
      {/* Revenue Calculator — Item 5 */}
      {revenue && (
        <div style={S.revPanel}>
          <div style={S.revHeader} onClick={() => setRevOpen(v => !v)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Revenue Calculator</span>
              <span style={{ ...S.infoTag('teal') }}>{fmt(revenue.totalEvent)} / game</span>
              <span style={{ ...S.infoTag('navy') }}>{fmt(revenue.totalSeason)} / season</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={S.btnSm('ghost')} onClick={e => { e.stopPropagation(); onOpenRates(); }}>Configure Rates</button>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{revOpen ? '▲' : '▼'}</span>
            </div>
          </div>
          {revOpen && (
            <div style={S.revBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>By Zone</div>
                  {ZONES.map(z => {
                    const val = revenue.byZone[z.id] ?? 0;
                    const max = Math.max(...Object.values(revenue.byZone), 1);
                    return (
                      <div key={z.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{z.label}</span>
                          <span style={{ fontWeight: 600 }}>{fmt(val)}</span>
                        </div>
                        <div style={S.revBar((val / max) * 100, '#1B2A4A')} />
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>By State</div>
                  {states.map(st => {
                    const val = revenue.byState[st.id] ?? 0;
                    const max = Math.max(...Object.values(revenue.byState), 1);
                    return (
                      <div key={st.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{st.label}</span>
                          <span style={{ fontWeight: 600 }}>{fmt(val)}</span>
                        </div>
                        <div style={S.revBar((val / max) * 100, st.isInPlay ? '#9CA3AF' : '#0D7C8F')} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>By Partner</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {partners.filter(p => revenue.byPartner[p.id]).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: p.color }}>
                      <span style={{ ...S.partnerAvatar(p.color, p.text), width: 18, height: 18, fontSize: 8 }}>{p.initials}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: p.text }}>{p.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.text }}>{fmt(revenue.byPartner[p.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 10 }}>
                AUD excl. GST · {eventType.id === 'function' ? 'per booking' : `${eventType.gamesPerSeason ?? '?'} home games/season`} · Rates configurable per zone
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={S.card}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>{(ZONES.length * totalSlots).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Total slots · {ZONES.length} zones × {totalSlots} / zone</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>{ZONES.length * states.length}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Playlist blocks in MPI bundle</div>
        </div>
        {validation.totalErrors > 0 && (
          <div style={{ ...S.card, borderColor: '#FECACA', background: '#FEF2F2' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{validation.totalErrors}</div>
            <div style={{ fontSize: 11, color: '#991B1B' }}>Errors — blocks export</div>
          </div>
        )}
        {validation.totalWarnings > 0 && (
          <div style={{ ...S.card, borderColor: '#FDE68A', background: '#FFFBEB' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706' }}>{validation.totalWarnings}</div>
            <div style={{ fontSize: 11, color: '#92400E' }}>Warnings</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {['error', 'warning', 'inplay', 'ok', 'override'].map(t => (
          <span key={t} style={{ ...S.matrixCellBadge(t), fontSize: 10 }}>
            {t === 'error' ? '✕ Error' : t === 'warning' ? '⚠ Warning' : t === 'inplay' ? 'L-wrap' : t === 'override' ? '✎ Custom' : '✓ OK'}
          </span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}> · Click any cell to edit</span>
      </div>

      {/* Matrix table */}
      <div style={S.matrixWrap}>
        <table style={S.matrixTable}>
          <thead>
            <tr>
              <th style={{ ...S.matrixHeaderCell, textAlign: 'right', paddingRight: 10 }}>State \ Zone</th>
              {ZONES.map(z => <th key={z.id} style={S.matrixHeaderCell}>{z.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {states.map(state => (
              <tr key={state.id}>
                <td style={S.matrixRowLabel}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{state.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    {state.slotCount} slots · {state.defaultSlotDurationSecs}s
                    {state.isInPlay && <span style={{ ...S.infoTag('navy'), marginLeft: 4 }}>L-wrap</span>}
                  </div>
                </td>
                {ZONES.map(zone => {
                  const key        = `${zone.id}_${state.id}`;
                  const issues     = validation.cells[key] ?? [];
                  const errors     = issues.filter(i => i.severity === 'error');
                  const warnings   = issues.filter(i => i.severity === 'warning');
                  const slots      = matrix[zone.id]?.[state.id] ?? [];
                  const filled     = slots.filter(s => s.partnerId).length;
                  const overridden = isCellOverridden(matrix, zone.id, state.id);
                  return (
                    <td key={zone.id} style={{ padding: 2 }}>
                      <div style={S.matrixCell(errors.length > 0, warnings.length > 0, state.isInPlay, filled === 0, overridden)} onClick={() => onCellClick(zone.id, state.id)}>
                        <div style={S.matrixCellSlots}>{state.slotCount}</div>
                        <div style={S.matrixCellSub}>{filled} filled · {state.slotCount - filled} spare</div>
                        <div style={{ textAlign: 'center' }}>
                          {errors.length > 0   && <span style={S.matrixCellBadge('error')}>✕ {errors.length}</span>}
                          {warnings.length > 0 && <span style={{ ...S.matrixCellBadge('warning'), marginLeft: 2 }}>⚠ {warnings.length}</span>}
                          {overridden && !errors.length && !warnings.length && <span style={S.matrixCellBadge('override')}>✎</span>}
                          {state.isInPlay && !errors.length && !warnings.length && !overridden && <span style={S.matrixCellBadge('inplay')}>L-wrap</span>}
                          {!state.isInPlay && !errors.length && !warnings.length && !overridden && filled > 0 && <span style={S.matrixCellBadge('ok')}>✓</span>}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CellAllocationView — v8 reorder model: click-to-swap.
//
// Reorder interaction:
//   - Click a partner slot once → it becomes "picked" (teal ring).
//   - Click another partner slot → the two slots swap positions immediately.
//     The result is written to cellOverrides via onReorder.
//   - Click the picked slot again → deselects (cancels the pick).
//   - Picking a slot does NOT open the detail panel (reorderPick is separate
//     from selectedSlot so the two modes don't interfere).
//   - Spare slots are not pickable for reorder.
//   - A "Reordering" banner is shown while a slot is picked.
//
// Props:
//   onReorder(newInterleavedSlots: Slot[]) — parent writes to cellOverrides.
// ---------------------------------------------------------------------------
function CellAllocationView({ zone, state, slots, partners, selectedSlot, onSlotClick, isOverridden, priorityOrder = null, onReorder }) {
  const partnerMap = Object.fromEntries(partners.map(p => [p.id, p]));
  const [hovered,     setHovered]     = useState(null);
  // Store picked display index — stable across re-renders unlike object references.
  const [reorderPick, setReorderPick] = useState(null); // number | null

  // When the cell has been manually reordered (isOverridden), the slots array
  // is already in the intended display sequence — respect it directly.
  // Only use buildInterleavedDisplay for the base (non-overridden) state.
  const { interleaved: displayPartnerSlots, spare: displaySpareSlots } = isOverridden
    ? { interleaved: slots.filter(s => s.partnerId !== null), spare: slots.filter(s => s.partnerId === null) }
    : buildInterleavedDisplay(slots, priorityOrder);

  const handlePartnerSlotClick = (slot, displayIdx) => {
    if (reorderPick === null) {
      // First click — store the display index and update detail panel.
      setReorderPick(displayIdx);
      onSlotClick(displayIdx);
    } else if (reorderPick === displayIdx) {
      // Same slot — cancel.
      setReorderPick(null);
    } else {
      // Second click — swap by display index in the current displayPartnerSlots.
      // displayIdx is the index passed directly from the render (always current).
      // reorderPick is also an index into displayPartnerSlots — stable because
      // displayPartnerSlots is deterministic for a given slots prop + isOverridden.
      const idxA = reorderPick;
      const idxB = displayIdx;
      const newInterleaved = [...displayPartnerSlots];
      [newInterleaved[idxA], newInterleaved[idxB]] = [newInterleaved[idxB], newInterleaved[idxA]];
      setReorderPick(null);
      onReorder([...newInterleaved, ...displaySpareSlots]);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={S.infoTag('navy')}>{zone?.label}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>→</span>
        <span style={S.infoTag('navy')}>{state?.label}</span>
        {state?.isInPlay && <span style={S.infoTag('amber')}>In-play — L-wrap required</span>}
        {isOverridden && <span style={S.infoTag('teal')}>✎ Customised</span>}
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
          {state?.slotCount} slots · {state?.defaultSlotDurationSecs}s · {(state?.durationSecs / 60).toFixed(0)} min
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {partners.filter(p => slots.some(s => s.partnerId === p.id)).map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: p.color, cursor: 'pointer', fontSize: 11, fontWeight: 500, color: p.text, opacity: hovered && hovered !== p.id ? .35 : 1, transition: 'opacity .1s' }} onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}>
            <span style={{ ...S.partnerAvatar(p.color, p.text), width: 16, height: 16, fontSize: 7 }}>{p.initials}</span>
            {p.label} ({slots.filter(s => s.partnerId === p.id).length})
          </div>
        ))}
        {displaySpareSlots.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 4, background: 'var(--color-background-secondary)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            Spare ({displaySpareSlots.length})
          </div>
        )}
      </div>

      {/* Reorder instructions */}
      {displayPartnerSlots.length > 1 && (
        reorderPick !== null ? (
          <div style={{ fontSize: 11, marginBottom: 8, padding: '5px 10px', borderRadius: 5, background: '#CCFBF1', border: '1px solid #99F6E4', color: '#134E4A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{partnerMap[displayPartnerSlots[reorderPick]?.partnerId]?.label ?? 'Slot'} selected</span>
            <span>— click another slot to swap, or click it again to cancel</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
            Click a slot to select it, then click another slot to swap their positions
          </div>
        )
      )}

      {/* Partner rotation */}
      <div style={S.slotGrid}>
        {displayPartnerSlots.map((slot, idx) => {
          const p            = slot.partnerId ? partnerMap[slot.partnerId] : null;
          const isPicked     = reorderPick === idx;
          const isSwapTarget = reorderPick !== null && reorderPick !== idx;
          const pickedPartner = reorderPick !== null ? partnerMap[displayPartnerSlots[reorderPick]?.partnerId] : null;
          return (
            <div
              key={idx}
              style={{
                ...S.slot(p ? p.color : undefined, p ? p.text : undefined, selectedSlot === idx, hovered && slot.partnerId !== hovered, false, false),
                border: isPicked
                  ? '2px solid #0D7C8F'
                  : selectedSlot === idx
                    ? '2px solid #1B2A4A'
                    : '1.5px solid transparent',
                cursor: isSwapTarget ? 'copy' : 'pointer',
                outline: isPicked ? '2px solid #0D7C8F' : 'none',
                outlineOffset: 1,
              }}
              onClick={() => handlePartnerSlotClick(slot, idx)}
              title={isPicked
                ? `${p?.label ?? 'Slot'} selected — click another to swap`
                : isSwapTarget
                  ? `Click to swap with ${pickedPartner?.label ?? 'selected slot'}`
                  : `Slot ${idx + 1} · ${p?.label ?? '—'} · click to select for reorder`}>
              {p ? p.initials : '—'}
            </div>
          );
        })}
      </div>

      {/* Spare block — not reorderable */}
      {displaySpareSlots.length > 0 && (
        <>
          <div style={S.spareDivider}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)' }}>
              Spare Inventory — {displaySpareSlots.length} slot{displaySpareSlots.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>· Click to promote to bonus</span>
          </div>
          <div style={S.slotGrid}>
            {displaySpareSlots.map((slot, spareIdx) => {
              const displayIdx = displayPartnerSlots.length + spareIdx;
              return (
                <div key={spareIdx}
                  style={S.slotSpare(selectedSlot === displayIdx)}
                  onClick={() => { setReorderPick(null); onSlotClick(displayIdx); }}
                  title={`Spare ${spareIdx + 1} · ${slot.slotType}`}>
                  —
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpareAssignmentPanel — two parallel paths for spare slots:
//   1. Assign to spare (slotType stays 'spare', partnerId set)
//   2. Promote to bonus (slotType becomes 'bonus', partnerId set)
// ---------------------------------------------------------------------------
function SpareAssignmentPanel({ slotIndex, interleavedCount, partners, onPromote, onAssignSpare, onAddGuest }) {
  const [mode,          setMode]          = useState(null);
  const [addingGuest,   setAddingGuest]   = useState(false);
  const [guestName,     setGuestName]     = useState('');
  const [guestInitials, setGuestInitials] = useState('');

  const handlePartnerClick = (partnerId) => {
    if (mode === 'bonus') onPromote(slotIndex, interleavedCount, partnerId);
    else                  onAssignSpare(slotIndex, interleavedCount, partnerId);
    setMode(null);
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    onAddGuest(guestName.trim(), guestInitials || guestName.slice(0, 2).toUpperCase(), slotIndex, interleavedCount, mode === 'bonus');
    setAddingGuest(false); setMode(null); setGuestName(''); setGuestInitials('');
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 4, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, color: '#92400E' }}>Spare slot</span>
        <span style={{ color: '#78350F' }}> — venue inventory. Assign to a partner or promote to a bonus slot.</span>
      </div>

      {mode === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ padding: '10px 12px', borderRadius: 7, background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3 }}>Assign to partner (spare)</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
              Slot stays as spare inventory. PoP records partner attribution. Commercial team can use this data for package discussions.
            </div>
            <button style={S.btnSm('primary')} onClick={() => setMode('spare')}>Assign to spare slot →</button>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 3 }}>Promote to bonus</div>
            <div style={{ fontSize: 11, color: '#78350F', marginBottom: 8 }}>
              Slot becomes a bonus play above the partner's contracted entitlement. Reported separately in PoP — strong commercial signal for package upsell.
            </div>
            <button style={{ ...S.btnSm('primary'), background: '#B45309' }} onClick={() => setMode('bonus')}>Promote to bonus →</button>
          </div>
        </div>
      )}

      {mode !== null && (
        <div style={{ padding: '10px 12px', borderRadius: 7, background: mode === 'bonus' ? '#FFFBEB' : 'var(--color-background-secondary)', border: `1px solid ${mode === 'bonus' ? '#FDE68A' : 'var(--color-border-secondary)'}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: mode === 'bonus' ? '#92400E' : 'var(--color-text-secondary)', marginBottom: 8 }}>
            {mode === 'bonus' ? 'Promote to bonus — assign to:' : 'Assign spare slot — assign to:'}
          </div>
          {!addingGuest ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', marginBottom: 6 }}>
                {partners.map(p => (
                  <button key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 5, border: 'none', background: p.color, cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => handlePartnerClick(p.id)}>
                    <span style={{ ...S.partnerAvatar(p.color, p.text), width: 18, height: 18, fontSize: 8 }}>{p.initials}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: p.text }}>{p.label}</span>
                    {p.guest && <span style={{ fontSize: 9, color: p.text, opacity: .7 }}>Guest</span>}
                  </button>
                ))}
                <button style={{ ...S.btnSm('ghost'), textAlign: 'left', marginTop: 4 }} onClick={() => setAddingGuest(true)}>
                  + Add guest partner
                </button>
              </div>
              <button style={S.btnSm('ghost')} onClick={() => setMode(null)}>← Back</button>
            </>
          ) : (
            <div style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>New guest partner</div>
              <input style={{ ...S.rateInput, width: '100%', textAlign: 'left', marginBottom: 4, boxSizing: 'border-box' }}
                placeholder="Partner name" value={guestName} onChange={e => setGuestName(e.target.value)} />
              <input style={{ ...S.rateInput, width: '100%', textAlign: 'left', marginBottom: 8, boxSizing: 'border-box' }}
                placeholder="Initials (e.g. XY)" value={guestInitials} onChange={e => setGuestInitials(e.target.value.slice(0, 4).toUpperCase())} />
              <div style={S.btnGroup}>
                <button style={S.btnSm('primary')} onClick={handleAddGuest} disabled={!guestName.trim()}>Add & Assign</button>
                <button style={S.btnSm('ghost')} onClick={() => setAddingGuest(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotDetailPanel
// ---------------------------------------------------------------------------
function SlotDetailPanel({ slot, slotIndex, partners, state, interleavedCount, onPromote, onAssignSpare, onRevert, onAddGuest }) {

  if (!slot) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Click any slot to view details</div>
      </div>
    );
  }

  const p       = slot.partnerId ? partners.find(pt => pt.id === slot.partnerId) : null;
  const slotSec = slot.durationSecs ?? state?.defaultSlotDurationSecs ?? 30;
  const fmt     = slot.displayFormat ?? 'fullscreen';
  const zoneLbl = slot.zoneId  ?? 'Non-Event (all zones)';
  const statLbl = slot.stateId ?? 'Background Rotation';
  const isSpare = slot.slotType === SLOT_TYPES.SPARE;
  const isBonus = slot.slotType === SLOT_TYPES.BONUS;

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Slot {slotIndex + 1}</div>
      {p ? (
        <div style={{ marginBottom: 10 }}>
          <div style={S.partnerRow(p.color)}>
            <div style={S.partnerAvatar(p.color, p.text)}>{p.initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>{p.label}</div>
              <div style={{ fontSize: 10, color: p.text, opacity: .7 }}>{p.pkg}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Unassigned spare slot</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
        <div style={S.summaryRow}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Slot type</span>
          <span style={S.infoTag(slot.slotType === SLOT_TYPES.CONTRACTED ? 'navy' : isBonus ? 'teal' : 'amber')}>{slot.slotType}</span>
        </div>
        <div style={S.summaryRow}><span style={{ color: 'var(--color-text-secondary)' }}>Format</span><span style={{ fontWeight: 500 }}>{fmt}</span></div>
        <div style={S.summaryRow}><span style={{ color: 'var(--color-text-secondary)' }}>Duration</span><span style={{ fontWeight: 500 }}>{slotSec}s</span></div>
        {p && (
          <div style={S.summaryRow}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Content piece</span>
            <span style={{ fontWeight: 500 }}>{slot.contentPieceIdx != null ? `Piece ${slot.contentPieceIdx + 1} of ${p.pieces}` : '—'}</span>
          </div>
        )}
        <div style={S.summaryRow}><span style={{ color: 'var(--color-text-secondary)' }}>Zone</span><span style={{ fontWeight: 500 }}>{zoneLbl}</span></div>
        <div style={S.summaryRow}><span style={{ color: 'var(--color-text-secondary)' }}>State</span><span style={{ fontWeight: 500 }}>{statLbl}</span></div>
      </div>

      {slot.slotType === SLOT_TYPES.CONTRACTED && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10, fontStyle: 'italic' }}>
          Contracted slot — locked to partner's package entitlement.
        </div>
      )}

      {isBonus && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, padding: '6px 8px', borderRadius: 4, background: '#CCFBF1', border: '1px solid #99F6E4', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: '#134E4A' }}>Bonus slot</span>
            <span style={{ color: '#134E4A' }}> — venue-assigned above contracted entitlement. Reported separately in PoP.</span>
          </div>
          {onRevert && (
            <button style={S.btnSm('danger')} onClick={() => onRevert(slotIndex)}>Revert to Spare</button>
          )}
        </div>
      )}

      {isSpare && onPromote && (
        <SpareAssignmentPanel
          slotIndex={slotIndex}
          interleavedCount={interleavedCount}
          partners={partners}
          onPromote={onPromote}
          onAssignSpare={onAssignSpare}
          onAddGuest={onAddGuest}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PartnerSummaryPanel
// ---------------------------------------------------------------------------
function PartnerSummaryPanel({ slots, partners, state, onNavigateToEvents }) {
  const slotSecs = state?.defaultSlotDurationSecs ?? 30;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Partner Summary</div>
      {partners.map(p => {
        const ps = slots.filter(s => s.partnerId === p.id);
        if (!ps.length) return null;
        const conform = p.pieces > 1 ? ps.length % p.pieces === 0 : true;
        return (
          <div key={p.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={S.partnerAvatar(p.color, p.text)}>{p.initials}</div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</span>
                {p.guest && <span style={{ ...S.infoTag('amber'), fontSize: 9 }}>Guest</span>}
              </div>
              {!conform && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={S.infoTag('amber')}>⚠ {ps.length} slots / {p.pieces} pieces — doesn't divide equally</span>
                  <span style={{ fontSize: 10, color: '#92400E' }}>
                    Adjust slot count to a multiple of {p.pieces}
                  </span>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', paddingLeft: 30 }}>
              {ps.length} slots · {ps.length * slotSecs}s · {p.pieces} piece{p.pieces !== 1 ? 's' : ''}
            </div>
          </div>
        );
      })}
      <div style={{ ...S.summaryRow, marginTop: 8 }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>Spare slots</span>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{slots.filter(s => !s.partnerId).length}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ValidationPanel
// ---------------------------------------------------------------------------
function ValidationPanel({ issues, onNavigateToEvents }) {
  if (!issues?.length) return <div style={S.card}><div style={{ fontSize: 12, color: '#166534' }}>✓ No issues</div></div>;
  return (
    <div style={S.card}>
      <div style={{ ...S.cardTitle, marginBottom: 6 }}>
        Validation ({issues.filter(i => i.severity === 'error').length} errors, {issues.filter(i => i.severity === 'warning').length} warnings)
      </div>
      {issues.map((issue, i) => (
        <div key={i} style={{ ...S.issueRow(issue.severity), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span>{issue.severity === 'error' ? '✕ ' : '⚠ '}{issue.message}</span>
          {issue.severity === 'error' && onNavigateToEvents && (
            <button
              onClick={onNavigateToEvents}
              style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', background: '#DC2626', color: '#fff', alignSelf: 'flex-start' }}
            >
              Fix in Event Setup →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RateConfigModal — Item 6
// ---------------------------------------------------------------------------
function RateConfigModal({ customRates, onSave, onClose }) {
  const [rates, setRates] = useState({ ...DEFAULT_ZONE_RATES, ...customRates });
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBoxSm} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Configure Slot Rates</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Base rate per 30s slot per zone (AUD excl. GST). State multipliers applied automatically.
        </div>
        <div style={{ ...S.card, marginBottom: 0 }}>
          <div style={S.cardTitle}>Zone Base Rates</div>
          <div style={S.rateGrid}>
            {ZONES.map(z => (
              <>
                <span key={`lbl-${z.id}`} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{z.label}</span>
                <div key={`inp-${z.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>$</span>
                  <input type="number" min={1} max={999} style={S.rateInput}
                    value={rates[z.id] ?? DEFAULT_ZONE_RATES[z.id]}
                    onChange={e => setRates(r => ({ ...r, [z.id]: Number(e.target.value) }))} />
                </div>
              </>
            ))}
          </div>
        </div>
        <div style={{ ...S.card, marginBottom: 0 }}>
          <div style={S.cardTitle}>State Multipliers (read-only)</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
            In-play states discounted (0.7×). Half Time premium (1.2×). Applied to zone base rate.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 11 }}>
            {Object.entries(STATE_RATE_MULTIPLIERS).map(([sid, mult]) => (
              <>
                <span key={`sl-${sid}`} style={{ color: 'var(--color-text-secondary)' }}>{sid.replace(/_/g, ' ')}</span>
                <span key={`sv-${sid}`} style={{ fontWeight: 600, textAlign: 'right', color: mult < 1 ? '#6B7280' : mult > 1 ? '#0D7C8F' : 'var(--color-text-primary)' }}>{mult}×</span>
              </>
            ))}
          </div>
        </div>
        <div style={S.btnGroup}>
          <button style={S.btn('primary')} onClick={() => onSave(rates)}>Save Rates</button>
          <button style={S.btn('ghost')} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn('ghost'), marginLeft: 'auto' }} onClick={() => setRates({ ...DEFAULT_ZONE_RATES })}>Reset Defaults</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CDP-034 — PercentageEditorPanel
// ---------------------------------------------------------------------------
function PercentageEditorPanel({ partners, percentages, onChange }) {
  const total     = Object.values(percentages).reduce((s, v) => s + (Number(v) || 0), 0);
  const spare     = Math.max(0, 100 - total);
  const overLimit = total > 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Percentage Allocation</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
          background: overLimit ? '#FEE2E2' : '#DCFCE7',
          color: overLimit ? '#991B1B' : '#166534',
        }}>
          {total}% allocated · {overLimit ? '⚠ Over limit' : `${spare}% spare`}
        </span>
      </div>

      {/* Per-partner percentage inputs */}
      {partners.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...S.partnerAvatar(p.color, p.text), width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>
            {p.initials}
          </div>
          <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number" min={0} max={100} step={1}
              style={{ ...S.rateInput, width: 56, textAlign: 'right' }}
              value={percentages[p.id] ?? 0}
              onChange={e => onChange(p.id, Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>%</span>
          </div>
        </div>
      ))}

      {/* Capacity bar */}
      <div style={{ marginTop: 4 }}>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border-secondary)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, total)}%`,
            background: overLimit ? '#EF4444' : '#00A9CE',
            borderRadius: 3,
            transition: 'width 0.2s',
          }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
          {overLimit
            ? `Total exceeds 100% — reduce by ${total - 100}% before pushing`
            : `${spare}% unallocated will appear as spare slots in the playlist`
          }
        </div>
      </div>
    </div>
  );
}

// CDP-034 — Mode switch confirmation modal
function ModeConfirmModal({ targetMode, onConfirm, onCancel }) {
  const toLabel   = targetMode === 'percentage' ? 'Percentage Allocation' : 'Entitlement Allocation';
  const fromLabel = targetMode === 'percentage' ? 'entitlement-based' : 'percentage-based';
  return (
    <div style={S.modal} onClick={onCancel}>
      <div style={{ ...S.modalBoxSm, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Switch to {toLabel}?
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Switching will replace the current {fromLabel} slot distribution.
          Any manual cell overrides will be cleared. This cannot be undone.
        </div>
        <div style={S.btnGroup}>
          <button style={S.btn('primary')} onClick={onConfirm}>Switch to {toLabel}</button>
          <button style={S.btn('ghost')} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function OperatorAllocationBuilder({ partners: propPartners = BASE_PARTNERS, events = [], campaigns = [], content = INITIAL_CONTENT, rules = SEPARATION_RULES, onNavigateToEvents }) {
  const [eventTypeId,     setEventTypeId]    = useState('non_event');
  const [selectedZoneId,  setSelectedZoneId] = useState('all');
  const [selectedStateId, setSelectedStateId]= useState('all');
  const [activeTab,       setActiveTab]      = useState('grid');
  const [selectedEventId, setSelectedEventId]= useState('');

  // Guest partners are builder-local ephemeral state — permanent partners come via prop.
  const [localGuests, setLocalGuests] = useState([]);
  const partners = useMemo(() => [...propPartners, ...localGuests], [propPartners, localGuests]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId) ?? null, [events, selectedEventId]);

  // Non-event flat allocation — base rotation (immutable reference for reset).
  const [allocation, setAllocation] = useState(() => buildDefaultAllocation());

  // CDP-011: non-event override — null means use base allocation.
  // Spare → Bonus / Spare → Partner / drag-reorder all write here instead of
  // mutating the base allocation. Allows "Reset to Base" to work cleanly.
  const [nonEventOverride, setNonEventOverride] = useState(null);

  // The active non-event slots: override if set, otherwise base allocation.
  const activeAllocation = nonEventOverride ?? allocation;

  // Item 3 — base matrix (immutable reference) + mutable override map
  const [baseMatrix,    setBaseMatrix]    = useState(null);
  const [cellOverrides, setCellOverrides] = useState({});  // { 'zoneId_stateId': Slot[] }

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showXml,      setShowXml]      = useState(false);
  const [xmlContent,   setXmlContent]   = useState('');
  const [showRates,    setShowRates]    = useState(false);
  const [customRates,  setCustomRates]  = useState({});

  // CDP-013 push workflow
  const [showPushModal, setShowPushModal] = useState(false);
  const [lastPush,      setLastPush]      = useState(null); // { timestamp, label } | null

  // CDP-034 — Percentage allocation mode
  const [allocationMode,    setAllocationMode]    = useState('entitlement'); // 'entitlement' | 'percentage'
  const [partnerPercentages, setPartnerPercentages] = useState({});           // { [partnerId]: number }
  const [showModeConfirm,   setShowModeConfirm]   = useState(null);          // null | 'percentage' | 'entitlement'

  const totalAllocatedPct = useMemo(
    () => Object.values(partnerPercentages).reduce((s, v) => s + (Number(v) || 0), 0),
    [partnerPercentages]
  );

  const handleModeToggleRequest = useCallback((targetMode) => {
    if (targetMode === allocationMode) return;
    if (lastPush) return; // locked after push
    setShowModeConfirm(targetMode);
  }, [allocationMode, lastPush]);

  const handleModeConfirm = useCallback(() => {
    const targetMode = showModeConfirm;
    setShowModeConfirm(null);
    setAllocationMode(targetMode);
    setCellOverrides({});
    const et = EVENT_TYPES.find(e => e.id === eventTypeId);
    if (!et?.states) return;
    if (targetMode === 'percentage') {
      setBaseMatrix(buildMatrixAllocationByPercentage(et, propPartners, partnerPercentages));
    } else {
      setBaseMatrix(buildMatrixAllocation(et, propPartners));
    }
  }, [showModeConfirm, eventTypeId, propPartners, partnerPercentages]);

  const handlePercentageChange = useCallback((partnerId, value) => {
    setPartnerPercentages(prev => {
      const next = { ...prev, [partnerId]: value };
      // Rebuild matrix live as percentages change
      const et = EVENT_TYPES.find(e => e.id === eventTypeId);
      if (et?.states) {
        setBaseMatrix(buildMatrixAllocationByPercentage(et, propPartners, next));
        setCellOverrides({});
      }
      return next;
    });
  }, [eventTypeId, propPartners]);

  const eventType   = useMemo(() => EVENT_TYPES.find(e => e.id === eventTypeId), [eventTypeId]);
  const isEventMode = !!eventType?.states;

  // CDP-035 — resolve the campaign attached to the selected event (if any)
  const activeCampaign = useMemo(() => {
    if (!selectedEvent) return null;
    return getCampaignForEvent(campaigns, selectedEvent.id);
  }, [campaigns, selectedEvent]);
  const currentZone = useMemo(() => ZONES.find(z => z.id === selectedZoneId), [selectedZoneId]);
  const currentState= useMemo(() => eventType?.states?.find(s => s.id === selectedStateId), [eventType, selectedStateId]);

  // Item 3 — effective matrix = base + overrides
  const effectiveMatrix = useMemo(() => {
    if (!baseMatrix) return null;
    const merged = { ...baseMatrix, __overrides__: cellOverrides };
    Object.entries(cellOverrides).forEach(([key, slots]) => {
      const [zoneId, ...rest] = key.split('_');
      const stateId = rest.join('_');
      merged[zoneId] = { ...merged[zoneId], [stateId]: slots };
    });
    return merged;
  }, [baseMatrix, cellOverrides]);

  // Resolve interleave order for the current zone.
  const currentZoneInterleaveOrder = useMemo(() => {
    if (!selectedEvent || selectedZoneId === 'all') return null;
    const candidateIds = [...new Set(
      (effectiveMatrix?.[selectedZoneId]
        ? Object.values(effectiveMatrix[selectedZoneId]).flatMap(slots => slots.map(s => s.partnerId).filter(Boolean))
        : partners.map(p => p.id)
      )
    )];
    return resolveInterleaveOrder(selectedEvent, selectedZoneId, candidateIds);
  }, [selectedEvent, selectedZoneId, effectiveMatrix, partners]);

  // Interleave order for non-event flat allocation.
  const flatInterleaveOrder = useMemo(() => {
    if (!selectedEvent) return null;
    const candidateIds = [...new Set(partners.map(p => p.id))];
    return resolveInterleaveOrder(selectedEvent, null, candidateIds);
  }, [selectedEvent, partners]);

  // Non-event interleaved display.
  // When nonEventOverride is set the array is already in the intended display
  // sequence — split directly without re-interleaving, same pattern as AFL cells.
  const { interleaved: interleavedAllocation, spare: spareAllocation } = useMemo(
    () => nonEventOverride !== null
      ? { interleaved: nonEventOverride.filter(s => s.partnerId !== null), spare: nonEventOverride.filter(s => s.partnerId === null) }
      : buildInterleavedDisplay(activeAllocation, flatInterleaveOrder),
    [nonEventOverride, activeAllocation, flatInterleaveOrder]
  );

  const currentCellSlots = useMemo(() => {
    if (!isEventMode || !effectiveMatrix || selectedZoneId === 'all' || selectedStateId === 'all') return [];
    return effectiveMatrix[selectedZoneId]?.[selectedStateId] ?? [];
  }, [isEventMode, effectiveMatrix, selectedZoneId, selectedStateId]);

  const validation = useMemo(() => {
    if (!isEventMode || !effectiveMatrix) return { valid: true, totalErrors: 0, totalWarnings: 0, cells: {} };
    return validateMatrix(effectiveMatrix, eventType, partners, rules);
  }, [isEventMode, effectiveMatrix, eventType, partners, rules]);

  const cellIssues = useMemo(() => {
    if (selectedZoneId === 'all' || selectedStateId === 'all') return [];
    return validation.cells[`${selectedZoneId}_${selectedStateId}`] ?? [];
  }, [validation, selectedZoneId, selectedStateId]);

  const revenue = useMemo(() => {
    if (!isEventMode || !effectiveMatrix) return null;
    return computeMatrixRevenue(effectiveMatrix, eventType, partners, customRates);
  }, [isEventMode, effectiveMatrix, eventType, partners, customRates]);

  const { interleaved: cellInterleaved, spare: cellSpare } = useMemo(
    () => buildInterleavedDisplay(currentCellSlots, currentZoneInterleaveOrder),
    [currentCellSlots, currentZoneInterleaveOrder]
  );

  const currentCellOverridden = useMemo(() => {
    if (!effectiveMatrix || selectedZoneId === 'all' || selectedStateId === 'all') return false;
    return isCellOverridden(effectiveMatrix, selectedZoneId, selectedStateId);
  }, [effectiveMatrix, selectedZoneId, selectedStateId]);

  // ---- Handlers ----

  const handleEventTypeChange = useCallback((id) => {
    setEventTypeId(id); setSelectedZoneId('all'); setSelectedStateId('all');
    setSelectedSlot(null); setActiveTab('grid'); setCellOverrides({});
    setAllocationMode('entitlement'); setPartnerPercentages({}); // CDP-034 reset
    const et = EVENT_TYPES.find(e => e.id === id);
    if (et?.states) {
      setBaseMatrix(buildMatrixAllocation(et, propPartners));
    } else {
      setBaseMatrix(null);
    }
    setAllocation(buildBaseAllocationForEvent(id));
    setNonEventOverride(null);
    setLocalGuests([]);
  }, [propPartners]);

  const handleZoneChange = useCallback((id) => { setSelectedZoneId(id); setSelectedSlot(null); }, []);

  const handleStateChange = useCallback((id) => {
    setSelectedStateId(id); setSelectedSlot(null);
    if (id !== 'all' && selectedZoneId === 'all') setActiveTab('matrix');
    else if (id !== 'all') setActiveTab('grid');
  }, [selectedZoneId]);

  const handleMatrixCellClick = useCallback((zoneId, stateId) => {
    setSelectedZoneId(zoneId); setSelectedStateId(stateId);
    setSelectedSlot(null); setActiveTab('grid');
  }, []);

  // Item 1 — promote spare to bonus
  const handlePromote = useCallback((displayIdx, interleavedCount, partnerId) => {
    if (isEventMode && selectedZoneId !== 'all' && selectedStateId !== 'all') {
      const current = effectiveMatrix?.[selectedZoneId]?.[selectedStateId] ?? [];
      const updated = promoteSlotToBonus(current, displayIdx, interleavedCount, partnerId);
      setCellOverrides(ov => ({ ...ov, [`${selectedZoneId}_${selectedStateId}`]: updated }));
    } else {
      // CDP-011: write to nonEventOverride instead of base allocation
      setNonEventOverride(prev => promoteSlotToBonus(prev ?? activeAllocation, displayIdx, interleavedAllocation.length, partnerId));
    }
    setSelectedSlot(null);
  }, [isEventMode, selectedZoneId, selectedStateId, effectiveMatrix, activeAllocation, interleavedAllocation.length]);

  // Assign spare slot to partner (slotType stays spare, partnerId set)
  const handleAssignSpare = useCallback((displayIdx, interleavedCount, partnerId) => {
    if (isEventMode && selectedZoneId !== 'all' && selectedStateId !== 'all') {
      const current = effectiveMatrix?.[selectedZoneId]?.[selectedStateId] ?? [];
      const updated = assignSpareToPartner(current, displayIdx, interleavedCount, partnerId);
      setCellOverrides(ov => ({ ...ov, [`${selectedZoneId}_${selectedStateId}`]: updated }));
    } else {
      setNonEventOverride(prev => assignSpareToPartner(prev ?? activeAllocation, displayIdx, interleavedAllocation.length, partnerId));
    }
    setSelectedSlot(null);
  }, [isEventMode, selectedZoneId, selectedStateId, effectiveMatrix, activeAllocation, interleavedAllocation.length]);

  // Revert bonus to spare
  const handleRevert = useCallback((displayIdx) => {
    if (isEventMode && selectedZoneId !== 'all' && selectedStateId !== 'all') {
      const current = effectiveMatrix?.[selectedZoneId]?.[selectedStateId] ?? [];
      const updated = revertBonusToSpare(current, displayIdx);
      setCellOverrides(ov => ({ ...ov, [`${selectedZoneId}_${selectedStateId}`]: updated }));
    } else {
      setNonEventOverride(prev => revertBonusToSpare(prev ?? activeAllocation, displayIdx));
    }
    setSelectedSlot(null);
  }, [isEventMode, selectedZoneId, selectedStateId, effectiveMatrix, activeAllocation]);

  // Add guest partner + assign spare slot
  const handleAddGuest = useCallback((name, initials, displayIdx, interleavedCount, isBonus = true) => {
    const guest = createGuestPartner(name, initials);
    setLocalGuests(prev => [...prev, guest]);
    if (isEventMode && selectedZoneId !== 'all' && selectedStateId !== 'all') {
      const current = effectiveMatrix?.[selectedZoneId]?.[selectedStateId] ?? [];
      const updated = isBonus
        ? promoteSlotToBonus(current, displayIdx, interleavedCount, guest.id)
        : assignSpareToPartner(current, displayIdx, interleavedCount, guest.id);
      setCellOverrides(ov => ({ ...ov, [`${selectedZoneId}_${selectedStateId}`]: updated }));
    } else {
      setNonEventOverride(prev => {
        const base = prev ?? activeAllocation;
        return isBonus
          ? promoteSlotToBonus(base, displayIdx, interleavedCount, guest.id)
          : assignSpareToPartner(base, displayIdx, interleavedCount, guest.id);
      });
    }
    setSelectedSlot(null);
  }, [isEventMode, selectedZoneId, selectedStateId, effectiveMatrix, activeAllocation]);

  // Reset AFL cell to base
  const handleResetCell = useCallback(() => {
    const key = `${selectedZoneId}_${selectedStateId}`;
    setCellOverrides(ov => { const n = { ...ov }; delete n[key]; return n; });
    setSelectedSlot(null);
  }, [selectedZoneId, selectedStateId]);

  // Reset non-event rotation to base
  const handleResetNonEvent = useCallback(() => {
    setNonEventOverride(null);
    setSelectedSlot(null);
  }, []);

  // ---------------------------------------------------------------------------
  // CDP-008: reorder handler for AFL matrix cells.
  // CellAllocationView now passes the complete raw slots array (partner + spare)
  // with two slots swapped in-place. Write directly to cellOverrides.
  // ---------------------------------------------------------------------------
  const handleCellReorder = useCallback((newSlots) => {
    if (selectedZoneId === 'all' || selectedStateId === 'all') return;
    setCellOverrides(ov => ({ ...ov, [`${selectedZoneId}_${selectedStateId}`]: newSlots }));
    setSelectedSlot(null);
  }, [selectedZoneId, selectedStateId]);

  // ---------------------------------------------------------------------------
  // CDP-011 / CDP-008: drag-to-reorder handler for non-event 120-slot rotation.
  // Called by the non-event slot grid drag handler with the new ordered
  // interleaved slots. Spare slots are appended unchanged.
  // ---------------------------------------------------------------------------
  const handleNonEventReorder = useCallback((newInterleavedSlots) => {
    const spareSlots = activeAllocation.filter(s => s.partnerId === null);
    const updated    = [...newInterleavedSlots, ...spareSlots];
    setNonEventOverride(updated);
    setSelectedSlot(null);
  }, [activeAllocation]);

  const handleGenerateXml = useCallback(() => {
    const xml = (isEventMode && effectiveMatrix)
      ? generateMatrixMpiXml({ partners, matrix: effectiveMatrix, eventType, eventName: 'AFL Game' })
      : generateMpiXml({ partners, allocation: activeAllocation, playlistName: 'Background Rotation' });
    setXmlContent(xml); setShowXml(true);
  }, [isEventMode, effectiveMatrix, eventType, partners, activeAllocation]);

  const handleCopyXml = useCallback(() => navigator.clipboard.writeText(xmlContent).catch(() => {}), [xmlContent]);
  const handleSaveRates = useCallback((rates) => { setCustomRates(rates); setShowRates(false); }, []);

  // Compute content gaps across all partner slots in the current allocation.
  // For AFL: scan every cell in effectiveMatrix. For non-event: scan activeAllocation.
  // Groups by partnerId — { partnerId: { partner, total, noContent } }
  const contentGaps = useMemo(() => {
    const byPartner = {};
    const partnerMap = Object.fromEntries(partners.map(p => [p.id, p]));
    const contentByPartner = {};
    content.forEach(c => {
      if (!contentByPartner[c.partnerId]) contentByPartner[c.partnerId] = [];
      contentByPartner[c.partnerId].push(c);
    });
    const hasApprovedContent = (partnerId) => {
      const items = contentByPartner[partnerId] ?? [];
      return items.some(c => c.status === 'live' || c.status === 'approved');
    };
    const processSlot = (slot, slotSecs = 30) => {
      if (!slot.partnerId) return;
      if (!byPartner[slot.partnerId]) {
        byPartner[slot.partnerId] = { partner: partnerMap[slot.partnerId], total: 0, noContent: 0, missingSecs: 0, totalSecs: 0 };
      }
      const dur = slot.durationSecs ?? slotSecs;
      byPartner[slot.partnerId].total++;
      byPartner[slot.partnerId].totalSecs += dur;
      if (!hasApprovedContent(slot.partnerId)) {
        byPartner[slot.partnerId].noContent++;
        byPartner[slot.partnerId].missingSecs += dur;
      }
    };
    if (isEventMode && effectiveMatrix) {
      ZONES.forEach(z => {
        eventType?.states?.forEach(s => {
          (effectiveMatrix[z.id]?.[s.id] ?? []).forEach(slot => processSlot(slot, s.defaultSlotDurationSecs ?? 30));
        });
      });
    } else {
      activeAllocation.forEach(slot => processSlot(slot, 30));
    }
    return Object.values(byPartner).filter(g => g.noContent > 0);
  }, [isEventMode, effectiveMatrix, eventType, activeAllocation, partners, content]);

  const handlePush = useCallback(() => {
    // Generate XML, record push timestamp, close modal.
    handleGenerateXml();
    setLastPush({
      timestamp: new Date(),
      label: selectedEvent?.name ?? eventType?.label ?? 'Non-Event Rotation',
    });
    setShowPushModal(false);
  }, [handleGenerateXml, selectedEvent, eventType]);

  const tabs = [
    { id: 'grid',      label: 'Slot Grid' },
    ...(isEventMode ? [{ id: 'matrix', label: 'Matrix Overview' }] : []),
    { id: 'inventory', label: 'Inventory' },
    { id: 'preview',   label: 'Preview' },
    { id: 'export',    label: 'Export' },
  ];

  const resolveDisplay = (displayIdx, interleaved, spare) => {
    if (displayIdx == null) return null;
    return [...interleaved, ...spare][displayIdx] ?? null;
  };

  const overrideCount = Object.keys(cellOverrides).length;

  // Preview tab — independent zone/state selectors so operator can browse
  // without affecting the grid context.
  const [previewZoneId,  setPreviewZoneId]  = useState('concourse');
  const [previewStateId, setPreviewStateId] = useState(() => eventType?.states?.[0]?.id ?? '');

  // Non-event reorder: index-based click-to-swap.
  const [nonEventPick, setNonEventPick] = useState(null); // number | null

  const handleNonEventSlotClick = useCallback((displayIdx) => {
    if (nonEventPick === null) {
      setNonEventPick(displayIdx);
      setSelectedSlot(prev => prev === displayIdx ? null : displayIdx);
    } else if (nonEventPick === displayIdx) {
      setNonEventPick(null);
    } else {
      // Swap by display index in interleavedAllocation.
      // nonEventOverride is set to the new full array (interleaved + spare).
      const newInterleaved = [...interleavedAllocation];
      [newInterleaved[nonEventPick], newInterleaved[displayIdx]] = [newInterleaved[displayIdx], newInterleaved[nonEventPick]];
      setNonEventPick(null);
      setNonEventOverride([...newInterleaved, ...spareAllocation]);
      setSelectedSlot(null);
    }
  }, [nonEventPick, interleavedAllocation, spareAllocation]);

  return (
    <div style={S.wrap}>

      {/* Context bar */}
      <div style={S.contextBar}>
        {/* Event Type ALWAYS first and always editable — changing type clears the event selection */}
        <span style={S.contextLabel}>Event Type</span>
        <select style={S.select} value={eventTypeId} onChange={e => {
          handleEventTypeChange(e.target.value);
          setSelectedEventId(''); // clear event — it may not belong to the new type
        }}>
          {EVENT_TYPES.map(et => (
            <option key={et.id} value={et.id} disabled={et.status === 'planned'}>
              {et.label}{et.status === 'planned' ? ' (Phase 2)' : ''}
            </option>
          ))}
        </select>
        {/* Event Name — filtered to events matching the selected type */}
        {events.length > 0 && (() => {
          const typeEvents = events.filter(ev => ev.eventType === eventTypeId);
          return typeEvents.length > 0 ? (
            <>
              <div style={S.contextSep} />
              <span style={S.contextLabel}>Event</span>
              <select style={S.select} value={selectedEventId} onChange={e => {
                const evId = e.target.value;
                setSelectedEventId(evId);
                // When an event is chosen, sync the type (handles edge cases where
                // an event was stored with a different type than the current selector)
                if (evId) {
                  const ev = typeEvents.find(x => x.id === evId);
                  if (ev && ev.eventType && ev.eventType !== eventTypeId) {
                    handleEventTypeChange(ev.eventType);
                  }
                }
              }}>
                <option value="">— Select event</option>
                {typeEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              {selectedEvent && Object.keys(selectedEvent.zonePriority ?? {}).length > 0 && (
                <span style={S.infoTag('teal')}>
                  ✎ {Object.keys(selectedEvent.zonePriority).length} zone override{Object.keys(selectedEvent.zonePriority).length !== 1 ? 's' : ''} active
                </span>
              )}
            </>
          ) : null;
        })()}
        {isEventMode && (
          <>
            <div style={S.contextSep} />
            <span style={S.contextLabel}>Zone</span>
            <select style={S.select} value={selectedZoneId} onChange={e => handleZoneChange(e.target.value)}>
              <option value="all">All Zones</option>
              {ZONES.map(z => {
                const hasOverride = !!(selectedEvent?.zonePriority?.[z.id]);
                return <option key={z.id} value={z.id}>{hasOverride ? '✎ ' : ''}{z.label}</option>;
              })}
            </select>
            <div style={S.contextSep} />
            <span style={S.contextLabel}>State of Play</span>
            <select style={S.select} value={selectedStateId} onChange={e => handleStateChange(e.target.value)}>
              <option value="all">All States</option>
              {eventType.states.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.slotCount} slots){s.isInPlay ? ' · In-play' : ''}
                </option>
              ))}
            </select>
            <div style={S.contextSep} />
            {validation.totalErrors > 0
              ? <span style={S.infoTag('amber')}>✕ {validation.totalErrors} error{validation.totalErrors !== 1 ? 's' : ''}</span>
              : <span style={{ ...S.infoTag('navy'), background: '#DCFCE7', color: '#166534' }}>✓ Valid</span>
            }
            {overrideCount > 0 && (
              <span style={S.infoTag('teal')}>✎ {overrideCount} override{overrideCount !== 1 ? 's' : ''}</span>
            )}
          </>
        )}
        {/* Fix 1 — Allocation mode toggle: available for ALL event types including Non-Event */}
        <div style={S.contextSep} />
        <span style={S.contextLabel}>Allocation</span>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border-secondary)' }}>
          {['entitlement', 'percentage'].map(mode => (
            <button
              key={mode}
              onClick={() => handleModeToggleRequest(mode)}
              disabled={!!lastPush}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', border: 'none', cursor: lastPush ? 'not-allowed' : 'pointer',
                background: allocationMode === mode ? 'var(--color-primary, #002137)' : 'var(--color-background-secondary)',
                color: allocationMode === mode ? '#fff' : 'var(--color-text-secondary)',
                opacity: lastPush ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
            >
              {mode === 'entitlement' ? 'Entitlement' : 'Percentage'}
            </button>
          ))}
        </div>
        {allocationMode === 'percentage' && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: totalAllocatedPct > 100 ? '#FEE2E2' : '#DCFCE7',
            color: totalAllocatedPct > 100 ? '#991B1B' : '#166534',
          }}>
            {totalAllocatedPct}% allocated · {Math.max(0, 100 - totalAllocatedPct)}% spare
          </span>
        )}
        {lastPush && allocationMode === 'percentage' && (
          <span style={S.infoTag('amber')}>🔒 Mode locked after push</span>
        )}
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {tabs.map(t => <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
      </div>

      {/* MATRIX OVERVIEW TAB */}
      {activeTab === 'matrix' && (
        <div style={S.pageBodyFull}>
          <div style={S.panelTitle}>Playlist Matrix — {eventType?.label}</div>
          <MatrixOverview
            matrix={effectiveMatrix}
            eventType={eventType}
            partners={partners}
            validation={validation}
            onCellClick={handleMatrixCellClick}
            revenue={revenue}
            onOpenRates={() => setShowRates(true)}
          />
        </div>
      )}

      {/* SLOT GRID TAB */}
      {activeTab === 'grid' && (
        <div style={S.pageBody}>
          <div>
            {/* CDP-034 — Percentage editor panel (event mode only) */}
            {isEventMode && allocationMode === 'percentage' && (
              <div style={{ ...S.card, marginBottom: 16 }}>
                <PercentageEditorPanel
                  partners={partners.filter(p => !p.guest)}
                  percentages={partnerPercentages}
                  onChange={handlePercentageChange}
                />
              </div>
            )}

            {/* CDP-035 — Campaign context banner (event mode, campaign attached) */}
            {isEventMode && activeCampaign && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 16 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📅</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3730A3', marginBottom: 2 }}>
                    Campaign: {activeCampaign.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#4338CA', lineHeight: 1.4 }}>
                    {activeCampaign.rules?.length ?? 0} entitlement rule{(activeCampaign.rules?.length ?? 0) !== 1 ? 's' : ''} active
                    {' · '}
                    {activeCampaign.contentPool?.length ?? 0} content piece{(activeCampaign.contentPool?.length ?? 0) !== 1 ? 's' : ''} in pool
                    {' · '}
                    {activeCampaign.startDate} → {activeCampaign.endDate}
                  </div>
                  <div style={{ fontSize: 11, color: '#6366F1', marginTop: 4 }}>
                    Slot allocation reflects campaign entitlement rules per zone. Switch to Percentage mode to apply campaign rules directly.
                  </div>
                </div>
              </div>
            )}

            {/* Event mode: incomplete selection */}
            {isEventMode && (selectedZoneId === 'all' || selectedStateId === 'all') && (
              <div>
                <div style={S.panelTitle}>
                  {selectedZoneId !== 'all' ? `${currentZone?.label} — Select a State of Play` : 'Select a Zone and State of Play to view slots'}
                </div>
                <div style={S.sopLegend}>
                  {eventType.states.map(s => {
                    const key    = selectedZoneId !== 'all' ? `${selectedZoneId}_${s.id}` : null;
                    const errors = key ? (validation.cells[key] ?? []).filter(i => i.severity === 'error').length : 0;
                    const isOvr  = key ? !!cellOverrides[key] : false;
                    return (
                      <button key={s.id} style={S.sopPill(s.isInPlay, false, isOvr)} onClick={() => handleStateChange(s.id)}>
                        {s.label} ({s.slotCount})
                        {errors > 0 && <span style={{ marginLeft: 4, color: '#DC2626' }}>✕{errors}</span>}
                        {isOvr   && <span style={{ marginLeft: 4, color: '#0D7C8F' }}>✎</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedZoneId === 'all' && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                    Or switch to <strong>Matrix Overview</strong> for the full grid and revenue calculator.
                  </div>
                )}
              </div>
            )}

            {/* Event mode: zone + state selected */}
            {isEventMode && selectedZoneId !== 'all' && selectedStateId !== 'all' && (
              <>
                {currentCellOverridden && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: '#CCFBF1', border: '1px solid #99F6E4' }}>
                    <span style={{ fontSize: 12, color: '#134E4A', fontWeight: 500 }}>✎ This cell has been customised from the base rotation.</span>
                    <button style={S.btnSm('ghost')} onClick={handleResetCell}>Reset to Base</button>
                  </div>
                )}
                {selectedEvent?.zonePriority?.[selectedZoneId] && (
                  <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 12, color: '#166534' }}>
                    ✎ Zone priority override active — interleave order for <strong>{currentZone?.label}</strong> differs from the event default.
                    Set in Event Setup → Partner Priority → Zone overrides.
                  </div>
                )}
                <CellAllocationView
                  zone={currentZone} state={currentState}
                  slots={currentCellSlots} partners={partners}
                  selectedSlot={selectedSlot} isOverridden={currentCellOverridden}
                  onSlotClick={idx => setSelectedSlot(idx === selectedSlot ? null : idx)}
                  priorityOrder={currentZoneInterleaveOrder}
                  onReorder={handleCellReorder}
                />
              </>
            )}

            {/* Non-event: interleaved partner rotation + spare block */}
            {!isEventMode && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ ...S.panelTitle, marginBottom: 0 }}>120-Slot Background Rotation — interleaved view</div>
                  {nonEventOverride !== null && (
                    <button style={S.btnSm('ghost')} onClick={handleResetNonEvent}>Reset to Base</button>
                  )}
                  {nonEventOverride !== null && (
                    <span style={S.infoTag('teal')}>✎ Modified</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {partners.map(p => {
                    const count = activeAllocation.filter(s => s.partnerId === p.id).length;
                    if (!count) return null;
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: p.color, fontSize: 11, fontWeight: 500, color: p.text }}>
                        <span style={{ ...S.partnerAvatar(p.color, p.text), width: 16, height: 16, fontSize: 7 }}>{p.initials}</span>
                        {p.label} ({count}){p.guest && <span style={{ fontSize: 9, opacity: .7 }}> G</span>}
                      </div>
                    );
                  })}
                  {spareAllocation.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 4, background: 'var(--color-background-secondary)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      Spare ({spareAllocation.length})
                    </div>
                  )}
                </div>

                {/* Reorder instructions for non-event */}
                {interleavedAllocation.length > 1 && (
                  nonEventPick !== null ? (
                    <div style={{ fontSize: 11, marginBottom: 8, padding: '5px 10px', borderRadius: 5, background: '#CCFBF1', border: '1px solid #99F6E4', color: '#134E4A', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{partners.find(p => p.id === interleavedAllocation[nonEventPick]?.partnerId)?.label ?? 'Slot'} selected</span>
                      <span>— click another slot to swap, or click it again to cancel</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                      Click a slot to select it, then click another slot to swap their positions
                    </div>
                  )
                )}

                <div style={S.slotGrid}>
                  {interleavedAllocation.map((slot, displayIdx) => {
                    const p            = slot.partnerId ? partners.find(pt => pt.id === slot.partnerId) : null;
                    const isPicked     = nonEventPick === displayIdx;
                    const isSwapTarget = nonEventPick !== null && nonEventPick !== displayIdx;
                    const pickedPartner = nonEventPick !== null ? partners.find(pt => pt.id === interleavedAllocation[nonEventPick]?.partnerId) : null;
                    return (
                      <div key={displayIdx}
                        style={{
                          ...S.slot(p ? p.color : undefined, p ? p.text : undefined, selectedSlot === displayIdx, false, false, false),
                          border: isPicked ? '2px solid #0D7C8F' : selectedSlot === displayIdx ? '2px solid #1B2A4A' : '1.5px solid transparent',
                          cursor: isSwapTarget ? 'copy' : 'pointer',
                          outline: isPicked ? '2px solid #0D7C8F' : 'none',
                          outlineOffset: 1,
                        }}
                        onClick={() => handleNonEventSlotClick(displayIdx)}
                        title={isPicked
                          ? `${p?.label ?? 'Slot'} selected — click another to swap`
                          : isSwapTarget
                            ? `Click to swap with ${pickedPartner?.label ?? 'selected slot'}`
                            : `Display pos ${displayIdx + 1} · ${p?.label ?? '—'} · ${slot.slotType}`}>
                        {p ? p.initials : '—'}
                      </div>
                    );
                  })}
                </div>
                {spareAllocation.length > 0 && (
                  <>
                    <div style={S.spareDivider}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)' }}>
                        Spare Inventory — {spareAllocation.length} slot{spareAllocation.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>· Click to promote to bonus</span>
                    </div>
                    <div style={S.slotGrid}>
                      {spareAllocation.map((slot, spareIdx) => {
                        const displayIdx = interleavedAllocation.length + spareIdx;
                        return (
                          <div key={spareIdx}
                            style={S.slotSpare(selectedSlot === displayIdx)}
                            onClick={() => { setNonEventPick(null); setSelectedSlot(displayIdx === selectedSlot ? null : displayIdx); }}
                            title={`Spare slot ${spareIdx + 1} · ${slot.slotType}`}>
                            —
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right panel */}
          <div>
            {isEventMode && selectedZoneId !== 'all' && selectedStateId !== 'all' ? (
              <>
                <SlotDetailPanel
                  slot={resolveDisplay(selectedSlot, cellInterleaved, cellSpare)}
                  slotIndex={selectedSlot}
                  partners={partners}
                  state={currentState}
                  interleavedCount={cellInterleaved.length}
                  onPromote={handlePromote}
                  onAssignSpare={handleAssignSpare}
                  onRevert={handleRevert}
                  onAddGuest={handleAddGuest}
                />
                <PartnerSummaryPanel slots={currentCellSlots} partners={partners} state={currentState} onNavigateToEvents={onNavigateToEvents} />
                <ValidationPanel issues={cellIssues} onNavigateToEvents={onNavigateToEvents} />
                {/* CDP-010 — active separation rules for this cell */}
                {rules.length > 0 && (() => {
                  // Only show rules where both partners have slots somewhere in this event matrix.
                  // Prevents NRMA/RAA (and any future rule partners) from showing as errors when
                  // they have no allocations in the current event.
                  const eventPartnerIds = new Set(
                    effectiveMatrix
                      ? Object.values(effectiveMatrix).flatMap(zoneStates =>
                          Object.values(zoneStates).flatMap(slots =>
                            slots.map(s => s.partnerId).filter(Boolean)
                          )
                        )
                      : []
                  );
                  const visibleRules = rules.filter(
                    r => eventPartnerIds.has(r.partnerA) && eventPartnerIds.has(r.partnerB)
                  );
                  if (!visibleRules.length) return null;
                  return (
                  <div style={S.card}>
                    <div style={{ ...S.cardTitle, marginBottom: 6 }}>Separation Rules</div>
                    {visibleRules.map(rule => {
                      const pA = partners.find(p => p.id === rule.partnerA);
                      const pB = partners.find(p => p.id === rule.partnerB);
                      const activeInCell = selectedZoneId !== 'all' && selectedStateId !== 'all' &&
                        currentCellSlots.some(s => s.partnerId === rule.partnerA) &&
                        currentCellSlots.some(s => s.partnerId === rule.partnerB);
                      return (
                        <div key={rule.id} style={{ fontSize: 11, padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#FEF3C7', color: '#92400E' }}>{rule.category}</span>
                            {activeInCell
                              ? <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#DCFCE7', color: '#166534' }}>active in this cell</span>
                              : <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>not in this cell</span>
                            }
                          </div>
                          <div style={{ color: 'var(--color-text-secondary)' }}>
                            {pA?.label ?? rule.partnerA} / {pB?.label ?? rule.partnerB} — {rule.minGapSlots} slot min gap
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}
              </>
            ) : !isEventMode ? (
              <>
                <SlotDetailPanel
                  slot={resolveDisplay(selectedSlot, interleavedAllocation, spareAllocation)}
                  slotIndex={selectedSlot}
                  partners={partners}
                  state={null}
                  interleavedCount={interleavedAllocation.length}
                  onPromote={handlePromote}
                  onAssignSpare={handleAssignSpare}
                  onRevert={handleRevert}
                  onAddGuest={handleAddGuest}
                />
                <PartnerSummaryPanel slots={activeAllocation} partners={partners} state={null} />
                <ValidationPanel issues={validateAllocation(partners, activeAllocation).issues.map(i => ({ ...i, severity: 'warning' }))} />
              </>
            ) : (
              <div style={S.card}>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Select a zone and state of play to view slot detail, or switch to <strong>Matrix Overview</strong>.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div style={S.pageBodyFull}>
          <div style={S.panelTitle}>Partner Entitlements — {eventType?.label}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 14 }}>
            Entitlements re-expressed in seconds (the invariant across all slot durations). Slot counts are derived (allocatedSecs ÷ slotDurationSecs).
            {isEventMode && ' Distribution across states is proportional to state duration.'}
          </div>
          {partners.map(p => {
            const contracted = p.contractedSecs ?? (p.contracted * 30);
            const bonus      = p.bonusSecs ?? 0;
            return (
              <div key={p.id} style={{ ...S.card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ ...S.partnerAvatar(p.color, p.text), width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>{p.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                    {p.guest && <span style={S.infoTag('amber')}>Guest</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>{p.pkg}</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Contracted</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{contracted}s</div>
                      <div style={{ color: 'var(--color-text-tertiary)' }}>= {contracted / 30} slots @ 30s</div>
                    </div>
                    {bonus > 0 && (
                      <div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Bonus</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#D97706' }}>{bonus}s</div>
                        <div style={{ color: 'var(--color-text-tertiary)' }}>= {bonus / 30} slots @ 30s</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Pieces</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{p.pieces}</div>
                      <div style={{ color: 'var(--color-text-tertiary)' }}>round-robin</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW TAB — CDP-013 */}
      {activeTab === 'preview' && (() => {
        // Resolve the slot sequence to preview.
        const previewZone  = ZONES.find(z => z.id === previewZoneId);
        const previewState = eventType?.states?.find(s => s.id === previewStateId);

        const rawSlots = isEventMode
          ? (effectiveMatrix?.[previewZoneId]?.[previewStateId] ?? [])
          : activeAllocation;

        const previewInterleaved = isEventMode
          ? (isCellOverridden(effectiveMatrix, previewZoneId, previewStateId)
              ? rawSlots.filter(s => s.partnerId !== null)
              : buildInterleavedDisplay(rawSlots, null).interleaved)
          : interleavedAllocation;

        const previewSpare = isEventMode
          ? rawSlots.filter(s => s.partnerId === null)
          : spareAllocation;

        const allPreviewSlots = [...previewInterleaved, ...previewSpare];
        const partnerMap = Object.fromEntries(partners.map(p => [p.id, p]));

        const filledCount = previewInterleaved.length;
        const spareCount  = previewSpare.length;
        const totalCount  = allPreviewSlots.length;

        // Build a content lookup: partnerId → array of content items (live/approved first)
        // Uses INITIAL_CONTENT via the `content` prop. Round-robins by contentPieceIdx.
        const contentByPartner = {};
        content.forEach(c => {
          if (!contentByPartner[c.partnerId]) contentByPartner[c.partnerId] = [];
          contentByPartner[c.partnerId].push(c);
        });
        // Sort each partner's content: live first, then approved, then others
        const statusOrder = { live: 0, approved: 1, pending: 2, uploaded: 3, scheduled: 4, rejected: 5 };
        Object.values(contentByPartner).forEach(arr =>
          arr.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))
        );

        // Resolve the content item for a given slot (by partnerId + contentPieceIdx round-robin)
        const resolveContent = (slot) => {
          if (!slot.partnerId) return null;
          const items = contentByPartner[slot.partnerId];
          if (!items?.length) return null;
          const idx = (slot.contentPieceIdx ?? 0) % items.length;
          return items[idx] ?? null;
        };

        // Generate an SVG placeholder thumbnail that looks like a content frame.
        // 16:9 aspect, dark background, partner colour bar at bottom, file type icon,
        // filename label. When real thumbnailUrl is available, this is replaced by <img>.
        const makeThumbnailSvg = (partner, contentItem) => {
          const bg       = '#1a1f2e';
          const accent   = partner?.color ?? '#2d3748';
          const textCol  = partner?.text  ?? '#fff';
          const isVideo  = contentItem?.type?.startsWith('video');
          const label    = contentItem
            ? contentItem.name.length > 22 ? contentItem.name.slice(0, 22) + '…' : contentItem.name
            : partner ? `${partner.label} — no content` : 'Spare';
          const icon     = isVideo ? '▶' : '⬜';
          const statusDot = contentItem
            ? { live: '#1D9E75', approved: '#639922', pending: '#378ADD', rejected: '#E24B4A', uploaded: '#888', scheduled: '#7F77DD' }[contentItem.status] ?? '#888'
            : '#555';

          return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
              <rect width="160" height="90" fill="${bg}" rx="2"/>
              <rect x="0" y="72" width="160" height="18" fill="${accent}" opacity="0.85"/>
              <text x="8" y="84" font-family="system-ui,sans-serif" font-size="8" fill="${textCol}" opacity="0.9">${label}</text>
              <text x="80" y="42" font-family="system-ui,sans-serif" font-size="18" fill="white" opacity="0.25" text-anchor="middle" dominant-baseline="middle">${icon}</text>
              ${contentItem ? `<circle cx="150" cy="8" r="5" fill="${statusDot}"/>` : ''}
              ${!contentItem && partner ? `<text x="80" y="38" font-family="system-ui,sans-serif" font-size="9" fill="white" opacity="0.35" text-anchor="middle">${partner.initials}</text>` : ''}
            </svg>
          `)}`;
        };

        // Content status badge
        const contentStatusBadge = (contentItem) => {
          if (!contentItem) return { label: 'No content', bg: '#F3F4F6', color: '#6B7280' };
          const map = {
            live:      { label: '● Live',      bg: '#E1F5EE', color: '#085041' },
            approved:  { label: '✓ Approved',  bg: '#EAF3DE', color: '#27500A' },
            pending:   { label: '⏳ Review',    bg: '#E6F1FB', color: '#0C447C' },
            uploaded:  { label: '↑ Uploaded',  bg: '#F3F4F6', color: '#555'    },
            scheduled: { label: '◷ Scheduled', bg: '#EEEDFE', color: '#3C3489' },
            rejected:  { label: '✕ Rejected',  bg: '#FCEBEB', color: '#791F1F' },
          };
          return map[contentItem.status] ?? { label: contentItem.status, bg: '#F3F4F6', color: '#555' };
        };

        // Content summary counts for header
        const contentSummary = previewInterleaved.reduce((acc, slot) => {
          const c = resolveContent(slot);
          const s = c?.status ?? 'none';
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {});

        // Slot type badge style
        const slotTypeBadge = (type) => ({
          fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3,
          background: type === 'contracted' ? '#EEF2FF' : type === 'bonus' ? '#CCFBF1' : '#F3F4F6',
          color:      type === 'contracted' ? '#3730A3' : type === 'bonus' ? '#134E4A' : '#6B7280',
        });

        return (
          <div style={S.pageBodyFull}>

            {/* Context selector — AFL only */}
            {isEventMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={S.contextLabel}>Zone</span>
                <select style={S.select} value={previewZoneId} onChange={e => setPreviewZoneId(e.target.value)}>
                  {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
                <div style={S.contextSep} />
                <span style={S.contextLabel}>State of Play</span>
                <select style={S.select} value={previewStateId} onChange={e => setPreviewStateId(e.target.value)}>
                  {eventType.states.map(s => (
                    <option key={s.id} value={s.id}>{s.label} ({s.slotCount} slots)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={S.card}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1B2A4A' }}>{totalCount}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {isEventMode ? `${previewZone?.label} · ${previewState?.label}` : 'Total slots'}
                </div>
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>{filledCount}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Partner slots</div>
              </div>
              {spareCount > 0 && (
                <div style={S.card}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#D97706' }}>{spareCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Spare slots</div>
                </div>
              )}
              {(contentSummary.live ?? 0) > 0 && (
                <div style={{ ...S.card, borderColor: '#1D9E75', background: '#E1F5EE' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#085041' }}>{contentSummary.live}</div>
                  <div style={{ fontSize: 11, color: '#085041' }}>Live content</div>
                </div>
              )}
              {((contentSummary.pending ?? 0) + (contentSummary.uploaded ?? 0)) > 0 && (
                <div style={{ ...S.card, borderColor: '#93C5FD', background: '#EFF6FF' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1E40AF' }}>{(contentSummary.pending ?? 0) + (contentSummary.uploaded ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#1E40AF' }}>Awaiting review</div>
                </div>
              )}
              {(contentSummary.none ?? 0) > 0 && (
                <div style={{ ...S.card, borderColor: '#FDE68A', background: '#FFFBEB' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#D97706' }}>{contentSummary.none}</div>
                  <div style={{ fontSize: 11, color: '#92400E' }}>No content</div>
                </div>
              )}
              {isEventMode && previewState?.isInPlay && (
                <div style={{ ...S.card, borderColor: '#93C5FD', background: '#EFF6FF' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF' }}>In-play state</div>
                  <div style={{ fontSize: 11, color: '#1E40AF', opacity: .8 }}>L-wrap / ribbon format required</div>
                </div>
              )}
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 56px 1fr 90px 72px 60px 100px',
              gap: '0 10px',
              padding: '6px 10px',
              borderRadius: 5,
              background: 'var(--color-background-secondary)',
              border: '0.5px solid var(--color-border-tertiary)',
              marginBottom: 4,
            }}>
              {['#', 'Preview', 'Partner / Content', 'Type', 'Format', 'Dur.', 'Status'].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)' }}>{h}</div>
              ))}
            </div>

            {/* Slot list */}
            <div style={{ maxHeight: 520, overflowY: 'auto', borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)' }}>
              {/* Partner rotation */}
              {previewInterleaved.length > 0 && (
                <>
                  {previewInterleaved.map((slot, idx) => {
                    const p          = slot.partnerId ? partnerMap[slot.partnerId] : null;
                    const dur        = slot.durationSecs ?? previewState?.defaultSlotDurationSecs ?? 30;
                    const fmt        = slot.displayFormat ?? 'fullscreen';
                    const isInPlay   = previewState?.isInPlay ?? false;
                    const isLast     = idx === previewInterleaved.length - 1 && previewSpare.length === 0;
                    const contentItem = resolveContent(slot);
                    const thumbSrc   = makeThumbnailSvg(p, contentItem);
                    const badge      = contentStatusBadge(contentItem);
                    return (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: '36px 56px 1fr 90px 72px 60px 100px',
                        gap: '0 10px',
                        padding: '6px 10px',
                        alignItems: 'center',
                        borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-tertiary)',
                        background: idx % 2 === 0 ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
                      }}>
                        {/* Position */}
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</div>
                        {/* Thumbnail — SVG placeholder, ready for real thumbnailUrl */}
                        <img
                          src={thumbSrc}
                          alt={contentItem?.name ?? p?.label ?? 'slot'}
                          style={{ width: 48, height: 27, borderRadius: 3, objectFit: 'cover', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0, display: 'block' }}
                        />
                        {/* Partner + content name */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p?.label ?? '—'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {contentItem?.name ?? 'No content assigned'}
                          </div>
                        </div>
                        {/* Slot type */}
                        <div><span style={slotTypeBadge(slot.slotType)}>{slot.slotType}</span></div>
                        {/* Format */}
                        <div><span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: isInPlay ? '#DBEAFE' : '#F3F4F6', color: isInPlay ? '#1E3A8A' : '#6B7280' }}>{fmt}</span></div>
                        {/* Duration */}
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{dur}s</div>
                        {/* Content status */}
                        <div><span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: badge.bg, color: badge.color }}>{badge.label}</span></div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Spare block */}
              {previewSpare.length > 0 && (
                <>
                  <div style={{
                    padding: '6px 10px',
                    borderTop: previewInterleaved.length > 0 ? '1px dashed var(--color-border-secondary)' : 'none',
                    background: 'var(--color-background-secondary)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)' }}>
                      Spare Inventory — {previewSpare.length} slot{previewSpare.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {previewSpare.map((slot, spareIdx) => {
                    const dur    = slot.durationSecs ?? previewState?.defaultSlotDurationSecs ?? 30;
                    const absIdx = previewInterleaved.length + spareIdx;
                    const isLast = spareIdx === previewSpare.length - 1;
                    return (
                      <div key={spareIdx} style={{
                        display: 'grid',
                        gridTemplateColumns: '36px 56px 1fr 90px 72px 60px 100px',
                        gap: '0 10px',
                        padding: '6px 10px',
                        alignItems: 'center',
                        borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-tertiary)',
                        background: absIdx % 2 === 0 ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
                        opacity: .55,
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{absIdx + 1}</div>
                        <img src={makeThumbnailSvg(null, null)} alt="spare" style={{ width: 48, height: 27, borderRadius: 3, objectFit: 'cover', border: '1px dashed var(--color-border-secondary)', display: 'block' }} />
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Spare slot</div>
                        <div><span style={slotTypeBadge('spare')}>spare</span></div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{dur}s</div>
                        <div><span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: '#F3F4F6', color: '#6B7280' }}>Unassigned</span></div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Empty state */}
              {allPreviewSlots.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  {isEventMode ? 'No slots for this zone and state.' : 'No slots in the rotation.'}
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10 }}>
              Content thumbnails and approval status will reflect live data when the backend is connected (CDP-016).
              {isEventMode && overrideCount > 0 && <span style={{ marginLeft: 8, color: '#0D7C8F', fontWeight: 500 }}>✎ {overrideCount} cell override{overrideCount !== 1 ? 's' : ''} active in this event.</span>}
            </div>
          </div>
        );
      })()}

      {/* EXPORT TAB */}
      {activeTab === 'export' && (
        <div style={S.pageBodyFull}>
          <div style={S.panelTitle}>MPI XML Export</div>
          {isEventMode && !effectiveMatrix && (
            <div style={{ ...S.card, background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div style={{ fontSize: 13, color: '#92400E' }}>Matrix not initialised. Select an event type to build the allocation.</div>
            </div>
          )}

          {/* Last push status */}
          {lastPush ? (
            <div style={{ ...S.card, borderColor: '#0D7C8F', background: '#F0FDFA', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#134E4A' }}>Last pushed to media player</div>
                  <div style={{ fontSize: 11, color: '#0D7C8F' }}>
                    {lastPush.label} · {lastPush.timestamp.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at {lastPush.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...S.card, borderColor: 'var(--color-border-secondary)', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Not yet pushed — no push recorded for this session.</div>
            </div>
          )}

          <div style={S.card}>
            <div style={S.cardTitle}>Export Summary</div>
            {isEventMode ? (
              <>
                <div style={S.summaryRow}><span>Event type</span><span style={{ fontWeight: 500 }}>{eventType?.label}</span></div>
                <div style={S.summaryRow}><span>Zones</span><span style={{ fontWeight: 500 }}>{ZONES.length}</span></div>
                <div style={S.summaryRow}><span>States of play</span><span style={{ fontWeight: 500 }}>{eventType?.states?.length}</span></div>
                <div style={S.summaryRow}><span>Playlist blocks</span><span style={{ fontWeight: 500 }}>{ZONES.length * (eventType?.states?.length ?? 0)}</span></div>
                <div style={S.summaryRow}><span>Total slots</span><span style={{ fontWeight: 500 }}>{ZONES.length * (eventType?.states?.reduce((s, st) => s + st.slotCount, 0) ?? 0)}</span></div>
                {overrideCount > 0 && (
                  <div style={S.summaryRow}>
                    <span>Cell overrides</span>
                    <span style={S.infoTag('teal')}>{overrideCount} custom cell{overrideCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div style={S.summaryRow}>
                  <span>Allocation validation</span>
                  <span style={{ fontWeight: 500, color: validation.totalErrors > 0 ? '#DC2626' : '#166534' }}>
                    {validation.totalErrors > 0 ? `✕ ${validation.totalErrors} error(s) — fix before push` : '✓ Valid'}
                  </span>
                </div>
                <div style={S.summaryRow}>
                  <span>Content gaps</span>
                  {contentGaps.length === 0
                    ? <span style={{ fontWeight: 500, color: '#166534' }}>✓ All partners have approved content</span>
                    : <span style={{ fontWeight: 500, color: '#D97706' }}>⚠ {contentGaps.length} partner{contentGaps.length !== 1 ? 's' : ''} with no approved content</span>
                  }
                </div>
                {revenue && (
                  <div style={S.summaryRow}>
                    <span>Revenue estimate</span>
                    <span style={{ fontWeight: 700, color: '#0D7C8F' }}>
                      {revenue.totalEvent.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })} / game
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={S.summaryRow}><span>Mode</span><span style={{ fontWeight: 500 }}>Non-Event / Background Rotation</span></div>
                <div style={S.summaryRow}><span>Slots</span><span style={{ fontWeight: 500 }}>120 × 30s</span></div>
                <div style={S.summaryRow}><span>Playlist blocks</span><span style={{ fontWeight: 500 }}>1</span></div>
                {nonEventOverride !== null && (
                  <div style={S.summaryRow}>
                    <span>Rotation</span>
                    <span style={S.infoTag('teal')}>✎ Modified from base</span>
                  </div>
                )}
                <div style={S.summaryRow}>
                  <span>Content gaps</span>
                  {contentGaps.length === 0
                    ? <span style={{ fontWeight: 500, color: '#166534' }}>✓ All partners have approved content</span>
                    : <span style={{ fontWeight: 500, color: '#D97706' }}>⚠ {contentGaps.length} partner{contentGaps.length !== 1 ? 's' : ''} with no approved content</span>
                  }
                </div>
              </>
            )}
          </div>

          {/* Active separation rules */}
          {rules.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Active Separation Rules</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                Violations are hard errors — the matrix must pass all separation checks before pushing.
              </div>
              {rules.map(rule => (
                <div key={rule.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <span style={{ ...S.infoTag('amber'), flexShrink: 0, marginTop: 1 }}>{rule.category}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{rule.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      Scope: {rule.scope === 'all' ? 'All zones and states' : rule.scope}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={S.btnGroup}>
            <button
              style={S.btn(validation.totalErrors > 0 && isEventMode ? 'ghost' : 'primary')}
              onClick={() => setShowPushModal(true)}
              disabled={validation.totalErrors > 0 && isEventMode}>
              Push to Media Player
            </button>
            <button style={S.btn('ghost')} onClick={handleGenerateXml} disabled={validation.totalErrors > 0 && isEventMode}>
              Generate MPI XML only
            </button>
            <button style={S.btn('ghost')} onClick={() => setActiveTab('preview')}>
              ← Preview Playlist
            </button>
            {validation.totalErrors > 0 && isEventMode && (
              <span style={{ fontSize: 12, color: '#DC2626', alignSelf: 'center' }}>Resolve {validation.totalErrors} error(s) first</span>
            )}
          </div>
        </div>
      )}

      {/* Push confirmation modal */}
      {showPushModal && (
        <div style={S.modal} onClick={() => setShowPushModal(false)}>
          <div style={S.modalBoxSm} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Push to Media Player</div>

            {/* Gap summary */}
            {contentGaps.length > 0 ? (() => {
              const totalMissingSecs = contentGaps.reduce((s, g) => s + g.missingSecs, 0);
              const fmtMins = (secs) => {
                const m = Math.floor(secs / 60), s2 = secs % 60;
                return s2 > 0 ? `${m}m ${s2}s` : `${m}m`;
              };
              return (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 6 }}>
                    ⚠ {contentGaps.length} partner{contentGaps.length !== 1 ? 's' : ''} have no approved content
                  </div>
                  <div style={{ fontSize: 11, color: '#78350F', marginBottom: 10 }}>
                    Empty slots will be skipped by the media player — approximately{' '}
                    <strong>{fmtMins(totalMissingSecs)}</strong> of content will be missing from the playlist.
                    The player will loop or freeze on the last piece of content to fill the remaining time.
                    You can manage content from the Review Queue after pushing.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {contentGaps.map(g => (
                      <div key={g.partner?.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 5, background: 'rgba(255,255,255,.6)' }}>
                        <div style={{ ...S.partnerAvatar(g.partner?.color, g.partner?.text), width: 20, height: 20, fontSize: 8, flexShrink: 0 }}>
                          {g.partner?.initials ?? '?'}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{g.partner?.label ?? 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: '#92400E' }}>
                          {g.noContent} slot{g.noContent !== 1 ? 's' : ''} · ~{fmtMins(g.missingSecs)} missing
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>✓ All partners have approved content</div>
                <div style={{ fontSize: 11, color: '#166534', opacity: .8, marginTop: 3 }}>Ready to push.</div>
              </div>
            )}

            {/* Push summary */}
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Pushing will generate the MPI XML bundle
              {isEventMode
                ? ` for ${selectedEvent?.name ?? eventType?.label} — ${ZONES.length * (eventType?.states?.length ?? 0)} playlist blocks`
                : ' for the Non-Event background rotation — 1 playlist block'
              } and record the push timestamp.
            </div>

            <div style={S.btnGroup}>
              <button style={S.btn('primary')} onClick={handlePush}>
                {contentGaps.length > 0 ? 'Push anyway' : 'Push to Media Player'}
              </button>
              <button style={S.btn('ghost')} onClick={() => setShowPushModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* XML modal */}
      {showXml && (
        <div style={S.modal} onClick={() => setShowXml(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>MPI XML — {eventType?.label}</div>
              <button style={S.btn('ghost')} onClick={() => setShowXml(false)}>✕ Close</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              {isEventMode ? `${ZONES.length * (eventType?.states?.length ?? 0)} playlist blocks · ${xmlContent.split('\n').length} lines` : '1 playlist block'}
            </div>
            <pre style={S.xmlPre}>{xmlContent}</pre>
            <div style={S.btnGroup}>
              <button style={S.btn('primary')} onClick={handleCopyXml}>Copy to Clipboard</button>
              <button style={S.btn('ghost')} onClick={() => setShowXml(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Rate config modal */}
      {showRates && (
        <RateConfigModal customRates={customRates} onSave={handleSaveRates} onClose={() => setShowRates(false)} />
      )}

      {/* CDP-034 — Mode switch confirmation modal */}
      {showModeConfirm && (
        <ModeConfirmModal
          targetMode={showModeConfirm}
          onConfirm={handleModeConfirm}
          onCancel={() => setShowModeConfirm(null)}
        />
      )}
    </div>
  );
}
