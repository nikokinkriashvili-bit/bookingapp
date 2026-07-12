import { supabase } from "@/lib/supabase";
import { generateBogPaymentLink, sendWhatsAppMessage } from "@/lib/integrations";
import type { JobStatus } from "@/lib/jobStatus";

// Single place that maps a job's new status to its integration side effects
// (WhatsApp templates, BOG payment link). Both the quick day-view status flip
// and the full edit screen route through here, so a status change fires the
// same seams no matter where it happens. These calls are inert placeholders
// today (see src/lib/integrations.ts); they light up at the integration phase.
export async function fireStatusSeams(jobId: string, status: JobStatus): Promise<void> {
  if (status === "in_progress") {
    await sendWhatsAppMessage("job_started", jobId);
  } else if (status === "complete") {
    await sendWhatsAppMessage("job_complete", jobId);
    await generateBogPaymentLink(jobId);
  } else if (status === "paid") {
    await sendWhatsAppMessage("payment_confirmed", jobId);
  }
}

// Updates a job's status and fires the seams. Returns an error message on
// failure (callers must surface it) or null on success.
export async function applyStatusChange(
  jobId: string,
  status: JobStatus
): Promise<string | null> {
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) return error.message;
  await fireStatusSeams(jobId, status);
  return null;
}
