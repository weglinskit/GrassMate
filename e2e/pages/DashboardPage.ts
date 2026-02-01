import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";
import { LawnProfileCreateForm } from "./LawnProfileCreateForm";

const TEST_IDS = {
  createProfileSection: "lawn-profile-create",
} as const;

/**
 * Page Object dla strony dashboardu (strona główna dla zalogowanego użytkownika).
 * Gdy użytkownik nie ma lawn profile, wyświetla się formularz tworzenia profilu.
 */
export class DashboardPage extends BasePage {
  readonly createProfileForm: LawnProfileCreateForm;

  constructor(page: Page, path: string = "/") {
    super(page, path);
    this.createProfileForm = new LawnProfileCreateForm(page);
  }

  /** Sekcja z formularzem tworzenia profilu (widoczna gdy użytkownik nie ma profilu). */
  get createProfileSection(): Locator {
    return this.page.getByTestId(TEST_IDS.createProfileSection);
  }

  /** Czeka na pojawienie się formularza tworzenia lawn profile. */
  async waitForCreateProfileForm(): Promise<void> {
    await this.createProfileForm.waitForVisible();
  }
}
