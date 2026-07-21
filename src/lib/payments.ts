import { supabase } from "@/lib/supabase";
import { applyStatusChange } from "@/lib/jobActions";

// Manual payment recording (roadmap 4.3b / F5). A job can have several
// payments; it's settled once they sum to price_total. Amounts are GEL.

export type PaymentMethod = "cash" | "transfer" | "bog_link";

export type Payment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  created_at: string;
};

// Pure, testable. Kept separate from the DB call so the balance math (which
// drives the auto-flip to "paid" and the dashboard's outstanding figure) can
// be unit-tested without a database.
export function sumPayments(payments: Pick<Payment, "amount">[]): number {
  return payments.reduce((total, p) => total + Number(p.amount), 0);
}

// Remaining balance, never negative. A price_total of 0/null means "not
// priced yet" -> nothing outstanding.
export function outstandingBalance(
  priceTotal: number | null,
  payments: Pick<Payment, "amount">[]
): number {
  if (!priceTotal || priceTotal <= 0) return 0;
  return Math.max(0, priceTotal - sumPayments(payments));
}

// A priced job is settled once payments cover the price. Unpriced jobs are
// never "settled" (there's nothing to settle against).
export function isSettled(
  priceTotal: number | null,
  payments: Pick<Payment, "amount">[]
): boolean {
  if (!priceTotal || priceTotal <= 0) return false;
  return sumPayments(payments) >= priceTotal;
}

export async function listJobPayments(
  jobId: string
): Promise<{ payments: Payment[]; error: string | null }> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) return { payments: [], error: error.message };
  return { payments: (data ?? []) as Payment[], error: null };
}

// Records one payment, then -- if the job is now fully covered and not already
// marked paid -- flips it to "paid" through applyStatusChange so the same
// payment_confirmed seam fires as everywhere else. Returns autoPaid so the
// caller can reflect the new status without a refetch.
export async function recordPayment(opts: {
  businessId: string;
  jobId: string;
  amount: number;
  method: PaymentMethod;
  priceTotal: number | null;
  currentStatus: string;
}): Promise<{ error: string | null; autoPaid: boolean }> {
  const { error: insertError } = await supabase.from("payments").insert({
    business_id: opts.businessId,
    job_id: opts.jobId,
    amount: opts.amount,
    method: opts.method,
  });
  if (insertError) return { error: insertError.message, autoPaid: false };

  const { payments } = await listJobPayments(opts.jobId);
  if (
    opts.currentStatus !== "paid" &&
    opts.currentStatus !== "cancelled" &&
    isSettled(opts.priceTotal, payments)
  ) {
    const statusError = await applyStatusChange(opts.jobId, "paid");
    if (statusError) return { error: statusError, autoPaid: false };
    return { error: null, autoPaid: true };
  }
  return { error: null, autoPaid: false };
}
