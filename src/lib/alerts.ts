import { reorderPoint, type ProductStockInput } from "@/lib/inventory";
import type { JobStatus } from "@/lib/jobStatus";

// Owner alerts (roadmap 4.6): low stock, overdue jobs, no-shows. Computed
// client-side from data already on hand -- no server/cron exists yet
// (Stage 6), so these surface in-app rather than as a background push.
// Pure and unit-tested; the screen that calls this owns fetching the data.

export type LowStockAlert = { kind: "low_stock"; productId: string; productName: string };
export type OverdueAlert = {
  kind: "overdue";
  jobId: string;
  plateNumber: string;
  scheduledEnd: string;
};
export type NoShowAlert = {
  kind: "no_show";
  jobId: string;
  plateNumber: string;
  scheduledSlot: string;
};
export type Alert = LowStockAlert | OverdueAlert | NoShowAlert;

export type AlertProduct = ProductStockInput & { id: string; name: string };

// Below the reorder point (not just "critical") -- the owner wants the
// heads-up before stock actually runs dry, matching stockStatus's own
// order_now/critical thresholds.
export function computeLowStockAlerts(products: AlertProduct[]): LowStockAlert[] {
  return products
    .filter((p) => p.stock_qty <= p.safety_stock || p.stock_qty <= reorderPoint(p))
    .map((p) => ({ kind: "low_stock" as const, productId: p.id, productName: p.name }));
}

export type AlertJob = {
  id: string;
  status: JobStatus;
  scheduled_slot: string;
  scheduled_end: string;
  plate_number: string;
};

// A job whose end time has passed:
// - still 'booked' (customer never showed and no one started the job) -> no-show
// - 'in_progress'/'awaiting_collection' (started but not wrapped up) -> overdue
// complete/paid/cancelled jobs never alert -- they're already resolved.
export function computeJobAlerts(jobs: AlertJob[], now: Date = new Date()): Alert[] {
  const alerts: Alert[] = [];
  for (const job of jobs) {
    if (new Date(job.scheduled_end) >= now) continue;
    if (job.status === "booked") {
      alerts.push({
        kind: "no_show",
        jobId: job.id,
        plateNumber: job.plate_number,
        scheduledSlot: job.scheduled_slot,
      });
    } else if (job.status === "in_progress" || job.status === "awaiting_collection") {
      alerts.push({
        kind: "overdue",
        jobId: job.id,
        plateNumber: job.plate_number,
        scheduledEnd: job.scheduled_end,
      });
    }
  }
  return alerts;
}
