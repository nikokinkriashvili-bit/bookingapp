import { colors } from "@/lib/theme";

export type JobStatus =
  | "booked"
  | "in_progress"
  | "awaiting_collection"
  | "complete"
  | "paid"
  | "cancelled";

export const STATUS_ORDER: JobStatus[] = [
  "booked",
  "in_progress",
  "awaiting_collection",
  "complete",
  "paid",
  "cancelled",
];

// Status display names live in the i18n string table ("status.<value>") so
// they localize; use statusLabelKey(status) with useT().
export function statusLabelKey(status: JobStatus) {
  return `status.${status}` as const;
}

export const STATUS_COLORS: Record<JobStatus, string> = {
  booked: colors.primary,
  in_progress: "#F5A623",
  awaiting_collection: "#9B59B6",
  complete: "#2ECC71",
  paid: "#16A085",
  cancelled: "#95A5A6",
};

const PENDING_STATUSES: JobStatus[] = ["booked", "in_progress", "awaiting_collection"];

export type JobPeriodSummary = {
  total: number;
  completed: number;
  pending: number;
  paid: number;
};

function sumPrice(jobs: { price_total: number | null }[]): number {
  return jobs.reduce((sum, j) => sum + (j.price_total ?? 0), 0);
}

export function summarizeJobs(
  jobs: { status: JobStatus; price_total: number | null }[]
): JobPeriodSummary {
  return {
    total: sumPrice(jobs),
    completed: sumPrice(jobs.filter((j) => j.status === "complete")),
    pending: sumPrice(jobs.filter((j) => PENDING_STATUSES.includes(j.status))),
    paid: sumPrice(jobs.filter((j) => j.status === "paid")),
  };
}
