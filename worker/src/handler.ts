import type { Env, LyricsProvider, LyricsQuery, ProviderName } from "./types";
import { renderHomePage } from "./page";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

function json(value: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return Response.json(value, {
    status,
    headers: { ...corsHeaders, "Cache-Control": "no-store", ...extraHeaders }
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.API_TOKEN) return true;
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  return bearer === env.API_TOKEN || request.headers.get("X-API-Key") === env.API_TOKEN;
}

function parseQuery(url: URL): LyricsQuery | null {
  const title = url.searchParams.get("title")?.trim();
  const artist = url.searchParams.get("artist")?.trim();
  if (!title || !artist) return null;
  const duration = Number(url.searchParams.get("durationMs"));
  return {
    title,
    artist,
    album: url.searchParams.get("album")?.trim() || undefined,
    durationMs: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    spotifyId: url.searchParams.get("spotifyId")?.trim() || undefined,
    language: url.searchParams.get("language")?.trim() || undefined
  };
}

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : "provider request failed";
  return message.replace(/(?:token|api[_ -]?key|authorization)[=: ]+\S+/gi, "[redacted]");
}

async function withTimeout<T>(operation: Promise<T>, milliseconds = 8_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Provider timeout")), milliseconds);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createHandler(availableProviders: LyricsProvider[]) {
  return async (request: Request, env: Env, context: ExecutionContext): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET, OPTIONS" });

    const url = new URL(request.url);
    if (url.pathname === "/") {
      const ttl = Math.max(0, Number(env.CACHE_TTL_SECONDS ?? "86400") || 0);
      return new Response(renderHomePage({
        providers: availableProviders.map((item) => item.name),
        authEnabled: Boolean(env.API_TOKEN),
        cacheTtlSeconds: ttl
      }), {
        headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" }
      });
    }
    if (url.pathname === "/health") {
      return json({ service: "Lyricify Lyrics API", status: "ok", providers: availableProviders.map((item) => item.name) });
    }
    if (url.pathname !== "/v1/lyrics") return json({ error: "not_found" }, 404);
    if (!isAuthorized(request, env)) return json({ error: "unauthorized" }, 401);

    const query = parseQuery(url);
    if (!query) return json({ error: "invalid_request", message: "title and artist are required" }, 400);

    const configuredOrder = (env.PROVIDER_ORDER ?? "lrclib,netease,qqmusic")
      .split(",")
      .map((value) => value.trim().toLowerCase()) as ProviderName[];
    const selected = url.searchParams.get("providers")
      ?.split(",")
      .map((value) => value.trim().toLowerCase()) as ProviderName[] | undefined;
    const order = selected?.length ? selected : configuredOrder;
    const providers = order
      .map((name) => availableProviders.find((provider) => provider.name === name))
      .filter((provider): provider is LyricsProvider => provider !== undefined);

    const ttl = Math.max(0, Number(env.CACHE_TTL_SECONDS ?? "86400") || 0);
    const cacheAvailable = ttl > 0 && typeof caches !== "undefined";
    const defaultCache = cacheAvailable
      ? (caches as unknown as { default: Cache }).default
      : undefined;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    if (defaultCache) {
      const cached = await defaultCache.match(cacheKey);
      if (cached) return cached;
    }

    const attempted = providers.map((provider) => provider.name);
    const providerErrors: Partial<Record<ProviderName, string>> = {};
    type ProviderResult = Awaited<ReturnType<LyricsProvider["getLyrics"]>>;

    const createLyricsResponse = (result: NonNullable<ProviderResult>, cacheResult = true) => {
      const cacheControl = cacheResult ? `public, max-age=${ttl}` : "no-store";
      const response = json(result, 200, { "Cache-Control": cacheControl });
      if (cacheResult && defaultCache) {
        context?.waitUntil(defaultCache.put(cacheKey, response.clone()));
      }
      return response;
    };

    if (!query.language) {
      for (const provider of providers) {
        try {
          const result = await withTimeout(provider.getLyrics(query));
          if (result) return createLyricsResponse(result);
        } catch (error) {
          console.warn(`[${provider.name}]`, error instanceof Error ? error.message : error);
          providerErrors[provider.name] = sanitizeProviderError(error);
        }
      }
      return json({ error: "lyrics_not_found", attemptedProviders: attempted,
        ...(Object.keys(providerErrors).length > 0 ? { providerErrors } : {}) }, 404);
    }

    const results = await Promise.all(providers.map(async (provider): Promise<ProviderResult> => {
      try {
        return await withTimeout(provider.getLyrics(query));
      } catch (error) {
        console.warn(`[${provider.name}]`, error instanceof Error ? error.message : error);
        providerErrors[provider.name] = sanitizeProviderError(error);
        return null;
      }
    }));
    const requestedLanguage = query.language.toLowerCase().split(/[-_]/, 1)[0];
    let originalFallback: NonNullable<ProviderResult> | null = null;

    for (const result of results) {
      if (!result) continue;
      const translationLanguage = result.translation?.languageCode.toLowerCase().split(/[-_]/, 1)[0];
      const hasMatchingTranslation = translationLanguage === requestedLanguage
        && result.translation?.lines.some((line) => line.trim().length > 0) === true;
      if (hasMatchingTranslation) return createLyricsResponse(result);
      originalFallback ??= result;
    }

    if (originalFallback) return createLyricsResponse(originalFallback, false);
    return json({ error: "lyrics_not_found", attemptedProviders: attempted,
      ...(Object.keys(providerErrors).length > 0 ? { providerErrors } : {}) }, 404);
  };
}
