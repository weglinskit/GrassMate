import { describe, it, expect } from "vitest";
import { completeTreatmentSchema } from "./complete-treatment.schema";

describe("complete-treatment.schema", () => {
  describe("data_wykonania_rzeczywista", () => {
    it("akceptuje poprawną datę w formacie YYYY-MM-DD", () => {
      const result = completeTreatmentSchema.safeParse({
        data_wykonania_rzeczywista: "2025-02-01",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data_wykonania_rzeczywista).toBe("2025-02-01");
      }
    });

    it("akceptuje brak pola (pole opcjonalne)", () => {
      const result = completeTreatmentSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data_wykonania_rzeczywista).toBeUndefined();
      }
    });

    it("akceptuje pusty obiekt", () => {
      const result = completeTreatmentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("odrzuca datę w złym formacie (bez zer wiodących)", () => {
      const result = completeTreatmentSchema.safeParse({
        data_wykonania_rzeczywista: "2025-2-1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Data musi być w formacie YYYY-MM-DD",
        );
      }
    });

    it("odrzuca datę w formacie DD-MM-YYYY", () => {
      const result = completeTreatmentSchema.safeParse({
        data_wykonania_rzeczywista: "01-02-2025",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Data musi być w formacie YYYY-MM-DD",
        );
      }
    });

    it("odrzuca nieprawidłowe znaki (tylko cyfry i myślniki)", () => {
      const result = completeTreatmentSchema.safeParse({
        data_wykonania_rzeczywista: "2025/02/01",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca pusty string jako datę", () => {
      const result = completeTreatmentSchema.safeParse({
        data_wykonania_rzeczywista: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
