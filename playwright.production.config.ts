import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  webServer: {
    command: "npm run build && npm run start",
    env: { HOST: "127.0.0.1", PORT: "3002", NITRO_PRESET: "node-server" },
    url: "http://127.0.0.1:3002",
    reuseExistingServer: false,
  },
});
