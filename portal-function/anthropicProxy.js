const { app } = require("@azure/functions");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

app.http("anthropicProxy", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "anthropic/{*path}",
  handler: async (request, context) => {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return {
        status: 204,
        headers: corsHeaders,
      };
    }

    // Retrieve API key from environment — never from the client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      context.error("ANTHROPIC_API_KEY environment variable is not set");
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: { message: "Server configuration error" } }),
      };
    }

    // Forward the request body as-is to Anthropic
    let body;
    try {
      body = await request.text();
    } catch (err) {
      return {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: { message: "Invalid request body" } }),
      };
    }

    try {
      const upstream = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body,
      });

      const responseBody = await upstream.text();

      return {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: responseBody,
      };
    } catch (err) {
      context.error("Failed to reach Anthropic API:", err);
      return {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: { message: "Failed to reach upstream API" } }),
      };
    }
  },
});
