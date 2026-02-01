import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";
import { LawnProfileCreateForm } from "./LawnProfileCreateForm";

const TEST_IDS = {
  createProfileSection: "lawn-profile-create",
} as const;

/**
 * Page Object dla strony dashboardu (strona główna dla zalogowanego użytkownika).
 * Gdy użytkownik nie ma lawn profile, wyświetla się formularz tworzenia profilu.
 * Gdy ma profil – lista nadchodzących zabiegów (TreatmentsList) lub „Brak nadchodzących zabiegów”.
 */
export class DashboardPage extends BasePage {
  readonly createProfileForm: LawnProfileCreateForm;

  constructor(page: Page, path = "/") {
    super(page, path);
    this.createProfileForm = new LawnProfileCreateForm(page);
  }

  /** Sekcja z formularzem tworzenia profilu (widoczna gdy użytkownik nie ma profilu). */
  get createProfileSection(): Locator {
    return this.page.getByTestId(TEST_IDS.createProfileSection);
  }

  /** Komunikat „Brak nadchodzących zabiegów” (widoczny gdy lista zabiegów jest pusta). */
  get emptyTreatmentsMessage(): Locator {
    return this.page.getByText("Brak nadchodzących zabiegów");
  }

  /** Lista nadchodzących zabiegów (aria-label). */
  get treatmentsList(): Locator {
    return this.page.getByRole("list", {
      name: "Lista nadchodzących zabiegów",
    });
  }

  /** Przycisk „Oznacz wykonanie” (może być wiele – po jednym na kartę zabiegu). */
  get markCompleteButtons(): Locator {
    return this.page.getByRole("button", { name: /Oznacz wykonanie/ });
  }

  /** Drawer „Oznacz zabieg jako wykonany” (tytuł). */
  get completeTreatmentDrawerTitle(): Locator {
    return this.page.getByRole("heading", {
      name: "Oznacz zabieg jako wykonany",
    });
  }

  /** Czeka na pojawienie się formularza tworzenia lawn profile. */
  async waitForCreateProfileForm(): Promise<void> {
    await this.createProfileForm.waitForVisible();
  }

  /** Czeka na sekcję zabiegów: albo pusty stan, albo lista. */
  async waitForTreatmentsSection(): Promise<void> {
    await Promise.race([
      this.emptyTreatmentsMessage.waitFor({ state: "visible", timeout: 15_000 }),
      this.treatmentsList.waitFor({ state: "visible", timeout: 15_000 }),
    ]);
  }
}
