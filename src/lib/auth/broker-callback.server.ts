/**
 * Keeps the Grok broker's OAuth return address stable across Better Auth 1.7.
 *
 * Better Auth 1.6's `genericOAuth` plugin served its own callback route at
 * `/api/auth/oauth2/callback/<providerId>`, and that is the `redirect_uri` the
 * Grok auth broker has on file for this app (and that the shared preview client
 * allows for `*.grok-sandbox.com`, see `./preview`). Better Auth 1.7 moved
 * generic providers onto the core `/callback/<providerId>` route, which the
 * broker would reject as an unregistered redirect.
 *
 * This plugin keeps the old address on both sides of the round-trip:
 *  - `init`: sets `callbackPath` on each broker provider, so Better Auth builds
 *    the authorize `redirect_uri` (and the matching token-exchange
 *    `redirect_uri`) as `<baseURL>/oauth2/callback/<providerId>`.
 *  - `onRequest`: rewrites an incoming `<basePath>/oauth2/callback/<id>` to the
 *    core `<basePath>/callback/<id>` handler, query and body untouched.
 *
 * Must be listed AFTER `genericOAuth` in `plugins` so its providers exist when
 * `init` runs. Only providers listed in `GROK_PROVIDERS` are touched.
 */
import type { BetterAuthPlugin } from "better-auth";
import { GROK_PROVIDERS } from "./providers.ts";

const BROKER_IDS = new Set(GROK_PROVIDERS.map((p) => p.providerId));
const LEGACY_SEGMENT = "/oauth2/callback/";

/** `/oauth2/callback/<id>`: the path under `baseURL` the broker returns to. */
export function brokerCallbackPath(providerId: string): string {
  return `${LEGACY_SEGMENT}${providerId}`;
}

/**
 * Map a request path under `basePath` from the legacy callback to the core one.
 * Returns null when the path is not a legacy callback for a broker provider.
 */
export function rewriteBrokerCallbackPath(pathname: string, basePath: string): string | null {
  const base = basePath.replace(/\/+$/, "");
  const prefix = `${base}${LEGACY_SEGMENT}`;
  if (!pathname.startsWith(prefix)) return null;
  const id = pathname.slice(prefix.length).replace(/\/+$/, "");
  if (!id || id.includes("/") || !BROKER_IDS.has(id)) return null;
  return `${base}/callback/${id}`;
}

type ProviderLike = { id: string; callbackPath?: string };

export const brokerCallbackCompat = () =>
  ({
    id: "grok-broker-callback",
    init(ctx) {
      for (const provider of ctx.socialProviders as ProviderLike[]) {
        if (BROKER_IDS.has(provider.id)) provider.callbackPath = brokerCallbackPath(provider.id);
      }
    },
    async onRequest(request, ctx) {
      const url = new URL(request.url);
      const basePath = ctx.options.basePath ?? "/api/auth";
      const target = rewriteBrokerCallbackPath(url.pathname, basePath);
      if (!target) return;
      url.pathname = target;
      // The broker returns with GET (query) or form_post (POST body); keep both.
      const hasBody = request.method !== "GET" && request.method !== "HEAD";
      return {
        request: new Request(url, {
          method: request.method,
          headers: request.headers,
          body: hasBody ? await request.arrayBuffer() : undefined,
        }),
      };
    },
  }) satisfies BetterAuthPlugin;
