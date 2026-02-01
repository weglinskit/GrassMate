import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cn, getUpcomingDateRange } from "./utils";

describe("cn (utils)", () => {
  it("łączy klasy Tailwind bez konfliktów", () => {
    expect(cn("px-2", "px-4")).toMatchInlineSnapshot(`"px-4"`);
  });

  it("pomija wartości falsy", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });
});

describe("getUpcomingDateRange (utils)", () => {
  const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("zwraca from i to w formacie YYYY-MM-DD", () => {
    const { from, to } = getUpcomingDateRange(10);
    expect(from).toMatch(YYYY_MM_DD);
    expect(to).toMatch(YYYY_MM_DD);
  });

  it("from = dziś (timezone lokalny), to = dziś + windowDays", () => {
    const { from, to } = getUpcomingDateRange(10);
    expect(from).toBe("2026-02-01");
    expect(to).toBe("2026-02-11");
  });

  it("dla windowDays 0 zwraca ten sam dzień jako from i to", () => {
    const { from, to } = getUpcomingDateRange(0);
    expect(from).toBe("2026-02-01");
    expect(to).toBe("2026-02-01");
  });
});
