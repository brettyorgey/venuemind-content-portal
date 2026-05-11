// campaigns.js — CRUD API for vm-portal-campaigns Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/campaigns           — list all campaigns for venue
//   POST   /api/campaigns           — create a new campaign
//   GET    /api/campaigns/{id}      — get single campaign
//   PATCH  /api/campaigns/{id}      — update campaign (partial — rules and contentPool embedded)
//   DELETE /api/campaigns/{id}      — delete campaign
//   POST   /api/campaigns/seed      — no-op seed (empty container — real data entered via UI)

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const client    = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database  = client.database("venuemind");
const container = database.container("vm-portal-campaigns");

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

app.http("campaigns", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "campaigns/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/campaigns/seed — no-op, container starts empty ──────────────
      if (method === "POST" && id === "seed") {
        try {
          const { resource: sentinel } = await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          if (sentinel) {
            return json(200, { message: "Already seeded", seeded: false });
          }
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e;
        }

        // Write sentinel only — no seed documents. Real data entered via UI.
        await container.items.upsert({
          id:       SEED_SENTINEL_ID,
          venueId:  VENUE_ID,
          seededAt: new Date().toISOString(),
          isSeeded: true,
        });

        return json(201, { message: "Seeded", count: 0, seeded: true });
      }

      // ── DELETE /api/campaigns/seed — purge all seeded records ─────────────────
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

      // ── GET /api/campaigns — list all campaigns for venue ─────────────────────
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

      // ── GET /api/campaigns/{id} ───────────────────────────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Campaign not found" });
        return json(200, resource);
      }

      // ── POST /api/campaigns — create campaign ─────────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.name || !body.partnerId) return json(400, { error: "name and partnerId are required" });
        const now = new Date().toISOString().split("T")[0];
        const doc = {
          ...body,
          id:          body.id || `cmp-${Date.now()}`,
          venueId:     VENUE_ID,
          isSeeded:    false,
          eventIds:    body.eventIds    || [],
          rules:       body.rules       || [],
          contentPool: body.contentPool || [],
          createdAt:   body.createdAt   || now,
          updatedAt:   now,
        };
        const { resource } = await container.items.create(doc);
        return json(201, resource);
      }

      // ── PATCH /api/campaigns/{id} — partial update ────────────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Campaign not found" });
        const body    = await request.json();
        const updated = {
          ...existing,
          ...body,
          venueId:   VENUE_ID,
          updatedAt: new Date().toISOString().split("T")[0],
        };
        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/campaigns/{id} ────────────────────────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("campaigns function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
