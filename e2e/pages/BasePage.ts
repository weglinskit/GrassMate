import type { Page } from "@playwright/test";

/**
 * Bazowa klasa dla Page Object Model – wspólna konfiguracja i helpery.
 * Rozszerzaj ją dla konkretnych stron (np. LoginPage, DashboardPage).
 */
export class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly path = "/",
  ) {}

  async goto() {
    await this.page.goto(this.path);
  }

  get url() {
    return this.page.url();
  }
}
