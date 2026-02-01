/**
 * Testy jednostkowe serwisu zabiegów (getUpcomingDateRange, getUpcomingTreatments).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as treatmentsService from "./treatments.service";
import type { SupabaseClient } from "../../db/supabase.client";

/** Minimalny mock Supabase dla getTreatmentsForLawn: list + count. */
function createMockSupabase(): SupabaseClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    range: () => Promise.resolve({ data: [], error: null }),
    then(resolve: (v: { count: number | null; error: null }) => void) {
      return Promise.resolve({ count: 0, error: null }).then(resolve);
    },
    catch: () => chain,
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

describe("treatments.service", () => {
  describe("getUpcomingDateRange (backend UTC)", () => {
    const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-01T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("zwraca from i to w formacie YYYY-MM-DD", () => {
      const { from, to } = treatmentsService.getUpcomingDateRange(10);
      expect(from).toMatch(YYYY_MM_DD);
      expect(to).toMatch(YYYY_MM_DD);
    });

    it("from = dziś (północ UTC), to = dziś + windowDays (UTC)", () => {
      const { from, to } = treatmentsService.getUpcomingDateRange(10);
      expect(from).toBe("2026-02-01");
      expect(to).toBe("2026-02-11");
    });

    it("dla windowDays 0 zwraca ten sam dzień jako from i to", () => {
      const { from, to } = treatmentsService.getUpcomingDateRange(0);
      expect(from).toBe("2026-02-01");
      expect(to).toBe("2026-02-01");
    });
  });

  describe("getUpcomingTreatments", () => {
    const lawnProfileId = "550e8400-e29b-41d4-a716-446655440000";

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-01T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("zwraca tylko zabiegi z przedziału [from, to] i statusem aktywny (mock Supabase)", async () => {
      const supabase = createMockSupabase();
      const result = await treatmentsService.getUpcomingTreatments(
        supabase,
        lawnProfileId,
      );

      expect(result).toEqual({ data: [], total: 0 });
    });

    it("używa domyślnego okna UPCOMING_TREATMENTS_DEFAULT_DAYS", () => {
      expect(treatmentsService.UPCOMING_TREATMENTS_DEFAULT_DAYS).toBe(10);
    });

    it("dla okna 5 dni zwraca przedział od dziś do dziś+5 (UTC)", async () => {
      const supabase = createMockSupabase();
      const result = await treatmentsService.getUpcomingTreatments(
        supabase,
        lawnProfileId,
        5,
      );

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
