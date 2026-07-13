// Seams for the external integrations built at roadmap steps 9–10 (see
// CLAUDE.md "Approach change"). These are intentionally inert placeholders
// marking where the integrations plug in — not working stubs. The client will
// never talk to Meta or BOG directly; both go through Supabase Edge Functions.

export type WhatsAppEvent =
  | "booking_confirmed"
  | "job_started"
  | "job_complete"
  | "payment_request"
  | "payment_confirmed"
  | "rebooking_reminder";

// TODO(TRD §5.5, §7.1): call a Supabase Edge Function that sends the approved
// WhatsApp template for `event` to the job's customer, and logs the send in
// messages_log. Trigger events per the BRD message table.
export async function sendWhatsAppMessage(
  event: WhatsAppEvent,
  jobId: string
): Promise<void> {
  void event;
  void jobId;
}

// TODO(TRD §7.2): call a Supabase Edge Function that creates a BOG payment
// link for the job's price_total and returns its URL; the BOG webhook receiver
// updates the payments table on confirmation.
export async function generateBogPaymentLink(jobId: string): Promise<string | null> {
  void jobId;
  return null;
}
