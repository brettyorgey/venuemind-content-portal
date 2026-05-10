const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

// ── Cosmos client ─────────────────────────────────────────────────────────────
const client     = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database   = client.database("vm-portal");
const container  = database.container("vm-portal-content");

const VENUE_ID   = "adelaideoval";

// ── CORS helper ───────────────────────────────────────────────────────────────
function corsHeaders(req) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  const origin  = req.headers.get("origin") || "";
  const o       = allowed === "*" ? "*" : (origin === allowed ? origin : "");
  return {
    "Access-Control-Allow-Origin":  o || allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_CONTENT = [
  { id: "ctn-001", partnerId: "maccas", name: "Summer Campaign Hero",  filename: "maccas_summer_hero_1920x1080.mp4",  type: "video/mp4",  size: 12400000, status: "live",     uploaded: "2026-04-01", reviewed: "2026-04-02", rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-002", partnerId: "maccas", name: "McDelivery Promo",      filename: "maccas_mcdelivery_1920x1080.png",   type: "image/png",  size:  2100000, status: "approved", uploaded: "2026-04-10", reviewed: "2026-04-11", rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-003", partnerId: "maccas", name: "Happy Meal Spring",     filename: "maccas_happymeal_spring.mp4",       type: "video/mp4",  size: 18700000, status: "pending",  uploaded: "2026-04-17", reviewed: null,         rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-004", partnerId: "maccas", name: "Breakfast Range",       filename: "maccas_breakfast_1920x1080.png",    type: "image/png",  size:  3400000, status: "rejected", uploaded: "2026-04-05", reviewed: "2026-04-06", rejectReason: "Image resolution is 1280x720. Required: 1920x1080.", allocationId: null, contentId: null },
  { id: "ctn-005", partnerId: "maccas", name: "McCafe Autumn",         filename: "maccas_mccafe_autumn.mp4",          type: "video/mp4",  size: 15200000, status: "live",     uploaded: "2026-03-20", reviewed: "2026-03-21", rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-006", partnerId: "iren",   name: "Iren Brand Awareness",  filename: "iren_brand_1920x1080.mp4",          type: "video/mp4",  size: 14200000, status: "pending",  uploaded: "2026-04-16", reviewed: null,         rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-007", partnerId: "iren",   name: "Iren Solar Promo",      filename: "iren_solar_1920x1080.png",          type: "image/png",  size:  2800000, status: "live",     uploaded: "2026-03-28", reviewed: "2026-03-29", rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-008", partnerId: "sapol",  name: "Road Safety Campaign",  filename: "sapol_roadsafety_1920x1080.mp4",    type: "video/mp4",  size: 16500000, status: "pending",  uploaded: "2026-04-18", reviewed: null,         rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-009", partnerId: "disney", name: "Disney+ Streaming",     filename: "disney_streaming_1920x1080.mp4",    type: "video/mp4",  size: 11000000, status: "approved", uploaded: "2026-04-12", reviewed: "2026-04-13", rejectReason: null, allocationId: null, contentId: null },
  { id: "ctn-010", partnerId: "afl",    name: "AFL Season 2026",       filename: "afl_season2026_1920x1080.mp4",      type: "video/mp4",  size: 19500000, status: "live",     uploaded: "2026-03-15", reviewed: "2026-03-16", rejectReason: null, allocationId: null, contentId: null },
];

// ── GET /api/content — list all content for venue ─────────────────────────────
app.http("contentList", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "content",
  handler: async (req, ctx) => {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers };

    try {
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.venueId = @venueId ORDER BY c.uploaded DESC",
          parameters: [{ name: "@venueId", value: VENUE_ID }],
        })
        .fetchAll();
      return { status: 200, headers, jsonBody: resources };
    } catch (err) {
      ctx.error("contentList error:", err);
      return { status: 500, headers, jsonBody: { error: err.message } };
    }
  },
});

// ── POST /api/content — create a content item ─────────────────────────────────
app.http("contentCreate", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "content",
  handler: async (req, ctx) => {
    const headers = corsHeaders(req);
    try {
      const body = await req.json();
      const now  = new Date().toISOString().split("T")[0];
      const item = {
        ...body,
        id:       `ctn-${Date.now()}`,
        venueId:  VENUE_ID,
        uploaded: body.uploaded || now,
        reviewed: body.reviewed || null,
        rejectReason: body.rejectReason || null,
        allocationId: body.allocationId || null,
        contentId:    body.contentId    || null,
      };
      const { resource } = await container.items.create(item);
      return { status: 201, headers, jsonBody: resource };
    } catch (err) {
      ctx.error("contentCreate error:", err);
      return { status: 500, headers, jsonBody: { error: err.message } };
    }
  },
});

// ── PATCH /api/content/{id} — partial update ──────────────────────────────────
app.http("contentUpdate", {
  methods: ["PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "content/{id}",
  handler: async (req, ctx) => {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers };

    const { id } = req.params;
    try {
      const patch = await req.json();

      // Read existing document first (partition key = venueId)
      const { resource: existing } = await container.item(id, VENUE_ID).read();
      if (!existing) return { status: 404, headers, jsonBody: { error: "Not found" } };

      const updated = { ...existing, ...patch, id, venueId: VENUE_ID };
      const { resource } = await container.item(id, VENUE_ID).replace(updated);
      return { status: 200, headers, jsonBody: resource };
    } catch (err) {
      ctx.error("contentUpdate error:", err);
      return { status: 500, headers, jsonBody: { error: err.message } };
    }
  },
});

// ── DELETE /api/content/{id} ──────────────────────────────────────────────────
app.http("contentDelete", {
  methods: ["DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "content/{id}",
  handler: async (req, ctx) => {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers };

    const { id } = req.params;
    try {
      await container.item(id, VENUE_ID).delete();
      return { status: 204, headers };
    } catch (err) {
      ctx.error("contentDelete error:", err);
      return { status: 500, headers, jsonBody: { error: err.message } };
    }
  },
});

// ── POST /api/content/seed — idempotent seed ──────────────────────────────────
app.http("contentSeed", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "content/seed",
  handler: async (req, ctx) => {
    const headers = corsHeaders(req);
    try {
      // Check if any content exists for this venue
      const { resources } = await container.items
        .query({
          query: "SELECT c.id FROM c WHERE c.venueId = @venueId OFFSET 0 LIMIT 1",
          parameters: [{ name: "@venueId", value: VENUE_ID }],
        })
        .fetchAll();

      if (resources.length > 0) {
        return { status: 200, headers, jsonBody: { seeded: false, message: "Already seeded" } };
      }

      // Insert seed documents
      await Promise.all(
        SEED_CONTENT.map(item =>
          container.items.create({ ...item, venueId: VENUE_ID })
        )
      );

      return { status: 201, headers, jsonBody: { seeded: true, count: SEED_CONTENT.length } };
    } catch (err) {
      ctx.error("contentSeed error:", err);
      return { status: 500, headers, jsonBody: { error: err.message } };
    }
  },
});
