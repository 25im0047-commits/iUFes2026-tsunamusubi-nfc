import { createClient } from "@libsql/client/web";
import { surveySchema } from "../src/server/surveys.server.ts";
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try { await db.batch(surveySchema, "write"); console.log("iUFes survey tables initialized; existing rules/answers retained."); }
finally { db.close(); }
