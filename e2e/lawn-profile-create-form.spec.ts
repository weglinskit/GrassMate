import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";

/**
 * Dane użytkownika z seed (supabase/seed.sql).
 * W CI: E2E_SEED_USER_EMAIL i E2E_SEED_USER_PASSWORD z sekretów GHA.
 * Lokalnie: domyślnie dev@grassmate.local / dev-password.
 */
const SEED_USER = {
  email: process.env.E2E_SEED_USER_EMAIL ?? "dev@grassmate.local",
  password: process.env.E2E_SEED_USER_PASSWORD ?? "dev-password",
};

test.describe("Formularz tworzenia lawn profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const loginHeading = page.getByRole("heading", { name: "Logowanie" });

    const activeProfileResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/lawn-profiles/active") && res.status() === 200,
      { timeout: 15_000 },
    );

    const isLoginVisible = await loginHeading.isVisible().catch(() => false);
    if (isLoginVisible) {
      await page.getByLabel("Adres e-mail").fill(SEED_USER.email);
      await page.getByLabel("Hasło").fill(SEED_USER.password);
      await page.getByRole("button", { name: "Zaloguj się" }).click();
      await expect(page).toHaveURL(/\/$/);
    }

    await activeProfileResponse;

    await page.getByTestId("lawn-profile-create-form").waitFor({
      state: "visible",
      timeout: 5_000,
    });
  });

  test("wypełnia obowiązkowe pola formularza i zachowuje wprowadzone wartości", async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    const form = dashboard.createProfileForm;

    await form.fillNazwa("Trawnik przed domem");
    await form.fillLatitude(52.23);
    await form.fillLongitude(21.01);
    await form.fillWielkoscM2(150);

    await expect(form.fieldNazwa).toHaveValue("Trawnik przed domem");
    await expect(form.fieldLatitude).toHaveValue("52.23");
    await expect(form.fieldLongitude).toHaveValue("21.01");
    await expect(form.fieldWielkoscM2).toHaveValue("150");
  });

  test("wypełnia formularz, klika Utwórz profil i widzi toast Profil utworzony", async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    const form = dashboard.createProfileForm;

    await form.fillNazwa("Trawnik przed domem");
    await form.fillLatitude(52.23);
    await form.fillLongitude(21.01);
    await form.fillWielkoscM2(150);

    await form.submit();

    await expect(page.getByText("Profil utworzony")).toBeVisible({
      timeout: 10_000,
    });
  });
});
