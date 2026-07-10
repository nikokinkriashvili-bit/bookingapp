import type { ThemeColors, StatusTone } from "@/lib/theme";

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

const STATUS_TONE_KEY: Record<JobStatus, keyof ThemeColors["status"]> = {
  booked: "info",
  in_progress: "warning",
  awaiting_collection: "purple",
  complete: "success",
  paid: "teal",
  cancelled: "neutral",
};

// Theme-aware status tone: { border, bg, text } — border/text for accents
// (dots, left-borders), bg+text together for tinted badges. Never render a
// status as a solid fill with white text (UX guidance §4).
export function statusTone(colors: ThemeColors, status: JobStatus): StatusTone {
  return colors.status[STATUS_TONE_KEY[status]];
}

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
