// allocations.js — CRUD API for vm-portal-allocations Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/allocations              — list allocations (optional ?eventId= filter)
//   POST   /api/allocations              — create allocation
//   GET    /api/allocations/{id}         — get single allocation
//   PATCH  /api/allocations/{id}         — update allocation (partial)
//   DELETE /api/allocations/{id}         — delete allocation
//   POST   /api/allocations/seed         — write seed data (idempotent)
//   DELETE /api/allocations/seed         — purge all seeded records

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const client    = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database  = client.database("venuemind");
const container = database.container("vm-portal-allocations");

const VENUE_ID          = "adelaideoval";
const SEED_SENTINEL_ID  = "_seed_metadata";

const corsHeaders = {
  "Access-Control-Allow-Origin":  process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
};

function json(status, body) {
  return {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────
// contentSpec is inlined as resolved objects (not references to constants.js).
// Keep in sync with INITIAL_ALLOCATIONS in constants.js until seed purge at go-live.
const FULLSCREEN_SPEC = {
  width: 1920, height: 1080, formats: ["image/png", "image/jpeg", "video/mp4"],
  maxFileSize: 52428800, maxDuration: 30, notes: "Full-screen 1920×1080. Safe area: full frame.",
};
const LWRAP_SPEC = {
  width: 1920, height: 1080, formats: ["image/png", "image/jpeg", "video/mp4"],
  maxFileSize: 52428800, maxDuration: 30, notes: "L-wrap: keep content left of 1440px. Right 480px reserved for live vision.",
};

const SEED_ALLOCATIONS = [
  // ── evt-001: Port Adelaide vs Richmond ──────────────────────────────────────
  {
    id:            "alloc-001",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "maccas",
    label:         "McDonald's — Full-screen breaks",
    zones:         ["concourse", "gate1", "members_bar"],
    states:        ["gates_open", "one_hour_prior", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     12,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "pending_content",
    notes:         "Package 1 — contracted full-screen slots during all break states.",
    isSeeded:      true,
  },
  {
    id:            "alloc-002",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "maccas",
    label:         "McDonald's — In-play L-wrap",
    zones:         ["concourse", "gate1"],
    states:        ["q1", "q2", "q3", "q4"],
    slotCount:     4,
    displayFormat: "lwrap",
    contentSpec:   LWRAP_SPEC,
    contentItemId: null,
    status:        "pending_content",
    notes:         "Package 1 — L-wrap creative required. Keep content left of 1440px.",
    isSeeded:      true,
  },
  {
    id:            "alloc-003",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "iren1",
    label:         "Iren Energy — Full-screen breaks",
    zones:         ["concourse", "gate1", "corp_functions"],
    states:        ["gates_open", "one_hour_prior", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     12,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "pending_content",
    notes:         "Package 2.",
    isSeeded:      true,
  },
  {
    id:            "alloc-004",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "iren2",
    label:         "Iren Energy (Pkg 3) — Full-screen breaks",
    zones:         ["members_bar", "corp_suites"],
    states:        ["gates_open", "one_hour_prior", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     12,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "pending_content",
    notes:         "Package 3 — premium zones only.",
    isSeeded:      true,
  },
  {
    id:            "alloc-005",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "sapol",
    label:         "SA Police — Road Safety (all zones)",
    zones:         ["concourse", "gate1", "members_bar", "corp_suites", "corp_functions"],
    states:        ["gates_open", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     12,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "under_review",
    notes:         "Package 5 — community safety content.",
    isSeeded:      true,
  },
  {
    id:            "alloc-006",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "afl",
    label:         "AFL — League content (all zones, all states)",
    zones:         ["concourse", "gate1", "members_bar", "corp_suites", "corp_functions"],
    states:        ["gates_open", "one_hour_prior", "q1", "q2", "q3", "q4", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     48,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "approved",
    notes:         "League content — 3 pieces, round-robin.",
    isSeeded:      true,
  },
  {
    id:            "alloc-007",
    venueId:       VENUE_ID,
    eventId:       "evt-001",
    partnerId:     "disney",
    label:         "Disney+ — Break states (all zones)",
    zones:         ["concourse", "gate1", "members_bar", "corp_suites", "corp_functions"],
    states:        ["gates_open", "one_hour_prior", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     12,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "pending_content",
    notes:         "Spare Package 1.",
    isSeeded:      true,
  },
  // ── evt-002: Adelaide vs Geelong ────────────────────────────────────────────
  {
    id:            "alloc-008",
    venueId:       VENUE_ID,
    eventId:       "evt-002",
    partnerId:     "maccas",
    label:         "McDonald's — Full-screen breaks",
    zones:         ["concourse", "gate1", "members_bar"],
    states:        ["gates_open", "one_hour_prior", "quarter_time", "half_time", "three_quarter_time", "post_game"],
    slotCount:     12,
    displayFormat: "fullscreen",
    contentSpec:   FULLSCREEN_SPEC,
    contentItemId: null,
    status:        "pending_content",
    notes:         "Package 1.",
    isSeeded:      true,
  },
];

// ── Route handler ─────────────────────────────────────────────────────────────

app.http("allocations", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "allocations/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/allocations/seed ─────────────────────────────────────────
      if (method === "POST" && id === "seed") {
        try {
          await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          return json(200, { message: "Already seeded", seeded: false });
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e; // handle both SDK v3 and v4 error shapes
        }

        for (const alloc of SEED_ALLOCATIONS) {
          await container.items.upsert(alloc);
        }
        await container.items.upsert({
          id:       SEED_SENTINEL_ID,
          venueId:  VENUE_ID,
          seededAt: new Date().toISOString(),
          isSeeded: true,
        });

        return json(201, { message: "Seeded", count: SEED_ALLOCATIONS.length, seeded: true });
      }

      // ── DELETE /api/allocations/seed ───────────────────────────────────────
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

      // ── GET /api/allocations — list (optional ?eventId= filter) ───────────
      if (method === "GET" && !id) {
        const url     = new URL(request.url);
        const eventId = url.searchParams.get("eventId");

        let query, parameters;
        if (eventId) {
          query      = "SELECT * FROM c WHERE c.venueId = @venueId AND c.eventId = @eventId AND c.id != @sentinel ORDER BY c.id ASC";
          parameters = [
            { name: "@venueId",  value: VENUE_ID },
            { name: "@eventId",  value: eventId },
            { name: "@sentinel", value: SEED_SENTINEL_ID },
          ];
        } else {
          query      = "SELECT * FROM c WHERE c.venueId = @venueId AND c.id != @sentinel ORDER BY c.eventId ASC";
          parameters = [
            { name: "@venueId",  value: VENUE_ID },
            { name: "@sentinel", value: SEED_SENTINEL_ID },
          ];
        }

        const { resources } = await container.items.query({ query, parameters }).fetchAll();
        return json(200, resources);
      }

      // ── GET /api/allocations/{id} ──────────────────────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Allocation not found" });
        return json(200, resource);
      }

      // ── POST /api/allocations — create ────────────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.id || !body.eventId || !body.partnerId) {
          return json(400, { error: "id, eventId, and partnerId are required" });
        }

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

      // ── PATCH /api/allocations/{id} — partial update ──────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Allocation not found" });

        const body    = await request.json();
        const updated = { ...existing, ...body, venueId: VENUE_ID, updatedAt: new Date().toISOString() };

        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/allocations/{id} ──────────────────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("allocations function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
