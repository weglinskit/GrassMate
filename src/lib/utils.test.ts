import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (utils)", () => {
  it("łączy klasy Tailwind bez konfliktów", () => {
    expect(cn("px-2", "px-4")).toMatchInlineSnapshot(`"px-4"`);
  });

  it("pomija wartości falsy", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });
});
