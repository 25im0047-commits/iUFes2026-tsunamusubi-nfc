import { createClient } from "@libsql/client/web";
import { schema } from "../src/server/weather.server.ts";
const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
if (!url || !authToken) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
const db = createClient({ url, authToken });
try {
  await db.batch(schema, "write");
  const result = await db.execute("SELECT weather FROM iufes2026_weather WHERE id = 1");
  console.log("iUFes2026 weather initialized:", result.rows[0].weather);
} finally { db.close(); }
