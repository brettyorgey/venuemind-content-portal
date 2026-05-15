// Partner definitions
export const PARTNERS_DATA = {
  maccas: { id: "maccas", name: "McDonald's", slots: 12, pieces: 5, package: "Package 1", initials: "M", color: "#FAEEDA", textColor: "#854F0B" },
  iren: { id: "iren", name: "Iren Energy", slots: 24, pieces: 2, package: "Package 2 & 3", initials: "IE", color: "#E6F1FB", textColor: "#0C447C" },
  sapol: { id: "sapol", name: "SA Police", slots: 12, pieces: 1, package: "Package 5", initials: "SP", color: "#EEEDFE", textColor: "#3C3489" },
  disney: { id: "disney", name: "Disney+", slots: 12, pieces: 1, package: "Spare Package 1", initials: "D+", color: "#E1F5EE", textColor: "#085041" },
  afl: { id: "afl", name: "AFL", slots: 48, pieces: 3, package: "League Content", initials: "AF", color: "#FCEBEB", textColor: "#791F1F" },
};

// Content validation specs
export const CONTENT_SPECS = {
  formats: ["image/png", "image/jpeg", "video/mp4"],
  maxFileSize: 50 * 1024 * 1024,
  width: 1920,
  height: 1080,
  maxDuration: 30,
};

// Content lifecycle states
export const STATES = {
  uploaded: { label: "Uploaded", bg: "#f0efeb", color: "#5f5e5a", dot: "#888780" },
  pending: { label: "Under review", bg: "#E6F1FB", color: "#0C447C", dot: "#378ADD" },
  approved: { label: "Approved", bg: "#EAF3DE", color: "#27500A", dot: "#639922" },
  rejected: { label: "Rejected", bg: "#FCEBEB", color: "#791F1F", dot: "#E24B4A" },
  scheduled: { label: "Scheduled", bg: "#EEEDFE", color: "#3C3489", dot: "#7F77DD" },
  live: { label: "Live", bg: "#E1F5EE", color: "#085041", dot: "#1D9E75" },
};

// Initial content across all partners
export const INITIAL_CONTENT = [];

// Simulated PoP data matching VisionEDGE record structure
// Note: POP_ZONES and POP_DMPS are internal to generatePopRecords() only.
// The exported ZONES constant below defines the venue zone architecture.
const POP_ZONES = ["Concourse A", "Concourse B", "Concourse C", "Gate 1 Entry", "Members Bar"];
const POP_DMPS  = ["DMP-CA-01", "DMP-CA-02", "DMP-CA-03", "DMP-CB-01", "DMP-CB-02", "DMP-CC-01", "DMP-CC-02", "DMP-G1-01", "DMP-MB-01", "DMP-MB-02"];

export function generatePopRecords() {
  const records = [];
  const liveContent = [
    { filename: "maccas_summer_hero_1920x1080.mp4", name: "Summer Campaign Hero", sponsorTag: "McDonalds" },
    { filename: "maccas_mccafe_autumn.mp4", name: "McCafe Autumn", sponsorTag: "McDonalds" },
  ];
  const start = new Date("2026-04-01"), end = new Date("2026-04-18");
  let id = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split("T")[0];
    for (let p = 0; p < 12 + Math.floor(Math.random() * 4); p++) {
      const c    = liveContent[Math.floor(Math.random() * liveContent.length)];
      const h    = 8 + Math.floor(Math.random() * 14), m = Math.floor(Math.random() * 60);
      const zone = POP_ZONES[Math.floor(Math.random() * POP_ZONES.length)];
      const di   = POP_ZONES.indexOf(zone);
      records.push({
        id: id++, date: ds,
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
        contentFilename: c.filename, contentName: c.name, sponsorTag: c.sponsorTag,
        zone, dmp: POP_DMPS[Math.min(di * 2 + Math.floor(Math.random() * 2), POP_DMPS.length - 1)],
        group: zone.startsWith("Concourse") ? "Concourses" : zone === "Members Bar" ? "Premium" : "Entry",
        script: "NonEvent_Weekly_R1", playlist: "Non-Event Rotation A",
        duration: 30, region: "Adelaide Oval",
      });
    }
  }
  return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALLOCATION BUILDER
// ─────────────────────────────────────────────────────────────────────────────

// Slot type enum — used throughout the allocation system and PoP pipeline
export const SLOT_TYPES = {
  CONTRACTED: 'contracted', // Locked to partner's package; cannot be reassigned from the grid
  BONUS:      'bonus',      // Venue-controlled flexible inventory; assignable per event
  SPARE:      'spare',      // Unassigned flexible inventory; can be promoted to bonus or assigned directly
};

// Avatar colour palette for new partner creation — distinct from GUEST_COLORS,
// these are for permanent partners added via Partner Management.
export const AVATAR_COLORS = [
  { color: '#FAEEDA', text: '#854F0B' },  // amber
  { color: '#E6F1FB', text: '#0C447C' },  // blue
  { color: '#B5D4F4', text: '#185FA5' },  // mid blue
  { color: '#EEEDFE', text: '#3C3489' },  // violet
  { color: '#FCEBEB', text: '#791F1F' },  // red
  { color: '#E1F5EE', text: '#085041' },  // green
  { color: '#FFF3E0', text: '#8A5200' },  // orange
  { color: '#F5E6FB', text: '#6B2F8A' },  // purple
  { color: '#E8F5E9', text: '#1B5E20' },  // dark green
  { color: '#FCE4EC', text: '#880E4F' },  // pink
  { color: '#E0F7FA', text: '#006064' },  // teal
  { color: '#FFF8E1', text: '#7B4B00' },  // gold
];

// Guest partner colour pool — cycled as guest partners are added
export const GUEST_COLORS = [
  { color: '#F5E6FB', text: '#6B2F8A' },
  { color: '#FFF3E0', text: '#8A5200' },
  { color: '#E8F5E9', text: '#1B5E20' },
  { color: '#FCE4EC', text: '#880E4F' },
  { color: '#E0F7FA', text: '#006064' },
];

