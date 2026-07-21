import { supabase } from "@/lib/supabase";

// Working-hours exceptions (roadmap 4.3 prerequisite / F4). A closure is an
// inclusive date range (start_date..end_date) the business is shut. Dates are
// stored as plain 'YYYY-MM-DD' strings -- a closure is a calendar-day concept,
// not a timestamp, so it never carries a timezone.

export type Closure = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
};

// Pure, string-only comparison so it's trivially testable and timezone-free.
// All three args are 'YYYY-MM-DD'; lexical order matches chronological order
// for that format, so plain string comparison is correct.
export function isDateClosed(dateKey: string, closures: Closure[]): boolean {
  return closures.some((c) => dateKey >= c.start_date && dateKey <= c.end_date);
}

// Optional range filter (visible calendar window) avoids pulling every past
// closure. A closure overlaps the range if it starts on or before rangeEnd and
// ends on or after rangeStart.
export async function listClosures(
  businessId: string,
  range?: { start: string; end: string }
): Promise<{ closures: Closure[]; error: string | null }> {
  let query = supabase
    .from("business_closures")
    .select("id, start_date, end_date, reason")
    .eq("business_id", businessId)
    .order("start_date", { ascending: true });
  if (range) {
    query = query.lte("start_date", range.end).gte("end_date", range.start);
  }
  const { data, error } = await query;
  if (error) return { closures: [], error: error.message };
  return { closures: (data ?? []) as Closure[], error: null };
}

export async function createClosure(
  businessId: string,
  startDate: string,
  endDate: string,
  reason: string | null
): Promise<string | null> {
  const { error } = await supabase.from("business_closures").insert({
    business_id: businessId,
    start_date: startDate,
    end_date: endDate,
    reason: reason?.trim() || null,
  });
  return error?.message ?? null;
}

export async function deleteClosure(id: string): Promise<string | null> {
  const { error } = await supabase.from("business_closures").delete().eq("id", id);
  return error?.message ?? null;
}
