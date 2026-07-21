import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/integrations";
import { addDays } from "@/lib/calendarDate";

// Per-job quote flow (booking pivot, Slice 2). A quote = price + description,
// sent to the customer, valid for a few days, accepted or declined. Stored on
// the job (one quote per job). See supabase/018.

export const QUOTE_VALID_DAYS = 3;

// Stored statuses. 'expired' is derived (see quoteDisplayStatus), never stored.
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
export type QuoteDisplayStatus = QuoteStatus | "expired" | "none";

export type JobQuote = {
  quote_price: number | null;
  quote_description: string | null;
  quote_status: QuoteStatus | null;
  quote_sent_at: string | null;
  quote_expires_at: string | null;
};

// Pure. A sent quote past its expiry reads as expired; everything else shows
// its stored status. No quote at all -> 'none'.
export function quoteDisplayStatus(quote: JobQuote, now: Date = new Date()): QuoteDisplayStatus {
  if (!quote.quote_status) return "none";
  if (quote.quote_status === "sent" && isQuoteExpired(quote.quote_expires_at, now)) {
    return "expired";
  }
  return quote.quote_status;
}

// Pure. Null expiry is treated as "not expired" (a draft that was never sent).
export function isQuoteExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now.getTime();
}

// Saves the quote draft (price + description) without sending it.
export async function saveQuoteDraft(
  jobId: string,
  price: number | null,
  description: string
): Promise<string | null> {
  const { error } = await supabase
    .from("jobs")
    .update({
      quote_price: price,
      quote_description: description.trim() || null,
      quote_status: "draft",
    })
    .eq("id", jobId);
  return error?.message ?? null;
}

// Sends the quote: stamps sent-at + a 3-day expiry, marks it sent, and fires
// the WhatsApp seam (inert until Stage 6, when it delivers the public link).
export async function sendQuote(
  jobId: string,
  price: number | null,
  description: string
): Promise<string | null> {
  const now = new Date();
  const { error } = await supabase
    .from("jobs")
    .update({
      quote_price: price,
      quote_description: description.trim() || null,
      quote_status: "sent",
      quote_sent_at: now.toISOString(),
      quote_expires_at: addDays(now, QUOTE_VALID_DAYS).toISOString(),
    })
    .eq("id", jobId);
  if (error) return error.message;
  await sendWhatsAppMessage("quote_sent", jobId);
  return null;
}

// Records the customer's response (flipped by the detailer for now; driven by
// the public link at Stage 6). Accepting locks the quoted price in as the
// job's price_total, so the rest of the app (payments, dashboard) uses it.
export async function respondToQuote(
  jobId: string,
  response: "accepted" | "declined",
  quotePrice: number | null
): Promise<string | null> {
  const patch: Record<string, unknown> = { quote_status: response };
  if (response === "accepted" && quotePrice != null) {
    patch.price_total = quotePrice;
  }
  const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
  return error?.message ?? null;
}
