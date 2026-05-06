import { test, expect } from "@playwright/test";

// Admin account must be created before running these tests:
// cd backend && uv run python scripts/create_admin.py --email admin@vodle.com --password AdminPass1!
const ADMIN_EMAIL = "admin@vodle.com";
const ADMIN_PASSWORD = "AdminPass1!";

// Unique user per run so signup and voting always start fresh
const RUN_ID = Date.now();
const USER_EMAIL = `e2euser${RUN_ID}@vodle.com`;
const USER_PASSWORD = "Password1!";

// Always use today's actual date so the question appears on the vote page
const TODAY = new Date().toISOString().split("T")[0];

// Single test with steps so the browser context — and the login session cookie —
// persist across all steps without any re-authentication.
test("full voting flow", async ({ page, request }) => {

    await test.step("admin creates today's question if missing", async () => {
        const existing = await page.request.get("http://localhost:8000/api/v1/question/today");
        if (existing.ok()) return; // already exists, nothing to do

        await page.goto("/login");
        await page.locator("#email").fill(ADMIN_EMAIL);
        await page.locator("#password").pressSequentially(ADMIN_PASSWORD);
        await page.getByRole("button", { name: "Login", exact: true }).click();
        await page.waitForURL("/vote");

        await page.goto("/admin");
        await page.waitForSelector("text=Create Scheduled Question");
        await page.getByLabel(/^title$/i).fill("E2E Test Question");
        await page.getByLabel(/^question$/i).fill("What is your favorite test option?");
        await page.getByLabel(/publish date/i).fill(TODAY);
        await page.getByLabel(/option 1/i).fill("Option A");
        await page.getByLabel(/option 2/i).fill("Option B");
        await page.getByRole("button", { name: /create scheduled question/i }).click();
        await expect(page.getByText(/scheduled question created successfully/i)).toBeVisible();
    });

    await test.step("new user signs up", async () => {
        await page.goto("/signup");
        await page.locator("#email").fill(USER_EMAIL);
        // Use pressSequentially for password fields so React's onChange fires for
        // each keystroke — fill() can race against React 19's deferred state updates,
        // causing the password state to still be "" when the form submits.
        await page.locator("#password").pressSequentially(USER_PASSWORD);
        await page.locator("#confirm-password").pressSequentially(USER_PASSWORD);
        await page.getByRole("button", { name: /create account/i }).click();
        await page.waitForURL(/\/login/, { timeout: 10000 });
    });

    await test.step("user logs in and votes", async () => {
        // Verify credentials via API first — gives a clear message if signup failed
        const loginCheck = await request.post(
            "http://localhost:8000/api/v1/user/login",
            { form: { username: USER_EMAIL, password: USER_PASSWORD } },
        );
        expect(
            loginCheck.ok(),
            `API login failed (${loginCheck.status()}): ${await loginCheck.text()}`,
        ).toBeTruthy();

        await page.goto("/login");
        await page.locator("#email").fill(USER_EMAIL);
        await page.locator("#password").pressSequentially(USER_PASSWORD);
        await page.getByRole("button", { name: "Login", exact: true }).click();
        await page.waitForURL("/vote");

        // Wait for the question to load then pick the first option and submit
        await expect(page.getByRole("button", { name: /submit vote/i })).toBeVisible({ timeout: 15000 });
        await page.locator("button.rounded-md").first().click();
        await page.getByRole("button", { name: /submit vote/i }).click();
        await expect(page.getByText(/thanks for voting/i)).toBeVisible();
    });

    // Steps below run while still logged in as the new user — no re-auth needed.

    await test.step("results page shows the submitted vote", async () => {
        await page.goto("/results");

        await expect(page.getByText(/votes from around the community/i)).toBeVisible({ timeout: 15000 });

        const totalVotes = await page.locator(".text-2xl").first().textContent();
        expect(Number(totalVotes?.replace(/,/g, ""))).toBeGreaterThan(0);

        // User's choice is highlighted because they are still logged in
        await expect(page.getByText(/your vote/i)).toBeVisible();

        // Vote Map card renders (globe section is present)
        await expect(page.getByRole("heading", { name: /vote map/i })).toBeVisible();
        // Location text is one of the two possible states (with or without geo data)
        await expect(
            page.getByText(/location-aware votes shown|no location data/i)
        ).toBeVisible();
    });

    await test.step("history page shows the user's answer", async () => {
        await page.goto("/history");
        await expect(page.getByText(/today's results/i)).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/you voted for/i)).toBeVisible();
    });
});
