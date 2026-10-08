import { createServerFn } from "@tanstack/react-start";

// Fetch during SSR and serialize only the public setting with the document.
// Secrets and the database client remain on the server.
export const getInitialWeather = createServerFn({ method: "GET" }).handler(async () => {
  const { getDatabase, readWeather } = await import("../server/weather.server");
  let db: ReturnType<typeof getDatabase> | undefined;
  try {
    db = getDatabase();
    const { getSurveyRules } = await import("../server/surveys.server");
    // A settings outage must not hide an otherwise valid venue map.
    const [weather, rules] = await Promise.all([readWeather(db), getSurveyRules(db).catch(() => null)]);
    return { ...weather, rules };
  } catch {
    return null;
  } finally {
    db?.close();
  }
});
