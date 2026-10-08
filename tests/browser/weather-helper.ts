import type { Page } from "@playwright/test";
import type { WeatherMode } from "../../src/lib/venue";
export async function mockWeather(page: Page, initial: WeatherMode = "sunny") {
 let weather = initial;
 await page.route("**/api/weather",route=>route.fulfill({json:{weather,updatedAt:"2026-10-08T00:00:00.000Z"}}));
 return async (next: WeatherMode) => {
  weather=next;
  const response = page.waitForResponse(response=>new URL(response.url()).pathname==="/api/weather");
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await response;
 };
}
