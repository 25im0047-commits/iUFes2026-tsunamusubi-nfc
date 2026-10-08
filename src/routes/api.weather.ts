import { createFileRoute } from "@tanstack/react-router";
import { weatherResponse } from "../server/weather.server";
export const Route = createFileRoute("/api/weather")({
  server: { handlers: { GET: ({ request }) => weatherResponse(request, false) } },
});
