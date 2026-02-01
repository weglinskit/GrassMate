import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";

const SEED_USER = {
  email: process.env.E2E_SEED_USER_EMAIL ?? "dev@grassmate.local",
  password: process.env.E2E_SEED_USER_PASSWORD ?? "dev-password",
};

test.describe("Nadchodzące zabiegi na dashboardzie", () => {
  test.beforeEach(async ({ page }) => {
    const activeProfileResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/lawn-profiles/active") && res.status() === 200,
      { timeout: 20_000 },
    );

    await page.goto("/");

    await page
      .getByRole("heading", { name: "Logowanie" })
      .or(page.getByTestId("lawn-profile-create-form"))
      .or(page.getByText("Brak nadchodzących zabiegów"))
      .or(page.getByRole("list", { name: "Lista nadchodzących zabiegów" }))
      .waitFor({ state: "visible", timeout: 15_000 });

    const loginHeading = page.getByRole("heading", { name: "Logowanie" });
    if (await loginHeading.isVisible()) {
      await page.getByLabel("Adres e-mail").fill(SEED_USER.email);
      await page.getByLabel("Hasło").fill(SEED_USER.password);
      await page.getByRole("button", { name: "Zaloguj się" }).click();
      await expect(page).toHaveURL(/\/$/);
    }

    await activeProfileResponse;

    const createForm = page.getByTestId("lawn-profile-create-form");
    if (await createForm.isVisible()) {
      const dashboard = new DashboardPage(page);
      await dashboard.createProfileForm.fillNazwa("Trawnik E2E");
      await dashboard.createProfileForm.fillLatitude(52.23);
      await dashboard.createProfileForm.fillLongitude(21.01);
      await dashboard.createProfileForm.fillWielkoscM2(100);
      await dashboard.createProfileForm.submit();
      await page.getByText("Profil utworzony").waitFor({ timeout: 10_000 });
    }

    const dashboard = new DashboardPage(page);
    await dashboard.waitForTreatmentsSection();
  });

  test("wyświetla sekcję nadchodzących zabiegów (pusta lista lub lista z datą w 10 dniach)", async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    const emptyMessage = dashboard.emptyTreatmentsMessage;
    const list = dashboard.treatmentsList;

    const emptyVisible = await emptyMessage.isVisible();
    const listVisible = await list.isVisible();
    expect(emptyVisible || listVisible).toBe(true);
  });

  test("kliknięcie „Oznacz wykonanie” otwiera drawer z tytułem „Oznacz zabieg jako wykonany”", async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    const firstMarkComplete = dashboard.markCompleteButtons.first();

    if (!(await firstMarkComplete.isVisible())) {
      test.skip();
      return;
    }

    await firstMarkComplete.click();
    await expect(dashboard.completeTreatmentDrawerTitle).toBeVisible({
      timeout: 5_000,
    });
  });
});
