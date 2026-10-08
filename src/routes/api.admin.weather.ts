import { createFileRoute } from "@tanstack/react-router";
import { weatherResponse } from "../server/weather.server";
export const Route = createFileRoute("/api/admin/weather")({
  server: { handlers: {
    GET: ({ request }) => weatherResponse(request, true),
    PUT: ({ request }) => weatherResponse(request, true),
  } },
});
