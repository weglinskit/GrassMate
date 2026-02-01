import type { Locator, Page } from "@playwright/test";

const TEST_IDS = {
  form: "lawn-profile-create-form",
  fieldNazwa: "lawn-profile-create-field-nazwa",
  fieldLatitude: "lawn-profile-create-field-latitude",
  fieldLongitude: "lawn-profile-create-field-longitude",
  fieldWielkoscM2: "lawn-profile-create-field-wielkosc-m2",
  fieldNaslonecznienie: "lawn-profile-create-field-naslonecznienie",
  fieldRodzajPowierzchni: "lawn-profile-create-field-rodzaj-powierzchni",
  submit: "lawn-profile-create-submit",
} as const;

export type NaslonecznienieOption = "niskie" | "średnie" | "wysokie";

/**
 * Page Object dla formularza tworzenia lawn profile (data-testid).
 * Używany gdy użytkownik nie ma jeszcze profilu – formularz widoczny na dashboardzie.
 */
export class LawnProfileCreateForm {
  constructor(private readonly page: Page) {}

  get form(): Locator {
    return this.page.getByTestId(TEST_IDS.form);
  }

  get fieldNazwa(): Locator {
    return this.page.getByTestId(TEST_IDS.fieldNazwa);
  }

  get fieldLatitude(): Locator {
    return this.page.getByTestId(TEST_IDS.fieldLatitude);
  }

  get fieldLongitude(): Locator {
    return this.page.getByTestId(TEST_IDS.fieldLongitude);
  }

  get fieldWielkoscM2(): Locator {
    return this.page.getByTestId(TEST_IDS.fieldWielkoscM2);
  }

  get fieldNaslonecznienie(): Locator {
    return this.page.getByTestId(TEST_IDS.fieldNaslonecznienie);
  }

  get fieldRodzajPowierzchni(): Locator {
    return this.page.getByTestId(TEST_IDS.fieldRodzajPowierzchni);
  }

  get submitButton(): Locator {
    return this.page.getByTestId(TEST_IDS.submit);
  }

  async waitForVisible(): Promise<void> {
    await this.form.waitFor({ state: "visible" });
  }

  async fillNazwa(value: string): Promise<void> {
    await this.fieldNazwa.fill(value);
  }

  async fillLatitude(value: string | number): Promise<void> {
    await this.fieldLatitude.fill(String(value));
  }

  async fillLongitude(value: string | number): Promise<void> {
    await this.fieldLongitude.fill(String(value));
  }

  async fillWielkoscM2(value: string | number): Promise<void> {
    await this.fieldWielkoscM2.fill(String(value));
  }

  /**
   * Ustawia nasłonecznienie (Radix Select: klik trigger → klik opcji z tekstem).
   */
  async setNaslonecznienie(option: NaslonecznienieOption): Promise<void> {
    const labels: Record<NaslonecznienieOption, string> = {
      niskie: "Niskie",
      średnie: "Średnie",
      wysokie: "Wysokie",
    };
    await this.fieldNaslonecznienie.click();
    await this.page.getByRole("option", { name: labels[option] }).click();
  }

  async fillRodzajPowierzchni(value: string): Promise<void> {
    await this.fieldRodzajPowierzchni.fill(value);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Wypełnia obowiązkowe pola i wysyła formularz.
   * Opcjonalnie: nasłonecznienie (domyślnie średnie), rodzaj powierzchni.
   */
  async fillAndSubmit(options: {
    nazwa: string;
    latitude?: string | number;
    longitude?: string | number;
    wielkoscM2?: string | number;
    naslonecznienie?: NaslonecznienieOption;
    rodzajPowierzchni?: string;
  }): Promise<void> {
    await this.fillNazwa(options.nazwa);
    if (options.latitude !== undefined)
      await this.fillLatitude(options.latitude);
    if (options.longitude !== undefined)
      await this.fillLongitude(options.longitude);
    if (options.wielkoscM2 !== undefined)
      await this.fillWielkoscM2(options.wielkoscM2);
    if (options.naslonecznienie !== undefined)
      await this.setNaslonecznienie(options.naslonecznienie);
    if (options.rodzajPowierzchni !== undefined)
      await this.fillRodzajPowierzchni(options.rodzajPowierzchni);
    await this.submit();
  }
}
