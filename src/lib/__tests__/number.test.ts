import { parseDecimal, parseDecimalOr, parseIntOr } from "@/lib/number";

describe("parseDecimal", () => {
  it("parses plain numbers", () => {
    expect(parseDecimal("12")).toBe(12);
    expect(parseDecimal("12.50")).toBe(12.5);
    expect(parseDecimal("0")).toBe(0);
  });

  it("treats a lone comma as the decimal separator (Georgian keyboards)", () => {
    expect(parseDecimal("12,50")).toBe(12.5);
    expect(parseDecimal("12,5")).toBe(12.5);
  });

  it("treats comma as a thousands separator when a dot is also present", () => {
    expect(parseDecimal("1,000.50")).toBe(1000.5);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDecimal("  7  ")).toBe(7);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });
});

describe("parseDecimalOr", () => {
  it("falls back when input is empty/invalid", () => {
    expect(parseDecimalOr("", 0)).toBe(0);
    expect(parseDecimalOr("abc", 5)).toBe(5);
  });
  it("parses when valid", () => {
    expect(parseDecimalOr("3,5", 0)).toBe(3.5);
  });
});

describe("parseIntOr", () => {
  it("truncates toward zero", () => {
    expect(parseIntOr("12,9", 0)).toBe(12);
    expect(parseIntOr("2005", 0)).toBe(2005);
  });
  it("falls back on invalid input", () => {
    expect(parseIntOr("", 1900)).toBe(1900);
    expect(parseIntOr("xyz", 0)).toBe(0);
  });
});
