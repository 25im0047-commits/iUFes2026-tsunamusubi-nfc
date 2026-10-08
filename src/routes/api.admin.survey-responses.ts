import { createFileRoute } from "@tanstack/react-router";
import { surveyResponse } from "../server/surveys.server";
export const Route = createFileRoute("/api/admin/survey-responses")({ server: { handlers: {
 GET: ({ request }) => surveyResponse(request, "admin-answers"), DELETE: ({ request }) => surveyResponse(request, "admin-answers"),
} } });
