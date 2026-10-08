import { createFileRoute } from "@tanstack/react-router";
import { surveyResponse } from "../server/surveys.server";
export const Route = createFileRoute("/api/survey-responses")({ server: { handlers: { POST: ({ request }) => surveyResponse(request, "submit") } } });
