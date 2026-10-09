import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { installWeatherTransport } from "../weather-transport.mjs";

// Run after building with NITRO_PRESET=vercel. Exercise the generated function,
// since a successful Vite build alone does not guarantee deployable routes.
const output = new URL("../../.vercel/output/", import.meta.url);
const config = JSON.parse(await readFile(new URL("config.json", output), "utf8"));
const serverRoute = config.routes.find((route) => route.src === "/(.*)" && route.dest);
assert.ok(serverRoute, "Vercel output must route page requests to a server function");
const functionDirectory = new URL(`functions${serverRoute.dest}.func/`, output);
const functionConfig = JSON.parse(
  await readFile(new URL(".vc-config.json", functionDirectory), "utf8"),
);
const { default: handler } = await import(new URL(functionConfig.handler, functionDirectory).href);

for (const path of ["/", "/?id=good-01&source=nfc"]) {
  test(`Vercel function renders ${path} with published assets`, async () => {
    const response = await handler.fetch(new Request(`https://rally.example${path}`));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    const html = await response.text();
    assert.match(html, /<main\b/, "The TanStack page must render, not an empty HTML shell");
    assert.match(html, /<script\b[^>]*type="module"/, "Client hydration must be included");

    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(
      (match) => match[1],
    );
    assert.ok(assets.some((asset) => asset.endsWith(".js")), "Client JavaScript must be published");
    assert.ok(assets.some((asset) => asset.endsWith(".css")), "Styles must be published");
    for (const asset of new Set(assets)) {
      await access(new URL(`static${asset}`, output));
    }
  });
}

test("unknown routes return the application's 404", async () => {
  const response = await handler.fetch(new Request("https://rally.example/missing-route"));
  assert.equal(response.status, 404);
  assert.match(await response.text(), /<title>iUFes2026 おばけMap<\/title>/);
});

test("admin page is server-rendered without publishing credentials", async () => {
  const response = await handler.fetch(new Request("https://rally.example/admin"));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /会場配置の管理/);
  assert.match(html, /type="password"/);
  assert.doesNotMatch(html, /TURSO_AUTH_TOKEN|ADMIN_PASSWORD/);
});

test("weather endpoints are API responses and fail closed without environment setup", async () => {
  for (const path of ["/api/weather", "/api/admin/weather"]) {
    const response = await handler.fetch(new Request("https://rally.example" + path));
    assert.equal(response.status, 503);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok((await response.json()).error);
  }
});

test("SSR sends the shared rainy setting with the document and preloads the plain 1F map", async () => {
  const transport = installWeatherTransport("rainy");
  try {
    const response = await handler.fetch(new Request("https://rally.example/"));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal(transport.reads(), 1);
    assert.match(html, /rainy/);
    assert.match(html, /rel="preload"[^>]*href="\/maps\/rally-map-1f-sunny-20261008\.png"/);
    assert.doesNotMatch(html, /test-only-token|TURSO_AUTH_TOKEN/);
  } finally { transport.restore(); }
});

test("survey routes reach JSON handlers and fail closed without DB configuration",async()=>{
 for(const [path,method] of [["/api/survey-rules","GET"],["/api/survey-responses","POST"],["/api/admin/survey-rules","GET"],["/api/admin/survey-responses","GET"],["/api/admin/survey-export","GET"]]){
  const response=await handler.fetch(new Request("https://rally.example"+path,{method}));
  assert.equal(response.status,503);assert.match(response.headers.get("content-type"),/application\/json/);
  assert.equal(response.headers.get("cache-control"),"no-store");assert.ok((await response.json()).error);
 }
});