// Base contracted partners — mirrors the GR Calculator as-built state.
// contracted    = legacy slot count (non-event 120-slot rotation). Retained for backwards compatibility.
// contractedSecs= airtime in seconds from the commercial agreement (source of truth for zone/state model).
//                 Derived from GR Calculator: contracted slots × 30s default slot duration.
// bonusSecs     = bonus airtime in seconds (venue-controlled, not partner entitlement).
//                 Maccas only: 2 GR bonus slots × 30s = 60s.
// pieces        = number of approved content pieces available for round-robin assignment.
// The 'guest' flag distinguishes one-off event partners from contracted partners.
export const BASE_PARTNERS = [
  {
    id:              'maccas',
    label:           "McDonald's",
    initials:        'M',
    pkg:             'Package 1',
    contracted:      12,
    contractedSecs:  360,
    bonusSecs:       60,
    pieces:          5,
    color:           '#FAEEDA',
    text:            '#854F0B',
    guest:           false,
  },
  {
    id:              'iren1',
    label:           'Iren Energy 1',
    initials:        'IE',
    pkg:             'Package 2',
    contracted:      12,
    contractedSecs:  360,
    bonusSecs:       0,
    pieces:          1,
    color:           '#E6F1FB',
    text:            '#0C447C',
    guest:           false,
  },
  {
    id:              'iren2',
    label:           'Iren Energy 2',
    initials:        'IE2',
    pkg:             'Package 3',
    contracted:      12,
    contractedSecs:  360,
    bonusSecs:       0,
    pieces:          1,
    color:           '#B5D4F4',
    text:            '#185FA5',
    guest:           false,
  },
  {
    id:              'sapol',
    label:           'SA Police',
    initials:        'SP',
    pkg:             'Package 5',
    contracted:      12,
    contractedSecs:  360,
    bonusSecs:       0,
    pieces:          1,
    color:           '#EEEDFE',
    text:            '#3C3489',
    guest:           false,
  },
  {
    id:              'afl',
    label:           'AFL',
    initials:        'AF',
    pkg:             'League Content',
    contracted:      48,
    contractedSecs:  1440,
    bonusSecs:       0,
    pieces:          3,
    color:           '#FCEBEB',
    text:            '#791F1F',
    guest:           false,
  },
  {
    id:              'disney',
    label:           'Disney+',
    initials:        'D+',
    pkg:             'Spare Package 1',
    contracted:      12,
    contractedSecs:  360,
    bonusSecs:       0,
    pieces:          1,
    color:           '#E1F5EE',
    text:            '#085041',
    guest:           false,
  },
  {
    id:              'nrma',
    label:           'NRMA Insurance',
    initials:        'NR',
    pkg:             'Insurance Package (Placeholder)',
    contracted:      6,
    contractedSecs:  180,
    bonusSecs:       0,
    pieces:          1,
    color:           '#FEF9C3',
    text:            '#713F12',
    guest:           false,
    placeholder:     true,  // prototype only — replace with real partner when live
  },
  {
    id:              'raa',
    label:           'RAA Insurance',
    initials:        'RA',
    pkg:             'Insurance Package (Placeholder)',
    contracted:      6,
    contractedSecs:  180,
    bonusSecs:       0,
    pieces:          1,
    color:           '#FEE2E2',
    text:            '#7F1D1D',
    guest:           false,
    placeholder:     true,  // prototype only — replace with real partner when live
  },
];

// Per-event-type base rotation blocks (Phase 2 — Item 7).
// AFL events treat Disney+ as a 2-slot bonus (GR bonus slots) rather than contracted,
// reflecting that Disney+ is not in the AFL commercial package by default.
// Non-event unchanged for backwards compatibility.
export const BASE_ROTATION_BLOCKS = {
  non_event: [
    { partnerId: 'maccas', count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'iren1',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'iren2',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'sapol',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'afl',    count: 48, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'disney', count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'nrma', count: 6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'raa',  count: 6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: null,     count: 12, slotType: SLOT_TYPES.SPARE },
  ],
  afl: [
    { partnerId: 'maccas', count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'iren1',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'iren2',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'sapol',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'afl',    count: 48, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'disney', count:  2, slotType: SLOT_TYPES.BONUS },
    { partnerId: 'nrma', count: 6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'raa',  count: 6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: null,     count: 22, slotType: SLOT_TYPES.SPARE },
  ],
  // CDP-033 — Function event type base rotation.
  // Conservative allocation — category sponsors are the primary commercial use case.
  function: [
    { partnerId: 'maccas', count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'iren1',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'iren2',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'sapol',  count: 12, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'disney', count:  6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'nrma',   count:  6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: 'raa',    count:  6, slotType: SLOT_TYPES.CONTRACTED },
    { partnerId: null,     count: 54, slotType: SLOT_TYPES.SPARE },
  ],
};

// Builds the default 120-slot non-event allocation from the GR Calculator baseline.
// Retained for backwards compatibility. New code should use buildBaseAllocationForEvent().
export function buildDefaultAllocation() {
  return BASE_ROTATION_BLOCKS.non_event.flatMap(({ partnerId, count, slotType }) =>
    Array(count).fill(null).map(() => ({ partnerId, slotType }))
  );
}

// Builds the base 120-slot allocation for a given event type (Phase 2 — Item 7).
// Falls back to non_event blocks if no event-type-specific blocks are defined.
export function buildBaseAllocationForEvent(eventTypeId) {
  const blocks = BASE_ROTATION_BLOCKS[eventTypeId] ?? BASE_ROTATION_BLOCKS.non_event;
  return blocks.flatMap(({ partnerId, count, slotType }) =>
    Array(count).fill(null).map(() => ({ partnerId, slotType }))
  );
}

