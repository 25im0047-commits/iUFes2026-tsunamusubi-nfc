import { createFileRoute } from "@tanstack/react-router";
import { surveyResponse } from "../server/surveys.server";
export const Route = createFileRoute("/api/admin/survey-rules")({ server: { handlers: {
 GET: ({ request }) => surveyResponse(request, "admin-rules"), PUT: ({ request }) => surveyResponse(request, "admin-rules"),
} } });
