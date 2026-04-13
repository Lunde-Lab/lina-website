interface Env {
  PDF_COUNTERS: KVNamespace;
  STATS_TOKEN: string;
}

const VALID_LANGS = new Set(["en", "no", "sv", "da", "fi", "de", "nl", "fr"]);

const CORS_ORIGINS: Record<string, string[]> = {
  "https://getlina.app": ["POST", "OPTIONS"],
  "https://lunde-lab.me": ["GET", "OPTIONS"],
};

function getCorsHeaders(origin: string | null, method: string): Headers | null {
  if (!origin) return null;
  const allowedMethods = CORS_ORIGINS[origin];
  if (!allowedMethods || !allowedMethods.includes(method)) return null;

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const method = request.method;

    // OPTIONS preflight
    if (method === "OPTIONS") {
      const corsHeaders = getCorsHeaders(origin, "OPTIONS");
      if (!corsHeaders) {
        return new Response("Forbidden", { status: 403 });
      }
      corsHeaders.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /count?lang=xx
    if (method === "POST" && url.pathname === "/count") {
      const corsHeaders = getCorsHeaders(origin, "POST");
      if (!corsHeaders) {
        return new Response("Forbidden", { status: 403 });
      }

      const lang = url.searchParams.get("lang");
      if (!lang || !VALID_LANGS.has(lang)) {
        return new Response(
          JSON.stringify({ error: "Invalid or missing lang parameter. Must be one of: en, no, sv, da, fi, de, nl, fr" }),
          { status: 400, headers: { ...Object.fromEntries(corsHeaders), "Content-Type": "application/json" } }
        );
      }

      const key = `pdf:${lang}`;
      try {
        const current = parseInt((await env.PDF_COUNTERS.get(key)) ?? "0") || 0;
        await env.PDF_COUNTERS.put(key, String(current + 1));
        return new Response(null, { status: 204, headers: corsHeaders });
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to update counter" }),
          { status: 500, headers: { ...Object.fromEntries(corsHeaders), "Content-Type": "application/json" } }
        );
      }
    }

    // GET /count?token=SECRET
    if (method === "GET" && url.pathname === "/count") {
      // If Origin is set, validate it — unknown browser origins get 403
      // If Origin is absent (curl, server-to-server), allow without CORS headers
      let corsHeaders: Headers | null = null;
      if (origin !== null) {
        corsHeaders = getCorsHeaders(origin, "GET");
        if (!corsHeaders) {
          return new Response("Forbidden", { status: 403 });
        }
      }

      const baseHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (corsHeaders) Object.assign(baseHeaders, Object.fromEntries(corsHeaders));

      const token = url.searchParams.get("token");
      if (!token || token !== env.STATS_TOKEN) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: baseHeaders }
        );
      }

      try {
        const list = await env.PDF_COUNTERS.list({ prefix: "pdf:" });
        const counts: Record<string, number> = {};

        await Promise.all(
          list.keys.map(async ({ name }) => {
            const lang = name.replace("pdf:", "");
            const value = await env.PDF_COUNTERS.get(name);
            counts[lang] = parseInt(value ?? "0") || 0;
          })
        );

        return new Response(JSON.stringify(counts), {
          status: 200,
          headers: baseHeaders,
        });
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to read counters" }),
          { status: 500, headers: baseHeaders }
        );
      }
    }

    // Unknown route
    if (url.pathname !== "/count") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Invalid method
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  },
};
