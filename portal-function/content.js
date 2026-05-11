// content.js — CRUD API for vm-portal-content Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/content             — list all content for venue
//   POST   /api/content             — create a new content item
//   GET    /api/content/{id}        — get single content item
//   PATCH  /api/content/{id}        — update content item (partial)
//   DELETE /api/content/{id}        — delete content item
//   POST   /api/content/seed        — write seed data (idempotent — no-op if already seeded)
//   DELETE /api/content/seed        — purge all seeded records (pre-go-live cleanup)

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

// ── Cosmos connection ─────────────────────────────────────────────────────────
const client    = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database  = client.database("venuemind");
const container = database.container("vm-portal-content");

const VENUE_ID         = "adelaideoval";
const SEED_SENTINEL_ID = "_seed_metadata";

// ── CORS headers ──────────────────────────────────────────────────────────────
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
const SEED_CONTENT = [
  { id: "ctn-001", partnerId: "maccas", name: "Summer Campaign Hero",  filename: "maccas_summer_hero_1920x1080.mp4",  type: "video/mp4",  size: 12400000, status: "live",     uploaded: "2026-04-01", reviewed: "2026-04-02", rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-002", partnerId: "maccas", name: "McDelivery Promo",      filename: "maccas_mcdelivery_1920x1080.png",   type: "image/png",  size:  2100000, status: "approved", uploaded: "2026-04-10", reviewed: "2026-04-11", rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-003", partnerId: "maccas", name: "Happy Meal Spring",     filename: "maccas_happymeal_spring.mp4",       type: "video/mp4",  size: 18700000, status: "pending",  uploaded: "2026-04-17", reviewed: null,         rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-004", partnerId: "maccas", name: "Breakfast Range",       filename: "maccas_breakfast_1920x1080.png",    type: "image/png",  size:  3400000, status: "rejected", uploaded: "2026-04-05", reviewed: "2026-04-06", rejectReason: "Image resolution is 1280x720. Required: 1920x1080.", allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-005", partnerId: "maccas", name: "McCafe Autumn",         filename: "maccas_mccafe_autumn.mp4",          type: "video/mp4",  size: 15200000, status: "live",     uploaded: "2026-03-20", reviewed: "2026-03-21", rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-006", partnerId: "iren",   name: "Iren Brand Awareness",  filename: "iren_brand_1920x1080.mp4",          type: "video/mp4",  size: 14200000, status: "pending",  uploaded: "2026-04-16", reviewed: null,         rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-007", partnerId: "iren",   name: "Iren Solar Promo",      filename: "iren_solar_1920x1080.png",          type: "image/png",  size:  2800000, status: "live",     uploaded: "2026-03-28", reviewed: "2026-03-29", rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-008", partnerId: "sapol",  name: "Road Safety Campaign",  filename: "sapol_roadsafety_1920x1080.mp4",    type: "video/mp4",  size: 16500000, status: "pending",  uploaded: "2026-04-18", reviewed: null,         rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-009", partnerId: "disney", name: "Disney+ Streaming",     filename: "disney_streaming_1920x1080.mp4",    type: "video/mp4",  size: 11000000, status: "approved", uploaded: "2026-04-12", reviewed: "2026-04-13", rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
  { id: "ctn-010", partnerId: "afl",    name: "AFL Season 2026",       filename: "afl_season2026_1920x1080.mp4",      type: "video/mp4",  size: 19500000, status: "live",     uploaded: "2026-03-15", reviewed: "2026-03-16", rejectReason: null, allocationId: null, contentId: null, isSeeded: true },
];

// ── Route handler ─────────────────────────────────────────────────────────────
app.http("content", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "content/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/content/seed — write seed data (idempotent) ─────────────────
      if (method === "POST" && id === "seed") {
        try {
          const { resource: sentinel } = await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          if (sentinel) {
            return json(200, { message: "Already seeded", seeded: false });
          }
          // resource undefined — not found, proceed with seeding
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e;
        }

        for (const item of SEED_CONTENT) {
          await container.items.upsert({ ...item, venueId: VENUE_ID });
        }

        await container.items.upsert({
          id:       SEED_SENTINEL_ID,
          venueId:  VENUE_ID,
          seededAt: new Date().toISOString(),
          isSeeded: true,
        });

        return json(201, { message: "Seeded", count: SEED_CONTENT.length, seeded: true });
      }

      // ── DELETE /api/content/seed — purge all seeded records ───────────────────
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

      // ── GET /api/content — list all content for venue ─────────────────────────
      if (method === "GET" && !id) {
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.venueId = @venueId AND c.id != @sentinel ORDER BY c.uploaded DESC",
            parameters: [
              { name: "@venueId",  value: VENUE_ID },
              { name: "@sentinel", value: SEED_SENTINEL_ID },
            ],
          })
          .fetchAll();

        return json(200, resources);
      }

      // ── GET /api/content/{id} — single content item ───────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Content not found" });
        return json(200, resource);
      }

      // ── POST /api/content — create content item ───────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.partnerId) return json(400, { error: "partnerId is required" });

        const now = new Date().toISOString().split("T")[0];
        const doc = {
          ...body,
          id:           body.id || `ctn-${Date.now()}`,
          venueId:      VENUE_ID,
          isSeeded:     false,
          uploaded:     body.uploaded     || now,
          reviewed:     body.reviewed     || null,
          rejectReason: body.rejectReason || null,
          allocationId: body.allocationId || null,
          contentId:    body.contentId    || null,
        };

        const { resource } = await container.items.create(doc);
        return json(201, resource);
      }

      // ── PATCH /api/content/{id} — partial update ──────────────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Content not found" });

        const body    = await request.json();
        const updated = { ...existing, ...body, venueId: VENUE_ID, updatedAt: new Date().toISOString() };

        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/content/{id} — delete content item ────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("content function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
