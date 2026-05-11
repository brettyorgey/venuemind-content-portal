// templates.js — CRUD API for vm-portal-templates Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/templates           — list all templates for venue
//   POST   /api/templates           — create a new template
//   GET    /api/templates/{id}      — get single template
//   PATCH  /api/templates/{id}      — update template (partial — states and momentTypes embedded)
//   DELETE /api/templates/{id}      — delete template
//   POST   /api/templates/seed      — write seed data (idempotent)
//   DELETE /api/templates/seed      — purge all seeded records

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const client    = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database  = client.database("venuemind");
const container = database.container("vm-portal-templates");

const VENUE_ID         = "adelaideoval";
const SEED_SENTINEL_ID = "_seed_metadata";

const corsHeaders = {
  "Access-Control-Allow-Origin":  process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
};

function json(status, body, extra = {}) {
  return {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  };
}

// States and momentTypes are embedded arrays within each template document.
const SEED_TEMPLATES = [
  {
    id: "afl_football",
    label: "AFL Football",
    sport: "AFL",
    status: "active",
    notes: "Full AFL game format",
    isSeeded: true,
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
    isSeeded: true,
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
    isSeeded: true,
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
    isSeeded: true,
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
    isSeeded: true,
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
    isSeeded: true,
    momentTypes: [],
    states: [
      { id: "background", label: "Background rotation", durationSecs: 3600, slotCount: 120, defaultFormat: "fullscreen", isInPlay: false, commercialPriority: "medium", sortOrder: 0, notes: "Standard 60-minute loop" },
    ],
  },
];

app.http("templates", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "templates/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/templates/seed ──────────────────────────────────────────────
      if (method === "POST" && id === "seed") {
        try {
          const { resource: sentinel } = await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          if (sentinel) {
            return json(200, { message: "Already seeded", seeded: false });
          }
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e;
        }

        for (const template of SEED_TEMPLATES) {
          await container.items.upsert({ ...template, venueId: VENUE_ID });
        }
        await container.items.upsert({
          id: SEED_SENTINEL_ID, venueId: VENUE_ID,
          seededAt: new Date().toISOString(), isSeeded: true,
        });

        return json(201, { message: "Seeded", count: SEED_TEMPLATES.length, seeded: true });
      }

      // ── DELETE /api/templates/seed ────────────────────────────────────────────
      if (method === "DELETE" && id === "seed") {
        const { resources } = await container.items
          .query({
            query: "SELECT c.id, c.venueId FROM c WHERE c.venueId = @venueId AND c.isSeeded = true",
            parameters: [{ name: "@venueId", value: VENUE_ID }],
          })
          .fetchAll();
        for (const doc of resources) {
          await container.item(doc.id, doc.venueId).delete();
        }
        try { await container.item(SEED_SENTINEL_ID, VENUE_ID).delete(); } catch (_) {}
        return json(200, { message: "Seed data purged", count: resources.length });
      }

      // ── GET /api/templates ────────────────────────────────────────────────────
      if (method === "GET" && !id) {
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.venueId = @venueId AND c.id != @sentinel",
            parameters: [
              { name: "@venueId",  value: VENUE_ID },
              { name: "@sentinel", value: SEED_SENTINEL_ID },
            ],
          })
          .fetchAll();
        return json(200, resources);
      }

      // ── GET /api/templates/{id} ───────────────────────────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Template not found" });
        return json(200, resource);
      }

      // ── POST /api/templates ───────────────────────────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.id || !body.label) return json(400, { error: "id and label are required" });
        const doc = {
          ...body,
          venueId:     VENUE_ID,
          isSeeded:    false,
          states:      body.states      || [],
          momentTypes: body.momentTypes || [],
          createdAt:   new Date().toISOString(),
        };
        const { resource } = await container.items.create(doc);
        return json(201, resource);
      }

      // ── PATCH /api/templates/{id} ─────────────────────────────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Template not found" });
        const body    = await request.json();
        const updated = { ...existing, ...body, venueId: VENUE_ID, updatedAt: new Date().toISOString() };
        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/templates/{id} ────────────────────────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("templates function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
