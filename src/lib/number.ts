// Parse a user-typed number that may use a comma as the decimal separator.
// Georgian and most European phone keyboards produce "12,50" rather than
// "12.50", and Number("12,50") is NaN — which previously turned into either a
// cryptic Postgres error or a silent 0 (Number(v) || 0). Returns null when the
// input isn't a usable number so callers can validate or fall back explicitly.
export function parseDecimal(input: string): number | null {
  let s = input.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    // Both present: treat comma as a thousands separator ("1,000.50").
    s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    // Only a comma: it's the decimal separator ("12,50").
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// parseDecimal with a fallback for the common "empty means 0" case.
export function parseDecimalOr(input: string, fallback: number): number {
  return parseDecimal(input) ?? fallback;
}

// Whole-number variant for fields like year or minutes.
export function parseIntOr(input: string, fallback: number): number {
  const n = parseDecimal(input);
  return n == null ? fallback : Math.trunc(n);
}
