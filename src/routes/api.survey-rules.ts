import { createFileRoute } from "@tanstack/react-router";
import { surveyResponse } from "../server/surveys.server";
export const Route = createFileRoute("/api/survey-rules")({ server: { handlers: { GET: ({ request }) => surveyResponse(request, "rules") } } });
