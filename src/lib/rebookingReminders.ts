import { supabase } from "@/lib/supabase";
import { addDays, toDateKey } from "@/lib/calendarDate";

// Rebooking / maintenance reminders (roadmap 4.2, BRD §5.1). A reminder is
// created once a job completes, if any of its services carry a
// reminder_interval_days -- the longest interval among them sets the due
// date, anchored to when the job actually finished (scheduled_end), not
// "now" (status can flip late).

export type ReminderStatus = "pending" | "dismissed" | "booked";

export type DueReminder = {
  id: string;
  job_id: string;
  vehicle_id: string;
  due_date: string;
  plate_number: string;
  customer_name: string;
  customer_phone: string;
};

// Fire-and-forget from jobActions.fireStatusSeams -- failures here shouldn't
// block the status change itself, so this never throws.
export async function createRebookingReminder(jobId: string): Promise<void> {
  const { data: job } = await supabase
    .from("jobs")
    .select("business_id, vehicle_id, service_ids, scheduled_end")
    .eq("id", jobId)
    .single();
  if (!job || job.service_ids.length === 0) return;

  const { data: services } = await supabase
    .from("services")
    .select("reminder_interval_days")
    .in("id", job.service_ids);
  const intervals = (services ?? [])
    .map((s) => s.reminder_interval_days)
    .filter((n): n is number => n != null && n > 0);
  if (intervals.length === 0) return;

  const maxInterval = Math.max(...intervals);
  const dueDate = toDateKey(addDays(new Date(job.scheduled_end), maxInterval));

  await supabase.from("rebooking_reminders").upsert(
    {
      business_id: job.business_id,
      job_id: jobId,
      vehicle_id: job.vehicle_id,
      due_date: dueDate,
      status: "pending",
    },
    { onConflict: "job_id" }
  );
}

// Includes overdue and near-term reminders (default 7-day lookahead) --
// showing only today-and-earlier would let the owner miss ones coming up
// this week.
export async function listDueReminders(
  businessId: string,
  lookaheadDays = 7
): Promise<{ reminders: DueReminder[]; error: string | null }> {
  const cutoff = toDateKey(addDays(new Date(), lookaheadDays));
  const { data, error } = await supabase
    .from("rebooking_reminders")
    .select(
      "id, job_id, vehicle_id, due_date, vehicles(plate_number, customer_vehicles(customers(name, phone)))"
    )
    .eq("business_id", businessId)
    .eq("status", "pending")
    .lte("due_date", cutoff)
    .order("due_date", { ascending: true });
  if (error) return { reminders: [], error: error.message };

  type Row = {
    id: string;
    job_id: string;
    vehicle_id: string;
    due_date: string;
    vehicles: {
      plate_number: string;
      customer_vehicles: { customers: { name: string; phone: string } | null }[];
    } | null;
  };

  const reminders = ((data ?? []) as unknown as Row[]).map((row) => {
    const customer = row.vehicles?.customer_vehicles?.[0]?.customers;
    return {
      id: row.id,
      job_id: row.job_id,
      vehicle_id: row.vehicle_id,
      due_date: row.due_date,
      plate_number: row.vehicles?.plate_number ?? "",
      customer_name: customer?.name ?? "",
      customer_phone: customer?.phone ?? "",
    };
  });

  return { reminders, error: null };
}

export async function dismissReminder(id: string): Promise<string | null> {
  const { error } = await supabase
    .from("rebooking_reminders")
    .update({ status: "dismissed" })
    .eq("id", id);
  return error?.message ?? null;
}

export async function markReminderBooked(id: string): Promise<string | null> {
  const { error } = await supabase
    .from("rebooking_reminders")
    .update({ status: "booked" })
    .eq("id", id);
  return error?.message ?? null;
}
