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

export const STATUS_LABELS: Record<JobStatus, string> = {
  booked: "Booked",
  in_progress: "In Progress",
  awaiting_collection: "Awaiting Collection",
  complete: "Complete",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  booked: "#208AEF",
  in_progress: "#F5A623",
  awaiting_collection: "#9B59B6",
  complete: "#2ECC71",
  paid: "#16A085",
  cancelled: "#95A5A6",
};