// Generates the MPI XML payload from the current allocation state.
// slot_type and partner attributes are VenueMind extensions — non-standard
// for VisionEDGE but harmless as unknown attributes and critical for PoP correlation.
export function generateMpiXml({ partners, allocation, playlistName = 'Adelaide Oval — Hourly Rotation', eventId = 'evt-000', zoneId = 'zone', stateId = 'rotation' }) {
  // Structured playlist ID: {eventId}_{zoneId}_{stateId}
  // Deterministic — re-generating for the same event/zone/state always produces the same ID.
  // This gives the system a stable handle for the delete-before-recreate pattern (CDP-038).
  const playlistId = `${eventId}_${zoneId}_${stateId}`;

  // PoP ID helper: {rawEventId}_{zoneShort}_{stateShort}_{slot3digits}_{partnerId}
  // rawEventId strips hyphens and caps at 8 chars for field length safety.
  const rawEvt  = eventId.replace(/-/g, '').slice(0, 8);
  // Zone and state shortCodes — look up from ZONES if available, else fall back to id
  const zoneRec  = ZONES.find(z => z.id === zoneId);
  const zShort   = zoneRec?.shortCode ?? zoneId.slice(0, 4).toUpperCase();
  const makePopId = (slotIdx, partnerId) =>
    `${rawEvt}_${zShort}_ROT_${String(slotIdx + 1).padStart(3, '0')}_${(partnerId || 'spare').slice(0, 8)}`;

  // Build content registry (contracted + guest partners with pieces)
  let cid = 1;
  const contentRegistry = {}; // partnerId -> [contentId, ...]
  const contentLines = [];

  partners
    .filter(p => p.pieces > 0)
    .forEach((p, pi) => {
      contentRegistry[p.id] = [];
      for (let pc = 1; pc <= p.pieces; pc++) {
        contentRegistry[p.id].push(cid);
        contentLines.push(
          `    <content id="${cid}" filename="${p.id}_${String(pc).padStart(2, '0')}.mp4"` +
          ` description="${p.label} — piece ${pc}"` +
          ` sponsor_id="${pi + 1}" sponsor_name="${p.label}" active="true"/>`
        );
        cid++;
      }
    });

  // Round-robin content assignment per partner
  const cursors = {};
  partners.forEach(p => { cursors[p.id] = 0; });

  const slotLines = allocation.map((slot, i) => {
    let contentId = 0;
    if (slot.partnerId && contentRegistry[slot.partnerId]) {
      const pool = contentRegistry[slot.partnerId];
      contentId = pool[cursors[slot.partnerId] % pool.length];
      cursors[slot.partnerId]++;
    }
    return (
      `      <slot slotId="${i + 1}" popId="${makePopId(i, slot.partnerId)}" contentId="${contentId}"` +
      ` duration="30" slot_type="${slot.slotType}" partner="${slot.partnerId || 'spare'}"/>`
    );
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- VenueMind Content Delivery Portal — venue-controlled inventory model -->`,
    `<!-- Generated: ${new Date().toISOString()} -->`,
    `<!-- PlaylistID: ${playlistId} — stable key for CDP-038 delete-before-recreate -->`,
    `<playlistbundle xmlns="http://www.wipro.com/visionedge/mpi">`,
    `  <contents>`,
    ...contentLines,
    `  </contents>`,
    `  <playlists>`,
    `    <playlist id="${playlistId}" version="1" name="${playlistName}"`,
    `              description="120-slot 60-min loop · venue-controlled inventory"`,
    `              pop="true" resolution="1920x1080" defaultSlotDuration="30">`,
    `      <slots>`,
    ...slotLines,
    `      </slots>`,
    `    </playlist>`,
    `  </playlists>`,
    `</playlistbundle>`,
  ].join('\n');
}

// Validates the current allocation state.
// Returns { valid: bool, issues: string[] }
export function validateAllocation(partners, allocation) {
  const issues = [];

  partners.forEach(p => {
    const contracted = allocation.filter(
      s => s.partnerId === p.id && s.slotType === SLOT_TYPES.CONTRACTED
    ).length;
    if (contracted !== p.contracted) {
      issues.push(`${p.label}: ${contracted}/${p.contracted} contracted slots filled`);
    }
  });

  const bonusUnassigned = allocation.filter(
    s => s.slotType === SLOT_TYPES.BONUS && !s.partnerId
  ).length;
  if (bonusUnassigned > 0) {
    issues.push(`${bonusUnassigned} bonus slot(s) marked but not assigned to a partner`);
  }

  return { valid: issues.length === 0, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE & STATE OF PLAY ARCHITECTURE
// Phase 1 implementation — AFL Football event type
// ─────────────────────────────────────────────────────────────────────────────

// Display format enum — drives creative specification requirements and
// in-play constraint validation. In-play states (Q1–Q4) require lwrap or ribbon;
// fullscreen is blocked during live play.
export const DISPLAY_FORMATS = {
  FULLSCREEN: 'fullscreen',
  LWRAP:      'lwrap',
  RIBBON:     'ribbon',
};

// Venue zone definitions — groups of physical screens (DMPs) that receive the
// same playlist simultaneously. Zone routing is native to VisionEDGE DSD
// (Zone → Group → Location → DMP hierarchy). VenueMind outputs one playlist
// block per zone × state; DSD handles fan-out to individual DMPs.
// Zone definitions are venue-specific configuration — not hardcoded to AFL.
export const ZONES = [
  {
    id:          'concourse',
    label:       'General Concourse',
    shortCode:   'CA',          // used in playlist IDs and popIds
    dmpPattern:  'DMP-CA-*, DMP-CB-*, DMP-CC-*',
    pricingTier: 'standard',
    baseRateAUD: 15,
    sortOrder:   1,
  },
  {
    id:          'gate1',
    label:       'Gate 1 Entry',
    shortCode:   'G1',
    dmpPattern:  'DMP-G1-*',
    pricingTier: 'premium',
    baseRateAUD: 20,
    sortOrder:   2,
  },
  {
    id:          'members_bar',
    label:       'Members Bar',
    shortCode:   'MB',
    dmpPattern:  'DMP-MB-*',
    pricingTier: 'premium_plus',
    baseRateAUD: 25,
    sortOrder:   3,
  },
  {
    id:          'corp_suites',
    label:       'Corporate Suites',
    shortCode:   'CS',
    dmpPattern:  'DMP-CS-*',
    pricingTier: 'premium_plus',
    baseRateAUD: 25,
    sortOrder:   4,
  },
  {
    id:          'corp_functions',
    label:       'Corporate Functions',
    shortCode:   'CF',
    dmpPattern:  'DMP-CF-*',
    pricingTier: 'standard_plus',
    baseRateAUD: 15,
    sortOrder:   5,
  },
];

// AFL States of Play — 10 states defining game periods for an AFL event.
// slotCount assumes defaultSlotDurationSecs. If slot duration changes,
// slotCount = stateDurationSecs / slotDurationSecs (always derived, never stored).
// isInPlay: true blocks fullscreen format — lwrap/ribbon required.
// commercialPriority drives revenue calculator weighting in Phase 2.
export const AFL_STATES = [
  {
    id:                      'gates_open',
    shortCode:               'GO',
    label:                   'Gates Open',
    durationSecs:            5400,   // 90 min
    defaultSlotDurationSecs: 30,
    slotCount:               180,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'high',
    sortOrder:               1,
    notes:                   'Highest dwell — branding and F&B promotions',
  },
  {
    id:                      'one_hour_prior',
    shortCode:               '1HP',
    label:                   '1 Hour Prior',
    durationSecs:            3600,   // 60 min
    defaultSlotDurationSecs: 30,
    slotCount:               120,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'medium',
    sortOrder:               2,
    notes:                   'Club content primary, commercial secondary',
  },
  {
    id:                      'q1',
    shortCode:               'Q1',
    label:                   '1st Quarter',
    durationSecs:            1500,   // 25 min
    defaultSlotDurationSecs: 30,
    slotCount:               50,
    defaultFormat:           DISPLAY_FORMATS.LWRAP,
    isInPlay:                true,
    commercialPriority:      'medium',
    sortOrder:               3,
    notes:                   'In-play — creative must allow game visibility',
  },
  {
    id:                      'quarter_time',
    shortCode:               'QT',
    label:                   'Quarter Time',
    durationSecs:            360,    // 6 min
    defaultSlotDurationSecs: 30,
    slotCount:               12,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'medium',
    sortOrder:               4,
    notes:                   'Short but captive — fan engagement and F&B',
  },
  {
    id:                      'q2',
    shortCode:               'Q2',
    label:                   '2nd Quarter',
    durationSecs:            1500,
    defaultSlotDurationSecs: 30,
    slotCount:               50,
    defaultFormat:           DISPLAY_FORMATS.LWRAP,
    isInPlay:                true,
    commercialPriority:      'medium',
    sortOrder:               5,
    notes:                   'In-play — creative must allow game visibility',
  },
  {
    id:                      'half_time',
    shortCode:               'HT',
    label:                   'Half Time',
    durationSecs:            1200,   // 20 min
    defaultSlotDurationSecs: 30,
    slotCount:               40,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'high',
    sortOrder:               6,
    notes:                   'Longest break — highest commercial value state',
  },
  {
    id:                      'q3',
    shortCode:               'Q3',
    label:                   '3rd Quarter',
    durationSecs:            1500,
    defaultSlotDurationSecs: 30,
    slotCount:               50,
    defaultFormat:           DISPLAY_FORMATS.LWRAP,
    isInPlay:                true,
    commercialPriority:      'medium',
    sortOrder:               7,
    notes:                   'In-play — creative must allow game visibility',
  },
  {
    id:                      'three_quarter_time',
    shortCode:               '3QT',
    label:                   '3/4 Time',
    durationSecs:            360,
    defaultSlotDurationSecs: 30,
    slotCount:               12,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'medium',
    sortOrder:               8,
    notes:                   'Short but captive — post-game offers',
  },
  {
    id:                      'q4',
    shortCode:               'Q4',
    label:                   '4th Quarter',
    durationSecs:            1500,
    defaultSlotDurationSecs: 30,
    slotCount:               50,
    defaultFormat:           DISPLAY_FORMATS.LWRAP,
    isInPlay:                true,
    commercialPriority:      'medium',
    sortOrder:               9,
    notes:                   'In-play — creative must allow game visibility',
  },
  {
    id:                      'post_game',
    shortCode:               'PG',
    label:                   'Post Game',
    durationSecs:            3600,   // 60 min
    defaultSlotDurationSecs: 30,
    slotCount:               120,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'low',
    sortOrder:               10,
    notes:                   'Departing crowd — post-game and F&B offers',
  },
];

// Total slots per zone for a full AFL game: 684
// 180 + 120 + 50 + 12 + 50 + 40 + 50 + 12 + 50 + 120
export const AFL_TOTAL_SLOTS_PER_ZONE = AFL_STATES.reduce((sum, s) => sum + s.slotCount, 0);

// ─────────────────────────────────────────────────────────────────────────────
// CDP-033 — Function / Conference event type
// ─────────────────────────────────────────────────────────────────────────────
export const FUNCTION_STATES = [
  {
    id:                      'pre_function',
    shortCode:               'PRE',
    label:                   'Pre-Function (Arrival)',
    durationSecs:            3600,
    defaultSlotDurationSecs: 30,
    slotCount:               120,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'high',
    sortOrder:               1,
    notes:                   'Guest arrival and registration — high dwell, branding and welcome messaging',
  },
  {
    id:                      'function_main',
    shortCode:               'MAIN',
    label:                   'Function (Main Event)',
    durationSecs:            7200,
    defaultSlotDurationSecs: 30,
    slotCount:               240,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'high',
    sortOrder:               2,
    notes:                   'Primary session — highest commercial value state for category sponsors',
  },
  {
    id:                      'function_break',
    shortCode:               'BRK',
    label:                   'Break',
    durationSecs:            1800,
    defaultSlotDurationSecs: 30,
    slotCount:               60,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'medium',
    sortOrder:               3,
    notes:                   'Catering and networking — F&B partner promotions, wayfinding',
  },
  {
    id:                      'post_function',
    shortCode:               'POST',
    label:                   'Post-Function (Departure)',
    durationSecs:            1800,
    defaultSlotDurationSecs: 30,
    slotCount:               60,
    defaultFormat:           DISPLAY_FORMATS.FULLSCREEN,
    isInPlay:                false,
    commercialPriority:      'low',
    sortOrder:               4,
    notes:                   'Departing guests — venue branding and next event promotion',
  },
];

// Total slots per zone for a standard Function booking: 480
export const FUNCTION_TOTAL_SLOTS_PER_ZONE = FUNCTION_STATES.reduce((sum, s) => sum + s.slotCount, 0);

// Event type template registry.
// states: null = use legacy single-rotation model (non-event).
// Adding a new event type requires only a new entry here — no code changes elsewhere.
export const EVENT_TYPES = [
  {
    id:           'non_event',
    label:        'Non-Event / Background',
    states:       null,
    slotsPerZone: 120,
    status:       'active',
  },
  {
    id:           'afl',
    label:        'AFL Football',
    states:       AFL_STATES,
    slotsPerZone: AFL_TOTAL_SLOTS_PER_ZONE,
    status:       'active',
  },
  // CDP-033 — Function / Conference event type
  {
    id:           'function',
    label:        'Function / Conference',
    states:       FUNCTION_STATES,
    slotsPerZone: FUNCTION_TOTAL_SLOTS_PER_ZONE,
    status:       'active',
  },
  {
    id:           'cricket_t20',
    label:        'Cricket (T20)',
    states:       null,
    slotsPerZone: null,
    status:       'planned',   // Phase 2
  },
  {
    id:           'cricket_test',
    label:        'Cricket (Test / ODI)',
    states:       null,
    slotsPerZone: null,
    status:       'planned',   // Phase 2
  },
  {
    id:           'concert',
    label:        'Concert / Live Event',
    states:       null,
    slotsPerZone: null,
    status:       'planned',   // Phase 2
  },
];

// Partner entitlements — sourced from commercial agreements, re-expressed from
// the GR Calculator baseline in seconds (the invariant across all slot durations).
// zoneId: null  = applies across all zones (GR Calculator did not specify zones).
// stateId: null = distributed across all states proportionally by state duration.
// allocatedSecs is the source of truth. Slot count is always derived:
//   slotCount = allocatedSecs / slotDurationSecs  (never stored as primary value)
// The commercial team should update these when zone/state-specific agreements exist.
export const PARTNER_ENTITLEMENTS = [
  {
    partnerId:        'maccas',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    360,
    bonusSecs:        60,
    slotDurationSecs: 30,
    notes:            'GR Calculator baseline. Package 1 incl. 2 GR bonus slots.',
  },
  {
    partnerId:        'iren1',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    360,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'GR Calculator baseline. Package 2.',
  },
  {
    partnerId:        'iren2',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    360,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'GR Calculator baseline. Package 3.',
  },
  {
    partnerId:        'sapol',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    360,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'GR Calculator baseline. Package 5.',
  },
  {
    partnerId:        'afl',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    1440,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'GR Calculator baseline. League Content.',
  },
  {
    partnerId:        'disney',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    360,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'GR Calculator baseline. Spare Package 1.',
  },
  {
    partnerId:        'nrma',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    180,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'Placeholder — Insurance Package.',
  },
  {
    partnerId:        'raa',
    zoneId:           null,
    stateId:          null,
    allocatedSecs:    180,
    bonusSecs:        0,
    slotDurationSecs: 30,
    notes:            'Placeholder — Insurance Package.',
  },
];

// Resolves the most specific entitlement for a partner × zone × state combination.
// Follows the four-level inheritance chain (Phase 2 will add zone/state overrides):
//   Level 4 (most specific): exact zone + state match
//   Level 3: zone match, any state
//   Level 2: any zone, state match
//   Level 1 (least specific): global (zone:null, state:null)
export function resolveEntitlement(partnerId, zoneId, stateId) {
  const matches = PARTNER_ENTITLEMENTS.filter(e => e.partnerId === partnerId);
  if (!matches.length) return null;
  const cell      = matches.find(e => e.zoneId === zoneId  && e.stateId === stateId);
  const zoneOnly  = matches.find(e => e.zoneId === zoneId  && e.stateId === null);
  const stateOnly = matches.find(e => e.zoneId === null    && e.stateId === stateId);
  const global    = matches.find(e => e.zoneId === null    && e.stateId === null);
  return cell || zoneOnly || stateOnly || global || null;
}

// Derives slot count from allocated seconds and slot duration.
// Also checks piece-count conformance (equal rotation across all content pieces).
// Returns { slotCount, remainder, conformant }
export function deriveSlotCount(allocatedSecs, slotDurationSecs, pieceCount) {
  const slotCount  = Math.floor(allocatedSecs / slotDurationSecs);
  const remainder  = allocatedSecs - (slotCount * slotDurationSecs);
  const conformant = pieceCount > 0 ? slotCount % pieceCount === 0 : true;
  return { slotCount, remainder, conformant };
}

// Builds a single matrix cell (slot array) for a zone × state combination.
// Distributes partner entitlements proportionally from the GR Calculator baseline
// (which represents a 3,600s / 60-min reference rotation) into each state's duration.
// Returns Slot[] — each slot carries: partnerId, slotType, contentPieceIdx,
// displayFormat, zoneId, stateId, durationSecs.
export function buildMatrixCell(zoneId, state, partners) {
  const slots    = [];
  const duration = state.defaultSlotDurationSecs;
  const format   = state.defaultFormat;

  partners.forEach(partner => {
    const entitlement = resolveEntitlement(partner.id, zoneId, state.id);
    if (!entitlement) return;

    // Scale entitlement from 60-min reference to this state's duration
    const stateProportion = state.durationSecs / 3600;
    const scaledSecs      = Math.round(entitlement.allocatedSecs * stateProportion);
    const { slotCount }   = deriveSlotCount(scaledSecs, duration, partner.pieces);

    for (let i = 0; i < slotCount; i++) {
      slots.push({
        partnerId:       partner.id,
        slotType:        SLOT_TYPES.CONTRACTED,
        contentPieceIdx: partner.pieces > 0 ? i % partner.pieces : null,
        displayFormat:   format,
        zoneId,
        stateId:         state.id,
        durationSecs:    duration,
      });
    }
  });

  // Fill remaining slots up to state.slotCount as SPARE
  const remaining = state.slotCount - slots.length;
  for (let i = 0; i < Math.max(0, remaining); i++) {
    slots.push({
      partnerId:       null,
      slotType:        SLOT_TYPES.SPARE,
      contentPieceIdx: null,
      displayFormat:   format,
      zoneId,
      stateId:         state.id,
      durationSecs:    duration,
    });
  }

  return slots;
}

// Builds the full playlist matrix for an event type.
// Returns playlistMatrix[zoneId][stateId] = Slot[]
// Returns null for non-event mode (use legacy buildDefaultAllocation instead).
export function buildMatrixAllocation(eventType, partners) {
  if (!eventType?.states) return null;
  const matrix = {};
  ZONES.forEach(zone => {
    matrix[zone.id] = {};
    eventType.states.forEach(state => {
      matrix[zone.id][state.id] = buildMatrixCell(zone.id, state, partners);
    });
  });
  return matrix;
}

// ---------------------------------------------------------------------------
// CDP-010 — Competitive Separation Rules
// ---------------------------------------------------------------------------
// Defines minimum gap constraints between competing partners in the same
// playlist sequence. Violations are hard errors — the matrix will not validate
// and the operator cannot push until resolved (or the sequence is reordered).
//
// minGapSlots: minimum number of slots between the last play of partnerA and
//   the first play of partnerB (and vice versa) in the interleaved sequence.
//   Counted across all slots including spare slots.
//   Example: minGapSlots: 10 at 30s/slot = 5 minutes minimum separation.
//
// scope: 'all' applies to every zone × state cell.
//   Future: array of { zoneId, stateId } for cell-specific rules.
//
// NRMA and RAA are placeholder partner IDs for the prototype.
// Replace with real partner IDs when commercial agreements are configured.
export const SEPARATION_RULES = [
  {
    id:           'rule-001',
    partnerA:     'nrma',
    partnerB:     'raa',
    minGapSlots:  10,
    scope:        'all',
    category:     'competitive',
    label:        'NRMA / RAA — minimum 5 minutes separation (10 × 30s slots)',
  },
];

// Checks a slot sequence for competitive separation violations.
// Scans all slots (including spare) to maintain accurate positional gaps.
// Returns issue objects with severity: 'error'.
export function validateSeparation(slots, rules, partners) {
  const issues = [];
  if (!rules?.length || !slots?.length) return issues;

  const partnerMap = Object.fromEntries((partners ?? []).map(p => [p.id, p]));

  rules.forEach(rule => {
    // Only apply rules where both partners appear in this cell.
    const hasA = slots.some(s => s.partnerId === rule.partnerA);
    const hasB = slots.some(s => s.partnerId === rule.partnerB);
    if (!hasA || !hasB) return;

    const labelA = partnerMap[rule.partnerA]?.label ?? rule.partnerA;
    const labelB = partnerMap[rule.partnerB]?.label ?? rule.partnerB;

    // Scan the full sequence tracking the last position each restricted partner played.
    let lastA = -Infinity;
    let lastB = -Infinity;

    slots.forEach((slot, idx) => {
      if (slot.partnerId === rule.partnerA) {
        // Check gap from last B play to this A play.
        if (lastB >= 0 && (idx - lastB) < rule.minGapSlots) {
          issues.push({
            type:      'competitive_separation',
            partnerId: null,
            ruleId:    rule.id,
            message:   `Competitive separation: ${labelA} plays at slot ${idx + 1}, only ${idx - lastB} slot(s) after ${labelB} (minimum ${rule.minGapSlots})`,
            severity:  'error',
          });
        }
        lastA = idx;
      } else if (slot.partnerId === rule.partnerB) {
        // Check gap from last A play to this B play.
        if (lastA >= 0 && (idx - lastA) < rule.minGapSlots) {
          issues.push({
            type:      'competitive_separation',
            partnerId: null,
            ruleId:    rule.id,
            message:   `Competitive separation: ${labelB} plays at slot ${idx + 1}, only ${idx - lastA} slot(s) after ${labelA} (minimum ${rule.minGapSlots})`,
            severity:  'error',
          });
        }
        lastB = idx;
      }
    });
  });

  // Deduplicate — multiple violations in one cell produce one summary issue.
  // Keep only the first violation per rule to avoid flooding the validation panel.
  const seen = new Set();
  return issues.filter(i => {
    if (seen.has(i.ruleId)) return false;
    seen.add(i.ruleId);
    return true;
  });
}

// Validates a single matrix cell.
// Checks: in-play format constraint, piece-count conformance, slot count vs state definition.
// Checks: competitive separation rules (CDP-010) — hard errors.
// Returns issue objects: { type, partnerId, message, severity: 'error'|'warning' }
export function validateMatrixCell(zoneId, state, slots, partners) {
  const issues = [];

  if (state.isInPlay) {
    const fullscreen = slots.filter(s => s.partnerId && s.displayFormat === DISPLAY_FORMATS.FULLSCREEN);
    if (fullscreen.length > 0) {
      issues.push({
        type:      'format_constraint',
        partnerId: null,
        message:   `${fullscreen.length} full-screen slot(s) in in-play state — must be L-wrap or ribbon`,
        severity:  'error',
      });
    }
  }

  partners.forEach(partner => {
    if (!partner.pieces || partner.pieces <= 1) return;
    const pSlots = slots.filter(s => s.partnerId === partner.id);
    if (pSlots.length === 0) return;
    if (pSlots.length % partner.pieces !== 0) {
      issues.push({
        type:      'piece_conformance',
        partnerId: partner.id,
        message:   `${partner.label}: ${pSlots.length} slot(s) not divisible by ${partner.pieces} content piece(s) — unequal rotation`,
        severity:  'warning',
      });
    }
  });

  if (slots.length !== state.slotCount) {
    issues.push({
      type:      'slot_count_mismatch',
      partnerId: null,
      message:   `Cell has ${slots.length} slot(s), state requires ${state.slotCount}`,
      severity:  'error',
    });
  }

  // CDP-010 — competitive separation check (hard errors)
  issues.push(...validateSeparation(slots, SEPARATION_RULES, partners));

  return issues;
}

// Validates the full playlist matrix.
// Returns { valid, totalErrors, totalWarnings, cells: { [zoneId_stateId]: issues[] } }
export function validateMatrix(matrix, eventType, partners) {
  if (!matrix || !eventType?.states) {
    return { valid: true, totalErrors: 0, totalWarnings: 0, cells: {} };
  }
  let totalErrors = 0, totalWarnings = 0;
  const cells = {};
  ZONES.forEach(zone => {
    eventType.states.forEach(state => {
      const key    = `${zone.id}_${state.id}`;
      const slots  = matrix[zone.id]?.[state.id] ?? [];
      const issues = validateMatrixCell(zone.id, state, slots, partners);
      cells[key]   = issues;
      totalErrors  += issues.filter(i => i.severity === 'error').length;
      totalWarnings+= issues.filter(i => i.severity === 'warning').length;
    });
  });
  return { valid: totalErrors === 0, totalErrors, totalWarnings, cells };
}

// Generates the MPI XML bundle for an event-mode allocation.
// Outputs one <playlist> block per zone × state combination (50 for AFL).
// zone, state, slot_type, displayFormat, and partner are VenueMind extensions —
// non-standard for VisionEDGE but safe as unknown attributes on recognised elements.
// These attributes are critical for downstream PoP correlation by zone and state.
export function generateMatrixMpiXml({ partners, matrix, eventType, eventName = 'Event', eventId = 'evt-000' }) {
  if (!matrix || !eventType?.states) return '';

  const partnerMap   = Object.fromEntries(partners.map(p => [p.id, p]));
  const lines        = [];
  let   contentId    = 1;

  // PoP ID helper: {rawEventId}_{zoneShortCode}_{stateShortCode}_{slot3digits}_{partnerId}
  // rawEventId strips hyphens and caps at 8 chars for CSV field length safety.
  // Deterministic — same inputs always produce the same popId.
  // This is the primary correlation key between VenueMind and CV DSD PoP export.
  const rawEvt = eventId.replace(/-/g, '').slice(0, 8);
  const makePopId = (zone, state, slotIdx, partnerId) => {
    const zShort = zone.shortCode ?? zone.id.slice(0, 4).toUpperCase();
    const sShort = state.shortCode ?? state.id.slice(0, 4).toUpperCase();
    return `${rawEvt}_${zShort}_${sShort}_${String(slotIdx + 1).padStart(3, '0')}_${(partnerId || 'spare').slice(0, 8)}`;
  };

  // Build content item registry across all partners
  const contentItems = [];
  partners.forEach(p => {
    for (let i = 0; i < (p.pieces || 1); i++) {
      contentItems.push({
        id:        contentId++,
        partnerId: p.id,
        pieceIdx:  i,
        filename:  `${p.id}_creative_${i + 1}.mp4`,
        label:     `${p.label} — Creative ${i + 1}`,
      });
    }
  });

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<!-- VenueMind Content Delivery Portal — Zone & State of Play Matrix -->`);
  lines.push(`<!-- Generated: ${new Date().toISOString()} -->`);
  lines.push(`<!-- Event: ${eventName} | Zones: ${ZONES.length} | States: ${eventType.states.length} | Playlists: ${ZONES.length * eventType.states.length} -->`);
  lines.push(`<playlistbundle xmlns="http://www.wipro.com/visionedge/mpi" event="${eventName}">`);

  lines.push(`  <contents>`);
  contentItems.forEach(c => {
    const p = partnerMap[c.partnerId];
    lines.push(`    <content id="${c.id}" filename="${c.filename}" description="${c.label}" active="true">`);
    lines.push(`      <sponsor id="${c.partnerId}" name="${p?.label ?? c.partnerId}"/>`);
    lines.push(`    </content>`);
  });
  lines.push(`  </contents>`);

  lines.push(`  <playlists>`);
  ZONES.forEach(zone => {
    eventType.states.forEach(state => {
      const slots   = matrix[zone.id]?.[state.id] ?? [];
      const slotDur = state.defaultSlotDurationSecs;
      // Playlist ID: {eventId}_{zoneId}_{stateId} — structured, stable, no special chars.
      // The human-readable name is kept in the name attribute for the CV DSD UI.
      const plId = `${eventId}_${zone.id}_${state.id}`;
      lines.push(`    <playlist id="${plId}" name="${zone.label} — ${state.label}"`);
      lines.push(`              zone="${zone.id}" state="${state.id}"`);
      lines.push(`              pop="true" resolution="1920x1080"`);
      lines.push(`              defaultSlotDuration="${slotDur}" slotCount="${slots.length}">`);
      lines.push(`      <slots>`);
      slots.forEach((slot, idx) => {
        const content = slot.partnerId
          ? contentItems.find(c => c.partnerId === slot.partnerId && c.pieceIdx === (slot.contentPieceIdx ?? 0))
          : null;
        lines.push(
          `        <slot slotId="${idx + 1}" popId="${makePopId(zone, state, idx, slot.partnerId)}"` +
          ` contentId="${content?.id ?? 0}"` +
          ` duration="${slot.durationSecs ?? slotDur}"` +
          ` slot_type="${slot.slotType ?? SLOT_TYPES.SPARE}"` +
          ` partner="${slot.partnerId ?? 'spare'}"` +
          ` displayFormat="${slot.displayFormat ?? state.defaultFormat}"` +
          ` zoneId="${zone.id}" stateId="${state.id}"/>`
        );
      });
      lines.push(`      </slots>`);
      lines.push(`    </playlist>`);
    });
  });
  lines.push(`  </playlists>`);
  lines.push(`</playlistbundle>`);

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — RATE CONFIGURATION & REVENUE CALCULATOR (Items 5 & 6)
// ─────────────────────────────────────────────────────────────────────────────

// Default slot rates per zone (AUD, excl. GST).
// Source: Ad Slot and Package Calculator Section 7 (VenueMind_Zone_SoP_Architecture_v1.docx).
export const DEFAULT_ZONE_RATES = {
  concourse:      15,
  gate1:          20,
  members_bar:    25,
  corp_suites:    25,
  corp_functions: 15,
};

// State multipliers — in-play states (L-wrap) attract a discount.
// Half Time gets a premium: longest break, highest commercial value.
export const STATE_RATE_MULTIPLIERS = {
  gates_open:          1.0,
  one_hour_prior:      0.9,
  q1:                  0.7,
  quarter_time:        1.0,
  q2:                  0.7,
  half_time:           1.2,
  q3:                  0.7,
  three_quarter_time:  1.0,
  q4:                  0.7,
  post_game:           0.8,
};

// Resolves the effective rate for a slot in a given zone x state.
export function resolveSlotRate(zoneId, stateId, customRates = {}) {
  const base       = customRates[zoneId] ?? DEFAULT_ZONE_RATES[zoneId] ?? 15;
  const multiplier = STATE_RATE_MULTIPLIERS[stateId] ?? 1.0;
  return Math.round(base * multiplier * 100) / 100;
}

// Computes revenue estimates for the full matrix.
// Returns { byZone, byState, byPartner, totalEvent, totalSeason }
export function computeMatrixRevenue(matrix, eventType, partners, customRates = {}) {
  if (!matrix || !eventType?.states) return null;
  const byZone = {}, byState = {}, byPartner = {};
  ZONES.forEach(zone => {
    byZone[zone.id] = 0;
    eventType.states.forEach(state => {
      if (!byState[state.id]) byState[state.id] = 0;
      const slots = matrix[zone.id]?.[state.id] ?? [];
      const rate  = resolveSlotRate(zone.id, state.id, customRates);
      slots.forEach(slot => {
        if (!slot.partnerId) return;
        byZone[zone.id]                     += rate;
        byState[state.id]                   += rate;
        byPartner[slot.partnerId]            = (byPartner[slot.partnerId] ?? 0) + rate;
      });
    });
  });
  const totalEvent  = Object.values(byZone).reduce((s, v) => s + v, 0);
  const totalSeason = totalEvent * (eventType.gamesPerSeason ?? 1);
  return { byZone, byState, byPartner, totalEvent, totalSeason };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — OVERRIDE MODEL (Item 3)
// ─────────────────────────────────────────────────────────────────────────────

export const OVERRIDE_TYPES = {
  BASE:  'base',
  ZONE:  'zone',
  STATE: 'state',
  CELL:  'cell',
};

// Returns updated matrix with a cell override applied. Does not mutate.
export function applyMatrixOverride(matrix, zoneId, stateId, newSlots) {
  return {
    ...matrix,
    [zoneId]: { ...matrix[zoneId], [stateId]: newSlots },
    __overrides__: { ...(matrix.__overrides__ ?? {}), [`${zoneId}_${stateId}`]: OVERRIDE_TYPES.CELL },
  };
}

// Returns true if the cell has been overridden from base.
export function isCellOverridden(matrix, zoneId, stateId) {
  return !!(matrix?.__overrides__?.[`${zoneId}_${stateId}`]);
}

// Promotes a spare slot to bonus and assigns it to a partner. Does not mutate.
// spareDisplayIdx: index in the full display array (interleaved.length + spare offset).
// interleavedCount: number of partner slots in the interleaved section.
export function promoteSlotToBonus(slots, spareDisplayIdx, interleavedCount, partnerId) {
  const spareLocalIdx = spareDisplayIdx - interleavedCount;
  let sparesSeen = 0;
  return slots.map(slot => {
    if (slot.partnerId !== null) return slot;
    if (sparesSeen === spareLocalIdx) { sparesSeen++; return { ...slot, partnerId, slotType: SLOT_TYPES.BONUS, contentPieceIdx: 0 }; }
    sparesSeen++;
    return slot;
  });
}

// Reverts a bonus slot to spare. slotDisplayIdx: display-order index in partner block.
export function revertBonusToSpare(slots, bonusDisplayIdx) {
  const groups = {}, order = [];
  slots.forEach((slot, dataIdx) => {
    if (slot.partnerId === null) return;
    const key = slot.partnerId;
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push({ slot, dataIdx });
  });
  const cursors = Object.fromEntries(order.map(k => [k, 0]));
  let count = 0, targetDataIdx = -1;
  loop: for (;;) {
    let advanced = false;
    for (const k of order) {
      if (cursors[k] < groups[k].length) {
        if (count === bonusDisplayIdx) { targetDataIdx = groups[k][cursors[k]].dataIdx; break loop; }
        cursors[k]++; count++; advanced = true;
      }
    }
    if (!advanced) break;
  }
  if (targetDataIdx === -1) return slots;
  return slots.map((slot, i) =>
    i === targetDataIdx ? { ...slot, partnerId: null, slotType: SLOT_TYPES.SPARE, contentPieceIdx: null } : slot
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS & ALLOCATION RECORDS
// The connective tissue between the contract, the allocation builder, and
// partner content uploads.
//
// AllocationRecord links:
//   event → partner → zone(s)/state(s) → content spec → uploaded content
//
// Status lifecycle:
//   pending_content  — operator has created the allocation; partner hasn't uploaded yet
//   under_review     — partner has uploaded; awaiting operator approval
//   approved         — content approved; ready to go live
//   live             — content is in rotation in VisionEDGE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CDP-037 — Moments: Trigger-Based Commercial Inventory
// ─────────────────────────────────────────────────────────────────────────────
// Moment types are defined per sport at the template level — not per event.
// Events assign partner ownership to each moment type.
// All moments use lwrap format by default — replay vision fills the main screen.
// momentTypes: [] for non-event, function, and concert templates.
export const MOMENT_TYPES_BY_SPORT = {
  afl: [
    { id: 'goal',    label: 'Goal Replay',    icon: '⚽', defaultFormat: 'lwrap', notes: 'Triggered on every goal — highest frequency, highest value moment' },
    { id: 'mark',    label: 'Mark Replay',    icon: '🤚', defaultFormat: 'lwrap', notes: 'Triggered on spectacular marks — moderate frequency' },
    { id: 'tackle',  label: 'Tackle Replay',  icon: '💪', defaultFormat: 'lwrap', notes: 'Triggered on highlight tackles — lower frequency' },
    { id: 'behind',  label: 'Behind',         icon: '🎯', defaultFormat: 'lwrap', notes: 'Triggered on behinds — high frequency, lower commercial value' },
  ],
  cricket_t20: [
    { id: 'six',      label: 'Six',           icon: '6️⃣', defaultFormat: 'lwrap', notes: 'Triggered on every six — high value, crowd peak moment' },
    { id: 'wicket',   label: 'Wicket',        icon: '🏏', defaultFormat: 'lwrap', notes: 'Triggered on every wicket — high value' },
    { id: 'boundary', label: 'Boundary Four', icon: '4️⃣', defaultFormat: 'lwrap', notes: 'Triggered on boundaries — high frequency' },
    { id: 'catch',    label: 'Catch',         icon: '🙌', defaultFormat: 'lwrap', notes: 'Triggered on taken catches — moderate frequency' },
  ],
  cricket_test: [
    { id: 'six',      label: 'Six',           icon: '6️⃣', defaultFormat: 'lwrap', notes: 'Triggered on every six' },
    { id: 'wicket',   label: 'Wicket',        icon: '🏏', defaultFormat: 'lwrap', notes: 'Triggered on every wicket — session-defining moment' },
    { id: 'boundary', label: 'Boundary Four', icon: '4️⃣', defaultFormat: 'lwrap', notes: 'Triggered on boundaries' },
    { id: 'century',  label: 'Century',       icon: '💯', defaultFormat: 'fullscreen', notes: 'Triggered on player century — rare, premium moment' },
  ],
  concert: [
    { id: 'encore',    label: 'Encore',       icon: '🎤', defaultFormat: 'fullscreen', notes: 'Triggered at encore — peak crowd engagement' },
    { id: 'highlight', label: 'Highlight',    icon: '⭐', defaultFormat: 'lwrap',      notes: 'Triggered on key song moments — operator-defined' },
  ],
};

// Helper — get moment types for an event type id.
// Maps from EVENT_TYPES id (e.g. 'afl') to MOMENT_TYPES_BY_SPORT key.
// Returns [] for event types with no moments (non_event, function).
export function getMomentTypesForEvent(eventTypeId) {
  return MOMENT_TYPES_BY_SPORT[eventTypeId] ?? [];
}

// Helper — build a default moments array for an event.
// All moment types start unassigned (partnerId: null).
// CDP-037 — Builds a default moments array for a new event.
// One record per momentTypeId × zoneId combination.
// All assignments start unassigned (partnerId: null).
export function buildDefaultMoments(eventTypeId) {
  const momentTypes = getMomentTypesForEvent(eventTypeId);
  const records = [];
  momentTypes.forEach(mt => {
    ZONES.forEach(zone => {
      records.push({
        id:             `mom-${eventTypeId}-${mt.id}-${zone.id}`,
        momentTypeId:   mt.id,
        zoneId:         zone.id,
        partnerId:      null,
        packageLabel:   null,
        contentId:      null,
        triggeredCount: 0,
        deliveredCount: 0,
      });
    });
  });
  return records;
}

export const INITIAL_EVENTS = [];

// Resolves the effective interleave order for a given zone.
// Uses the zone-specific override from event.zonePriority if one exists;
// falls back to event.partnerPriority. Partners present in the cell but
// absent from the resolved order are appended so none are silently dropped.
export function resolveInterleaveOrder(event, zoneId, candidatePartnerIds = []) {
  if (!event) return candidatePartnerIds;
  const zoneOverride = event.zonePriority?.[zoneId];
  const base = zoneOverride ?? event.partnerPriority ?? [];
  return [
    ...base.filter(id => candidatePartnerIds.includes(id)),
    ...candidatePartnerIds.filter(id => !base.includes(id)),
  ];
}

// Content specifications per display context.
// Used to validate partner uploads against the allocation's requirements.
export const CONTENT_SPECS_BY_FORMAT = {
  fullscreen: {
    label: 'Full-screen (1920×1080)',
    width: 1920, height: 1080,
    formats: ['image/png', 'image/jpeg', 'video/mp4'],
    maxFileSizeMB: 50,
    maxDurationSecs: 30,
  },
  lwrap: {
    label: 'L-wrap (1920×1080 with 480px safe zone)',
    width: 1920, height: 1080,
    formats: ['image/png', 'image/jpeg', 'video/mp4'],
    maxFileSizeMB: 50,
    maxDurationSecs: 30,
    note: 'Keep key content left of 1440px — right 480px used for game feed.',
  },
  ribbon: {
    label: 'Footer ribbon (1920×200)',
    width: 1920, height: 200,
    formats: ['image/png', 'image/jpeg', 'video/mp4'],
    maxFileSizeMB: 20,
    maxDurationSecs: 30,
  },
};

// Allocation records — one record per partner per zone/state group per event.
// A partner can have multiple allocation records for the same event
// (e.g. McDonald's: Gate 1 full-screen AND in-play L-wrap are separate allocations).
export const INITIAL_ALLOCATIONS = [];

// Helper — get all allocations for a partner across all events
export function getAllocationsForPartner(allocations, partnerId) {
  return allocations.filter(a => a.partnerId === partnerId);
}

// Helper — get allocations for a specific event
export function getAllocationsForEvent(allocations, eventId) {
  return allocations.filter(a => a.eventId === eventId);
}

// Helper — get the event label for an allocation
export function getEventForAllocation(events, allocation) {
  return events.find(e => e.id === allocation.eventId) ?? null;
}

// Assigns a partnerId to a spare slot without changing slotType.
// Keeps slotType: 'spare' — PoP records partner attribution but not as bonus.
// Same index resolution logic as promoteSlotToBonus.
export function assignSpareToPartner(slots, spareDisplayIdx, interleavedCount, partnerId) {
  const spareLocalIdx = spareDisplayIdx - interleavedCount;
  let sparesSeen = 0;
  return slots.map(slot => {
    if (slot.partnerId !== null) return slot;
    if (sparesSeen === spareLocalIdx) {
      sparesSeen++;
      return { ...slot, partnerId, contentPieceIdx: 0 };
      // slotType stays SLOT_TYPES.SPARE deliberately
    }
    sparesSeen++;
    return slot;
  });
}

// Creates a temporary guest partner entry for one-off event slot assignment.
// Uses the GUEST_COLORS pool; guest flag distinguishes from contracted partners.
export function createGuestPartner(name, initials) {
  const existingGuests = 0; // stateless — colour cycles on id suffix
  const idx   = Math.floor(Math.random() * GUEST_COLORS.length);
  const color = GUEST_COLORS[idx];
  return {
    id:             `guest_${Date.now()}`,
    label:          name.trim(),
    initials:       (initials || name.trim().split(/\s+/).map(w => w[0]).join('')).slice(0, 3).toUpperCase(),
    pkg:            'Guest / One-Off',
    contracted:     0,
    contractedSecs: 0,
    bonusSecs:      0,
    pieces:         1,
    color:          color.color,
    text:           color.text,
    guest:          true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CDP-034 — Percentage-based slot allocation builders
// ─────────────────────────────────────────────────────────────────────────────

// Builds a single cell's slot array from percentage inputs.
// partnerPercentages: { [partnerId]: number } — % of total slots (0–100).
// Remaining slots after all partners become SPARE.
export function buildMatrixCellByPercentage(zoneId, state, partners, partnerPercentages) {
  const slots    = [];
  const format   = state.defaultFormat;
  const duration = state.defaultSlotDurationSecs;
  let allocated  = 0;

  partners.forEach(partner => {
    const pct   = partnerPercentages[partner.id] ?? 0;
    const count = Math.max(0, Math.round((pct / 100) * state.slotCount));
    if (count === 0) return;
    allocated += count;
    for (let i = 0; i < count; i++) {
      slots.push({
        partnerId:       partner.id,
        slotType:        SLOT_TYPES.CONTRACTED,
        contentPieceIdx: partner.pieces > 0 ? i % partner.pieces : null,
        displayFormat:   format,
        zoneId,
        stateId:         state.id,
        durationSecs:    duration,
      });
    }
  });

  const remaining = Math.max(0, state.slotCount - allocated);
  for (let i = 0; i < remaining; i++) {
    slots.push({
      partnerId:       null,
      slotType:        SLOT_TYPES.SPARE,
      contentPieceIdx: null,
      displayFormat:   format,
      zoneId,
      stateId:         state.id,
      durationSecs:    duration,
    });
  }
  return slots;
}

// Builds the full matrix using percentage allocation mode.
export function buildMatrixAllocationByPercentage(eventType, partners, partnerPercentages) {
  if (!eventType?.states) return null;
  const matrix = {};
  ZONES.forEach(zone => {
    matrix[zone.id] = {};
    eventType.states.forEach(state => {
      matrix[zone.id][state.id] = buildMatrixCellByPercentage(zone.id, state, partners, partnerPercentages);
    });
  });
  return matrix;
}

// ─────────────────────────────────────────────────────────────────────────────
// CDP-035 — Campaign Management
// ─────────────────────────────────────────────────────────────────────────────

// Campaign status values
export const CAMPAIGN_STATUSES = [
  { id: 'draft',     label: 'Draft',     color: '#F3F4F6', text: '#6B7280' },
  { id: 'active',    label: 'Active',    color: '#DCFCE7', text: '#166534' },
  { id: 'completed', label: 'Completed', color: '#EEF2FF', text: '#3730A3' },
  { id: 'paused',    label: 'Paused',    color: '#FEF9C3', text: '#854D0E' },
];

// Entitlement type values — how a partner's allocation is expressed
export const ENTITLEMENT_TYPES = [
  { id: 'percentage', label: 'Percentage (%)',     unit: '%'    },
  { id: 'seconds',    label: 'Seconds per hour',   unit: 's/hr' },
  { id: 'slots',      label: 'Slot count',          unit: 'slots'},
];

// Campaign seed data.
// A Campaign is single-partner and spans a date range, grouping Events and/or
// Functions under a shared commercial entitlement model.
// rules: entitlement per eventTypeId × zoneId combination.
// contentPool: content pieces available to the partner for this campaign.
export const INITIAL_CAMPAIGNS = [];

// Helper — get the campaign attached to an event (if any)
export function getCampaignForEvent(campaigns, eventId) {
  return campaigns.find(c => c.eventIds?.includes(eventId)) ?? null;
}

// Helper — get all campaigns for a specific partner
export function getCampaignsForPartner(campaigns, partnerId) {
  return campaigns.filter(c => c.partnerId === partnerId);
}

// Helper — resolve campaign entitlement rule for a partner × event type × zone.
// Most specific rule wins: zone-specific over zone:null (all zones).
export function resolveCampaignRule(campaign, eventTypeId, zoneId) {
  if (!campaign?.rules) return null;
  const zoneSpecific = campaign.rules.find(
    r => r.eventTypeId === eventTypeId && r.zoneId === zoneId
  );
  const allZones = campaign.rules.find(
    r => r.eventTypeId === eventTypeId && r.zoneId === null
  );
  return zoneSpecific ?? allZones ?? null;
}

// Helper — convert a campaign rule value to slot count for a given state.
// Normalises percentage, seconds, and slot-count entitlement types.
export function resolveRuleSlotCount(rule, state) {
  if (!rule || !state) return 0;
  switch (rule.entitlementType) {
    case 'percentage':
      return Math.round((rule.value / 100) * state.slotCount);
    case 'seconds':
      // seconds is expressed per hour; scale by state duration
      return Math.round((rule.value / 3600) * (state.durationSecs / state.defaultSlotDurationSecs));
    case 'slots':
      return rule.value;
    default:
      return 0;
  }
}
