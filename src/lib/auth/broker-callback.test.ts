import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { brokerCallbackCompat, brokerCallbackPath, rewriteBrokerCallbackPath } from "./broker-callback.server.ts";

describe("broker callback compatibility", () => {
  it("keeps the broker's registered return path", () => {
    assert.equal(brokerCallbackPath("grok-google"), "/oauth2/callback/grok-google");
  });

  it("rewrites the legacy callback to the core route", () => {
    assert.equal(
      rewriteBrokerCallbackPath("/api/auth/oauth2/callback/grok-google", "/api/auth"),
      "/api/auth/callback/grok-google",
    );
    assert.equal(
      rewriteBrokerCallbackPath("/api/auth/oauth2/callback/grok-x/", "/api/auth/"),
      "/api/auth/callback/grok-x",
    );
  });

  it("leaves other paths and unknown providers alone", () => {
    assert.equal(rewriteBrokerCallbackPath("/api/auth/callback/grok-google", "/api/auth"), null);
    assert.equal(rewriteBrokerCallbackPath("/api/auth/oauth2/callback/github", "/api/auth"), null);
    assert.equal(rewriteBrokerCallbackPath("/api/auth/oauth2/callback/grok-x/extra", "/api/auth"), null);
    assert.equal(rewriteBrokerCallbackPath("/api/auth/oauth2/callback/", "/api/auth"), null);
  });

  it("sets callbackPath only on broker providers", () => {
    const providers = [{ id: "grok-google" }, { id: "grok-x" }, { id: "google" }] as Array<{
      id: string;
      callbackPath?: string;
    }>;
    const plugin = brokerCallbackCompat();
    plugin.init({ socialProviders: providers } as never);
    assert.deepEqual(
      providers.map((p) => p.callbackPath),
      ["/oauth2/callback/grok-google", "/oauth2/callback/grok-x", undefined],
    );
  });

  it("rewrites a GET callback request and keeps the query", async () => {
    const plugin = brokerCallbackCompat();
    const req = new Request("https://app.example/api/auth/oauth2/callback/grok-google?code=abc&state=xyz");
    const out = await plugin.onRequest(req, { options: {} } as never);
    assert.ok(out && "request" in out);
    assert.equal(new URL(out.request.url).pathname, "/api/auth/callback/grok-google");
    assert.equal(new URL(out.request.url).search, "?code=abc&state=xyz");
    assert.equal(await plugin.onRequest(new Request("https://app.example/api/auth/get-session"), { options: {} } as never), undefined);
  });

  it("keeps a form_post body", async () => {
    const plugin = brokerCallbackCompat();
    const req = new Request("https://app.example/api/auth/oauth2/callback/grok-x", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "code=abc&state=xyz",
    });
    const out = await plugin.onRequest(req, { options: {} } as never);
    assert.ok(out && "request" in out);
    assert.equal(out.request.method, "POST");
    assert.equal(await out.request.text(), "code=abc&state=xyz");
  });
});
