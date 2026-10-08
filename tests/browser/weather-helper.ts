import type { Page } from "@playwright/test";
import type { WeatherMode } from "../../src/lib/venue";
import { defaultSurveyRules } from "../../src/lib/survey-rules";
export async function mockWeather(page: Page, initial: WeatherMode = "sunny") {
 // Legacy flow tests exercise the configurable all-optional setting.
 const rules=defaultSurveyRules();
 for (const questions of Object.values(rules)) for (const key of Object.keys(questions)) questions[key]=false;
 await page.route("**/api/survey-rules",route=>route.fulfill({json:{rules}}));
 await page.route("**/api/survey-responses",route=>route.fulfill({json:{saved:true,ghostId:route.request().postDataJSON().ghostId}}));
 let weather = initial;
 await page.route("**/api/weather",route=>route.fulfill({json:{weather,updatedAt:"2026-10-08T00:00:00.000Z"}}));
 return async (next: WeatherMode) => {
  weather=next;
  const response = page.waitForResponse(response=>new URL(response.url()).pathname==="/api/weather");
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await response;
 };
}
