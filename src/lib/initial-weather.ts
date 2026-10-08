import { createServerFn } from "@tanstack/react-start";

// Fetch during SSR and serialize only the public setting with the document.
// Secrets and the database client remain on the server.
export const getInitialWeather = createServerFn({ method: "GET" }).handler(async () => {
  const { getDatabase, readWeather } = await import("../server/weather.server");
  let db: ReturnType<typeof getDatabase> | undefined;
  try {
    db = getDatabase();
    return await readWeather(db);
  } catch {
    return null;
  } finally {
    db?.close();
  }
});
