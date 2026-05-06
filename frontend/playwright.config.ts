import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./src/test/e2e",
    use: {
        baseURL: "http://localhost:3000",
        headless: true,
        // Grant geolocation permission and provide a fixed location for all tests.
        // This means navigator.geolocation.getCurrentPosition() resolves with these
        // coordinates in every browser context without any per-test setup.
        permissions: ["geolocation"],
        geolocation: { latitude: 32.7157, longitude: -117.1611 },
    },
    webServer: {
        command: "bun run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
    },
});