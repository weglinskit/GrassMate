import { describe, it, expect } from "vitest";
import {
  createLawnProfileSchema,
  updateLawnProfileSchema,
} from "./lawn-profiles.schema";

describe("lawn-profiles.schema", () => {
  const validCreatePayload = {
    nazwa: "Trawnik przed domem",
    latitude: 52.23,
    longitude: 21.01,
  };

  describe("createLawnProfileSchema", () => {
    it("akceptuje minimalny payload (nazwa, latitude, longitude)", () => {
      const result = createLawnProfileSchema.safeParse(validCreatePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nazwa).toBe(validCreatePayload.nazwa);
        expect(result.data.latitude).toBe(validCreatePayload.latitude);
        expect(result.data.longitude).toBe(validCreatePayload.longitude);
        expect(result.data.wielkość_m2).toBe(100);
        expect(result.data.nasłonecznienie).toBe("średnie");
        expect(result.data.is_active).toBe(true);
      }
    });

    it("ustawia domyślne wartości: wielkość_m2 100, nasłonecznienie średnie, is_active true", () => {
      const result = createLawnProfileSchema.safeParse(validCreatePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.wielkość_m2).toBe(100);
        expect(result.data.nasłonecznienie).toBe("średnie");
        expect(result.data.is_active).toBe(true);
      }
    });

    it("akceptuje jawne wielkość_m2, nasłonecznienie, is_active", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        wielkość_m2: 200,
        nasłonecznienie: "wysokie",
        is_active: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.wielkość_m2).toBe(200);
        expect(result.data.nasłonecznienie).toBe("wysokie");
        expect(result.data.is_active).toBe(false);
      }
    });

    it("odrzuca pustą nazwę", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        nazwa: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Nazwa jest wymagana");
      }
    });

    it("odrzuca nazwę dłuższą niż 255 znaków", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        nazwa: "a".repeat(256),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Nazwa może mieć co najwyżej 255 znaków",
        );
      }
    });

    it("odrzuca latitude < -90", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        latitude: -91,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Szerokość geograficzna",
        );
      }
    });

    it("odrzuca latitude > 90", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        latitude: 91,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Szerokość geograficzna",
        );
      }
    });

    it("akceptuje latitude na granicach -90 i 90", () => {
      expect(
        createLawnProfileSchema.safeParse({
          ...validCreatePayload,
          latitude: -90,
        }).success,
      ).toBe(true);
      expect(
        createLawnProfileSchema.safeParse({
          ...validCreatePayload,
          latitude: 90,
        }).success,
      ).toBe(true);
    });

    it("odrzuca longitude < -180", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        longitude: -181,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Długość geograficzna",
        );
      }
    });

    it("odrzuca longitude > 180", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        longitude: 181,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Długość geograficzna",
        );
      }
    });

    it("akceptuje longitude na granicach -180 i 180", () => {
      expect(
        createLawnProfileSchema.safeParse({
          ...validCreatePayload,
          longitude: -180,
        }).success,
      ).toBe(true);
      expect(
        createLawnProfileSchema.safeParse({
          ...validCreatePayload,
          longitude: 180,
        }).success,
      ).toBe(true);
    });

    it("odrzuca wielkość_m2 <= 0", () => {
      const resultZero = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        wielkość_m2: 0,
      });
      expect(resultZero.success).toBe(false);
      if (!resultZero.success) {
        expect(resultZero.error.issues[0].message).toBe(
          "Powierzchnia musi być większa od 0",
        );
      }

      const resultNeg = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        wielkość_m2: -10,
      });
      expect(resultNeg.success).toBe(false);
    });

    it("akceptuje wszystkie wartości nasłonecznienia: niskie, średnie, wysokie", () => {
      for (const val of ["niskie", "średnie", "wysokie"] as const) {
        const result = createLawnProfileSchema.safeParse({
          ...validCreatePayload,
          nasłonecznienie: val,
        });
        expect(result.success, `nasłonecznienie: ${val}`).toBe(true);
      }
    });

    it("odrzuca nieprawidłową wartość nasłonecznienia", () => {
      const result = createLawnProfileSchema.safeParse({
        ...validCreatePayload,
        nasłonecznienie: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateLawnProfileSchema", () => {
    it("akceptuje pusty obiekt (partial – wszystkie pola opcjonalne)", () => {
      const result = updateLawnProfileSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data).length).toBe(0);
      }
    });

    it("waliduje tylko podane pola – nazwa wymagana gdy obecna", () => {
      const result = updateLawnProfileSchema.safeParse({ nazwa: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Nazwa jest wymagana");
      }
    });

    it("akceptuje częściową aktualizację (np. tylko is_active)", () => {
      const result = updateLawnProfileSchema.safeParse({ is_active: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(false);
        expect(result.data.nazwa).toBeUndefined();
      }
    });

    it("odrzuca latitude poza zakresem przy aktualizacji", () => {
      const result = updateLawnProfileSchema.safeParse({ latitude: 100 });
      expect(result.success).toBe(false);
    });

    it("odrzuca rodzaj_powierzchni dłuższy niż 500 znaków", () => {
      const result = updateLawnProfileSchema.safeParse({
        rodzaj_powierzchni: "a".repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Opis może mieć co najwyżej 500 znaków",
        );
      }
    });

    it("akceptuje rodzaj_powierzchni null", () => {
      const result = updateLawnProfileSchema.safeParse({
        rodzaj_powierzchni: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
