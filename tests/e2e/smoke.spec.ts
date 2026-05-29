/**
 * Smoke e2e (#363).
 *
 * The first job from the issue's acceptance criteria: home page
 * loads, dashboard is reachable. Keeps the bar low enough that any
 * regression introducing a build/runtime crash is caught before
 * merge while the heavier upload → build → sign → results flow
 * is iterated in `happy-path.spec.ts`.
 */
import { test, expect } from "@playwright/test";

test("home page renders without crashing", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
});

test("dashboard route responds", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response).not.toBeNull();
  // Even an auth-protected route should return < 500; auth
  // redirects (3xx) and intentional 401/403 are fine.
  expect(response!.status()).toBeLessThan(500);
});
