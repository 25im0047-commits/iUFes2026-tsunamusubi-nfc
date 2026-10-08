// Read-only libSQL HTTP fixture: exercises the generated SSR route without a live database.
export function installWeatherTransport(weather = "rainy") {
  const previousFetch = globalThis.fetch;
  const previous = { url: process.env.TURSO_DATABASE_URL, token: process.env.TURSO_AUTH_TOKEN };
  process.env.TURSO_DATABASE_URL = "https://weather-ssr.test";
  process.env.TURSO_AUTH_TOKEN = "test-only-token";
  let reads = 0;
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    if (new URL(request.url).hostname !== "weather-ssr.test") return previousFetch(input, init);
    const body = await request.clone().json();
    return Response.json({ baton: null, base_url: null, results: body.requests.map(item => {
      if (item.type === "close") return { type: "ok", response: { type: "close" } };
      if (item.type !== "execute" || !/^SELECT weather, updated_at FROM iufes2026_weather/.test(item.stmt.sql))
        throw new Error("Fixture accepts only the public weather read");
      reads++;
      return { type: "ok", response: { type: "execute", result: {
        cols: [{ name: "weather", decltype: "TEXT" }, { name: "updated_at", decltype: "TEXT" }],
        rows: [[{ type: "text", value: weather }, { type: "text", value: "2026-10-08T00:00:00.000Z" }]],
        affected_row_count: 0, last_insert_rowid: null,
      } } };
    }) });
  };
  return {
    reads: () => reads,
    restore() {
      globalThis.fetch = previousFetch;
      for (const [key, value] of [["TURSO_DATABASE_URL", previous.url], ["TURSO_AUTH_TOKEN", previous.token]]) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    },
  };
}
