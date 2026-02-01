import { describe, it, expect } from "vitest";
import { getTreatmentsQuerySchema } from "./treatments.schema";

describe("treatments.schema", () => {
  describe("getTreatmentsQuerySchema", () => {
    it("akceptuje pusty obiekt i ustawia domyślne page, limit, sort", () => {
      const result = getTreatmentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sort).toBe("data_proponowana");
      }
    });

    it("akceptuje pełny zestaw parametrów", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        status: "wykonany",
        template_id: "550e8400-e29b-41d4-a716-446655440000",
        from: "2025-01-01",
        to: "2025-01-31",
        page: 2,
        limit: 10,
        sort: "data_proponowana_desc",
        embed: "template",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("wykonany");
        expect(result.data.template_id).toBe(
          "550e8400-e29b-41d4-a716-446655440000",
        );
        expect(result.data.from).toBe("2025-01-01");
        expect(result.data.to).toBe("2025-01-31");
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
        expect(result.data.sort).toBe("data_proponowana_desc");
        expect(result.data.embed).toBe("template");
      }
    });

    it("akceptuje wszystkie wartości statusu: aktywny, wykonany, odrzucony, wygasły", () => {
      for (const status of [
        "aktywny",
        "wykonany",
        "odrzucony",
        "wygasły",
      ] as const) {
        const result = getTreatmentsQuerySchema.safeParse({ status });
        expect(result.success, `status: ${status}`).toBe(true);
      }
    });

    it("odrzuca nieprawidłowy status", () => {
      const result = getTreatmentsQuerySchema.safeParse({ status: "nieznany" });
      expect(result.success).toBe(false);
    });

    it("odrzuca template_id w złym formacie (nie UUID)", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        template_id: "nie-uuid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Nieprawidłowy format UUID template_id",
        );
      }
    });

    it("odrzuca from w złym formacie (wymagany YYYY-MM-DD)", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        from: "01-01-2025",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("YYYY-MM-DD");
      }
    });

    it("odrzuca to w złym formacie", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        to: "2025/01/31",
      });
      expect(result.success).toBe(false);
    });

    it("wymusza page >= 1", () => {
      const result = getTreatmentsQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("1");
      }
    });

    it("wymusza limit między 1 a 100", () => {
      expect(getTreatmentsQuerySchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(getTreatmentsQuerySchema.safeParse({ limit: 101 }).success).toBe(
        false,
      );
      expect(getTreatmentsQuerySchema.safeParse({ limit: 1 }).success).toBe(
        true,
      );
      expect(getTreatmentsQuerySchema.safeParse({ limit: 100 }).success).toBe(
        true,
      );
    });

    it("akceptuje sort: data_proponowana, data_proponowana_asc, data_proponowana_desc", () => {
      for (const sort of [
        "data_proponowana",
        "data_proponowana_asc",
        "data_proponowana_desc",
      ] as const) {
        const result = getTreatmentsQuerySchema.safeParse({ sort });
        expect(result.success, `sort: ${sort}`).toBe(true);
      }
    });

    it("refine: odrzuca when from > to", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        from: "2025-01-31",
        to: "2025-01-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) =>
              i.message ===
              "Data from musi być wcześniejsza lub równa dacie to",
          ),
        ).toBe(true);
      }
    });

    it("refine: akceptuje when from === to", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        from: "2025-01-15",
        to: "2025-01-15",
      });
      expect(result.success).toBe(true);
    });

    it("refine: akceptuje when from < to", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        from: "2025-01-01",
        to: "2025-01-31",
      });
      expect(result.success).toBe(true);
    });

    it("koercja: page i limit jako string konwertowane na number", () => {
      const result = getTreatmentsQuerySchema.safeParse({
        page: "3",
        limit: "50",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });
  });
});
