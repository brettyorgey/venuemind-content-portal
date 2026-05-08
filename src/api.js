// src/api.js — Centralised API client for the VenueMind Content Portal
// In development: calls /api/* via Vite proxy (localhost).
// In production: calls the Function App directly (SWA linked backend cross-region routing unreliable).
// Gate 2: venueId is hardcoded server-side to "adelaideoval".
// Gate 2.5: venueId will be resolved from the MSAL token server-side — no change needed here.

const FUNCTION_APP_URL = "https://venuemind-portal-function-cnh0fgeve3gfefbe.australiaeast-01.azurewebsites.net/api";

const BASE = import.meta.env.PROD ? FUNCTION_APP_URL : "/api";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || "API error"), { status: res.status, detail: err });
  }
  return res.json();
}

// ── Events ────────────────────────────────────────────────────────────────────
export const api = {
  events: {
    list:   ()          => request("GET",    "/events"),
    get:    (id)        => request("GET",    `/events/${id}`),
    create: (event)     => request("POST",   "/events", event),
    update: (id, patch) => request("PATCH",  `/events/${id}`, patch),
    delete: (id)        => request("DELETE", `/events/${id}`),
    seed:   ()          => request("POST",   "/events/seed"),
  },

  allocations: {
    list:        ()          => request("GET",    "/allocations"),
    listByEvent: (eventId)   => request("GET",    `/allocations?eventId=${eventId}`),
    get:         (id)        => request("GET",    `/allocations/${id}`),
    create:      (alloc)     => request("POST",   "/allocations", alloc),
    update:      (id, patch) => request("PATCH",  `/allocations/${id}`, patch),
    delete:      (id)        => request("DELETE", `/allocations/${id}`),
    seed:        ()          => request("POST",   "/allocations/seed"),
  },
};
