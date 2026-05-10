// events.js — CRUD API for vm-portal-events Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/events              — list all events for venue
//   POST   /api/events              — create a new event
//   GET    /api/events/{id}         — get single event
//   PATCH  /api/events/{id}         — update event (partial)
//   DELETE /api/events/{id}         — delete event
//   POST   /api/events/seed         — write seed data (idempotent — no-op if already seeded)
//   DELETE /api/events/seed         — purge all seeded records (pre-go-live cleanup)

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

// ── Cosmos connection ─────────────────────────────────────────────────────────
const client     = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database   = client.database("venuemind");
const container  = database.container("vm-portal-events");

const VENUE_ID   = "adelaideoval";   // Gate 2 hardcode — Gate 2.5 reads from MSAL token
const SEED_SENTINEL_ID = "_seed_metadata";

// ── CORS headers (same pattern as anthropicProxy.js) ─────────────────────────
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

// ── Seed data ─────────────────────────────────────────────────────────────────
// Inlined here so the Function App is self-contained (no import from frontend src/).
// Keep in sync with INITIAL_EVENTS in constants.js until Gate 2.5 removes seed data.
const SEED_EVENTS = [
  {
    id:              "evt-001",
    venueId:         VENUE_ID,
    name:            "AFL — Port Adelaide vs Richmond",
    date:            "2026-05-03",
    eventType:       "afl",
    venue:           "Adelaide Oval",
    status:          "upcoming",
    playlistName:    "Port Adelaide v Richmond — 3 May 2026",
    partnerPriority: ["maccas", "afl", "iren1", "iren2", "sapol", "disney"],
    zonePriority:    {},
    campaignId:      "cmp-001",
    moments: [
      { id: "mom-evt001-goal-concourse",     momentTypeId: "goal",   zoneId: "concourse",      partnerId: "maccas", packageLabel: "McDonald's Goal — Concourse",       contentId: null, triggeredCount: 6, deliveredCount: 6 },
      { id: "mom-evt001-goal-gate1",         momentTypeId: "goal",   zoneId: "gate1",          partnerId: "maccas", packageLabel: "McDonald's Goal — Gate 1",          contentId: null, triggeredCount: 6, deliveredCount: 6 },
      { id: "mom-evt001-goal-members_bar",   momentTypeId: "goal",   zoneId: "members_bar",    partnerId: null,     packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-goal-corp_suites",   momentTypeId: "goal",   zoneId: "corp_suites",    partnerId: "disney", packageLabel: "Disney+ Goal — Corporate Suites",   contentId: null, triggeredCount: 6, deliveredCount: 6 },
      { id: "mom-evt001-goal-corp_funcs",    momentTypeId: "goal",   zoneId: "corp_functions", partnerId: null,     packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-mark-concourse",     momentTypeId: "mark",   zoneId: "concourse",      partnerId: "maccas", packageLabel: "McDonald's Mark — Concourse",       contentId: null, triggeredCount: 3, deliveredCount: 3 },
      { id: "mom-evt001-mark-gate1",         momentTypeId: "mark",   zoneId: "gate1",          partnerId: null,     packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-mark-members_bar",   momentTypeId: "mark",   zoneId: "members_bar",    partnerId: null,     packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-mark-corp_suites",   momentTypeId: "mark",   zoneId: "corp_suites",    partnerId: null,     packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-mark-corp_funcs",    momentTypeId: "mark",   zoneId: "corp_functions", partnerId: null,     packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-tackle-concourse",   momentTypeId: "tackle", zoneId: "concourse",      partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-tackle-gate1",       momentTypeId: "tackle", zoneId: "gate1",          partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-tackle-members_bar", momentTypeId: "tackle", zoneId: "members_bar",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-tackle-corp_suites", momentTypeId: "tackle", zoneId: "corp_suites",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-tackle-corp_funcs",  momentTypeId: "tackle", zoneId: "corp_functions", partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-behind-concourse",   momentTypeId: "behind", zoneId: "concourse",      partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-behind-gate1",       momentTypeId: "behind", zoneId: "gate1",          partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-behind-members_bar", momentTypeId: "behind", zoneId: "members_bar",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-behind-corp_suites", momentTypeId: "behind", zoneId: "corp_suites",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt001-behind-corp_funcs",  momentTypeId: "behind", zoneId: "corp_functions", partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
    ],
    isSeeded: true,
  },
  {
    id:              "evt-002",
    venueId:         VENUE_ID,
    name:            "AFL — Adelaide vs Geelong",
    date:            "2026-05-17",
    eventType:       "afl",
    venue:           "Adelaide Oval",
    status:          "upcoming",
    playlistName:    "Adelaide v Geelong — 17 May 2026",
    partnerPriority: ["maccas", "afl", "iren1", "iren2", "sapol", "disney"],
    zonePriority:    {},
    campaignId:      "cmp-001",
    moments: [
      { id: "mom-evt002-goal-concourse",     momentTypeId: "goal",   zoneId: "concourse",      partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-goal-gate1",         momentTypeId: "goal",   zoneId: "gate1",          partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-goal-members_bar",   momentTypeId: "goal",   zoneId: "members_bar",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-goal-corp_suites",   momentTypeId: "goal",   zoneId: "corp_suites",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-goal-corp_funcs",    momentTypeId: "goal",   zoneId: "corp_functions", partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-mark-concourse",     momentTypeId: "mark",   zoneId: "concourse",      partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-mark-gate1",         momentTypeId: "mark",   zoneId: "gate1",          partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-mark-members_bar",   momentTypeId: "mark",   zoneId: "members_bar",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-mark-corp_suites",   momentTypeId: "mark",   zoneId: "corp_suites",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-mark-corp_funcs",    momentTypeId: "mark",   zoneId: "corp_functions", partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-tackle-concourse",   momentTypeId: "tackle", zoneId: "concourse",      partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-tackle-gate1",       momentTypeId: "tackle", zoneId: "gate1",          partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-tackle-members_bar", momentTypeId: "tackle", zoneId: "members_bar",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-tackle-corp_suites", momentTypeId: "tackle", zoneId: "corp_suites",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-tackle-corp_funcs",  momentTypeId: "tackle", zoneId: "corp_functions", partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-behind-concourse",   momentTypeId: "behind", zoneId: "concourse",      partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-behind-gate1",       momentTypeId: "behind", zoneId: "gate1",          partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-behind-members_bar", momentTypeId: "behind", zoneId: "members_bar",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-behind-corp_suites", momentTypeId: "behind", zoneId: "corp_suites",    partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
      { id: "mom-evt002-behind-corp_funcs",  momentTypeId: "behind", zoneId: "corp_functions", partnerId: null, packageLabel: null, contentId: null, triggeredCount: 0, deliveredCount: 0 },
    ],
    isSeeded: true,
  },
];

// ── Route handlers ────────────────────────────────────────────────────────────

app.http("events", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "events/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/events/seed — write seed data (idempotent) ────────────────
      if (method === "POST" && id === "seed") {
        // Check for sentinel
        try {
          const { resource: sentinel } = await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          if (sentinel) {
            // Sentinel exists — already seeded, no-op
            return json(200, { message: "Already seeded", seeded: false });
          }
          // resource undefined — not found, proceed with seeding
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e; // handle both SDK v3 and v4 error shapes
        }

        // Write all seed events
        for (const event of SEED_EVENTS) {
          await container.items.upsert(event);
        }

        // Write sentinel
        await container.items.upsert({
          id:        SEED_SENTINEL_ID,
          venueId:   VENUE_ID,
          seededAt:  new Date().toISOString(),
          isSeeded:  true,
        });

        return json(201, { message: "Seeded", count: SEED_EVENTS.length, seeded: true });
      }

      // ── DELETE /api/events/seed — purge all seeded records ──────────────────
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
        // Also delete sentinel
        try { await container.item(SEED_SENTINEL_ID, VENUE_ID).delete(); } catch (_) {}

        return json(200, { message: "Seed data purged", count: resources.length });
      }

      // ── GET /api/events — list all events for venue ──────────────────────────
      if (method === "GET" && !id) {
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.venueId = @venueId AND c.id != @sentinel ORDER BY c.date ASC",
            parameters: [
              { name: "@venueId",  value: VENUE_ID },
              { name: "@sentinel", value: SEED_SENTINEL_ID },
            ],
          })
          .fetchAll();

        return json(200, resources);
      }

      // ── GET /api/events/{id} — single event ──────────────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Event not found" });
        return json(200, resource);
      }

      // ── POST /api/events — create event ──────────────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.id || !body.name) return json(400, { error: "id and name are required" });

        const doc = {
          ...body,
          venueId:   VENUE_ID,
          isSeeded:  false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { resource } = await container.items.create(doc);
        return json(201, resource);
      }

      // ── PATCH /api/events/{id} — partial update ───────────────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Event not found" });

        const body    = await request.json();
        const updated = { ...existing, ...body, venueId: VENUE_ID, updatedAt: new Date().toISOString() };

        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/events/{id} — delete event ────────────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("events function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
