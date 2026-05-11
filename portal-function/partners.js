// partners.js — CRUD API for vm-portal-partners Cosmos DB container
// Gate 2: venueId hardcoded to "adelaideoval" — replaced by MSAL identity in Gate 2.5
//
// Routes:
//   GET    /api/partners            — list all partners for venue
//   POST   /api/partners            — create a new partner
//   GET    /api/partners/{id}       — get single partner
//   PATCH  /api/partners/{id}       — update partner (partial)
//   DELETE /api/partners/{id}       — delete partner
//   POST   /api/partners/seed       — write seed data (idempotent)
//   DELETE /api/partners/seed       — purge all seeded records

const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const client    = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database  = client.database("venuemind");
const container = database.container("vm-portal-partners");

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

const SEED_PARTNERS = [
  { id: 'maccas', label: "McDonald's",      initials: 'M',   pkg: 'Package 1',                     contracted: 12, contractedSecs: 360,  bonusSecs: 60, pieces: 5, color: '#FAEEDA', text: '#854F0B', guest: false, isSeeded: true },
  { id: 'iren1',  label: 'Iren Energy 1',   initials: 'IE',  pkg: 'Package 2',                     contracted: 12, contractedSecs: 360,  bonusSecs: 0,  pieces: 1, color: '#E6F1FB', text: '#0C447C', guest: false, isSeeded: true },
  { id: 'iren2',  label: 'Iren Energy 2',   initials: 'IE2', pkg: 'Package 3',                     contracted: 12, contractedSecs: 360,  bonusSecs: 0,  pieces: 1, color: '#B5D4F4', text: '#185FA5', guest: false, isSeeded: true },
  { id: 'sapol',  label: 'SA Police',       initials: 'SP',  pkg: 'Package 5',                     contracted: 12, contractedSecs: 360,  bonusSecs: 0,  pieces: 1, color: '#EEEDFE', text: '#3C3489', guest: false, isSeeded: true },
  { id: 'afl',    label: 'AFL',             initials: 'AF',  pkg: 'League Content',                contracted: 48, contractedSecs: 1440, bonusSecs: 0,  pieces: 3, color: '#FCEBEB', text: '#791F1F', guest: false, isSeeded: true },
  { id: 'disney', label: 'Disney+',         initials: 'D+',  pkg: 'Spare Package 1',               contracted: 12, contractedSecs: 360,  bonusSecs: 0,  pieces: 1, color: '#E1F5EE', text: '#085041', guest: false, isSeeded: true },
  { id: 'nrma',   label: 'NRMA Insurance',  initials: 'NR',  pkg: 'Insurance Package (Placeholder)', contracted: 6, contractedSecs: 180,  bonusSecs: 0,  pieces: 1, color: '#FEF9C3', text: '#713F12', guest: false, placeholder: true, isSeeded: true },
  { id: 'raa',    label: 'RAA Insurance',   initials: 'RA',  pkg: 'Insurance Package (Placeholder)', contracted: 6, contractedSecs: 180,  bonusSecs: 0,  pieces: 1, color: '#FEE2E2', text: '#7F1D1D', guest: false, placeholder: true, isSeeded: true },
];

app.http("partners", {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "partners/{id?}",
  handler: async (request, context) => {

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    const id     = request.params.id;
    const method = request.method;

    try {

      // ── POST /api/partners/seed ───────────────────────────────────────────────
      if (method === "POST" && id === "seed") {
        try {
          const { resource: sentinel } = await container.item(SEED_SENTINEL_ID, VENUE_ID).read();
          if (sentinel) {
            return json(200, { message: "Already seeded", seeded: false });
          }
        } catch (e) {
          if (e.code !== 404 && e.statusCode !== 404) throw e;
        }

        for (const partner of SEED_PARTNERS) {
          await container.items.upsert({ ...partner, venueId: VENUE_ID });
        }
        await container.items.upsert({
          id: SEED_SENTINEL_ID, venueId: VENUE_ID,
          seededAt: new Date().toISOString(), isSeeded: true,
        });

        return json(201, { message: "Seeded", count: SEED_PARTNERS.length, seeded: true });
      }

      // ── DELETE /api/partners/seed ─────────────────────────────────────────────
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

      // ── GET /api/partners ─────────────────────────────────────────────────────
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

      // ── GET /api/partners/{id} ────────────────────────────────────────────────
      if (method === "GET" && id) {
        const { resource } = await container.item(id, VENUE_ID).read();
        if (!resource) return json(404, { error: "Partner not found" });
        return json(200, resource);
      }

      // ── POST /api/partners ────────────────────────────────────────────────────
      if (method === "POST" && !id) {
        const body = await request.json();
        if (!body.id || !body.label) return json(400, { error: "id and label are required" });
        const doc = { ...body, venueId: VENUE_ID, isSeeded: false, createdAt: new Date().toISOString() };
        const { resource } = await container.items.create(doc);
        return json(201, resource);
      }

      // ── PATCH /api/partners/{id} ──────────────────────────────────────────────
      if (method === "PATCH" && id) {
        const { resource: existing } = await container.item(id, VENUE_ID).read();
        if (!existing) return json(404, { error: "Partner not found" });
        const body    = await request.json();
        const updated = { ...existing, ...body, venueId: VENUE_ID, updatedAt: new Date().toISOString() };
        const { resource } = await container.item(id, VENUE_ID).replace(updated);
        return json(200, resource);
      }

      // ── DELETE /api/partners/{id} ─────────────────────────────────────────────
      if (method === "DELETE" && id) {
        await container.item(id, VENUE_ID).delete();
        return json(200, { message: "Deleted", id });
      }

      return json(405, { error: "Method not allowed" });

    } catch (err) {
      context.error("partners function error:", err);
      if (err.code === 404) return json(404, { error: "Not found" });
      return json(500, { error: "Internal server error", detail: err.message });
    }
  },
});
