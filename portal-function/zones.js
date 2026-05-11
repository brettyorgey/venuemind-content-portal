// zones.js — CRUD API for vm-portal-zones Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/zones               — list all zones for venue
//   POST   /api/zones               — create a new zone
//   GET    /api/zones/{id}          — get single zone
//   PATCH  /api/zones/{id}          — update zone (partial)
//   DELETE /api/zones/{id}          — delete zone
//   POST   /api/zones/seed          — write seed data (idempotent)
//   DELETE /api/zones/seed          — purge all seeded records

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const client    = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database  = client.database("venuemind");
const container = database.container("vm-portal-zones");

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

const SEED_ZONES = [
  { id: "concourse",      label: "Concourse A / B / C", dmpPattern: "DMP-CA-*, DMP-CB-*, DMP-CC-*", pricingTier: "standard",  ratePerSlot: 15, sortOrder: 0, notes: "In-transit, break dwell time",                          isSeeded: true },
  { id: "gate1",          label: "Gate 1 Entry",         dmpPattern: "DMP-G1-*",                     pricingTier: "premium",   ratePerSlot: 20, sortOrder: 1, notes: "Arriving crowd, peak pre-game exposure",                 isSeeded: true },
  { id: "members_bar",    label: "Members Bar",          dmpPattern: "DMP-MB-*",                     pricingTier: "premium+",  ratePerSlot: 25, sortOrder: 2, notes: "High dwell, high spend, hospitality context",            isSeeded: true },
  { id: "corp_suites",    label: "Corporate Suites",     dmpPattern: "DMP-CS-*",                     pricingTier: "premium+",  ratePerSlot: 25, sortOrder: 3, notes: "Exclusive audience, high-value partners",                isSeeded: true },
  { id: "corp_functions", label: "Corporate Functions",  dmpPattern: "DMP-CF-*",                     pricingTier: "standard+", ratePerSlot: 15, sortOrder: 4, notes: "Event-specific, function bookings, variable attendance", isSeeded: true },
];

app.http("zones", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "zones/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/zones/seed ──────────────────────────────────────────────────
      if (method === "POST" && id === "seed") {
        try {
          const { resource: sentinel } = await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          if (sentinel) {
            return json(200, { message: "Already seeded", seeded: false });
          }
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e;
        }

        for (const zone of SEED_ZONES) {
          await container.items.upsert({ ...zone, venueId: VENUE_ID });
        }
        await container.items.upsert({
          id: SEED_SENTINEL_ID, venueId: VENUE_ID,
          seededAt: new Date().toISOString(), isSeeded: true,
        });

        return json(201, { message: "Seeded", count: SEED_ZONES.length, seeded: true });
      }

      // ── DELETE /api/zones/seed ────────────────────────────────────────────────
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

      // ── GET /api/zones ────────────────────────────────────────────────────────
      if (method === "GET" && !id) {
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.venueId = @venueId AND c.id != @sentinel ORDER BY c.sortOrder ASC",
            parameters: [
              { name: "@venueId",  value: VENUE_ID },
              { name: "@sentinel", value: SEED_SENTINEL_ID },
            ],
          })
          .fetchAll();
        return json(200, resources);
      }

      // ── GET /api/zones/{id} ───────────────────────────────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Zone not found" });
        return json(200, resource);
      }

      // ── POST /api/zones ───────────────────────────────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.id || !body.label) return json(400, { error: "id and label are required" });
        const doc = { ...body, venueId: VENUE_ID, isSeeded: false, createdAt: new Date().toISOString() };
        const { resource } = await container.items.create(doc);
        return json(201, resource);
      }

      // ── PATCH /api/zones/{id} ─────────────────────────────────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Zone not found" });
        const body    = await request.json();
        const updated = { ...existing, ...body, venueId: VENUE_ID, updatedAt: new Date().toISOString() };
        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/zones/{id} ────────────────────────────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("zones function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
