import { test, expect } from "@playwright/test";

/**
 * Przykładowy test E2E – weryfikuje, że strona główna się ładuje.
 * Użyj tego pliku jako szablonu i dodawaj testy wg Page Object Model (e2e/pages/).
 */
test.describe("Strona główna", () => {
  test("powinna wyświetlić się przy pierwszym wejściu", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GrassMate|trawnik/i);
  });
});
