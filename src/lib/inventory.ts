// Reorder-point math (BRD §6.2):
// Reorder Point = (Average Weekly Sales ÷ 7) × Lead Time in Days + Safety Stock

import type { ThemeColors, StatusTone } from "@/lib/theme";
import type { StringKey } from "@/lib/i18n";

export type StockStatus = "ok" | "order_soon" | "order_now" | "critical";

export type ProductStockInput = {
  stock_qty: number;
  sales_per_week: number;
  safety_stock: number;
  lead_time_days_override: number | null;
  supplierLeadTimeDays: number | null;
};

export function leadTimeDays(p: ProductStockInput): number {
  return p.lead_time_days_override ?? p.supplierLeadTimeDays ?? 30;
}

export function reorderPoint(p: ProductStockInput): number {
  return (p.sales_per_week / 7) * leadTimeDays(p) + p.safety_stock;
}

export function stockStatus(p: ProductStockInput): StockStatus {
  const point = reorderPoint(p);
  if (p.stock_qty <= p.safety_stock) return "critical";
  if (p.stock_qty <= point) return "order_now";
  if (point > 0 && p.stock_qty <= point * 1.25) return "order_soon";
  return "ok";
}

const STOCK_TONE_KEY: Record<StockStatus, keyof ThemeColors["status"]> = {
  ok: "success",
  order_soon: "warning",
  order_now: "dangerSoft",
  critical: "dangerStrong",
};

export function stockStatusTone(colors: ThemeColors, status: StockStatus): StatusTone {
  return colors.status[STOCK_TONE_KEY[status]];
}

export function stockStatusLabelKey(status: StockStatus) {
  return `inv.status.${status}` as StringKey;
}

// Suggested order quantity (BRD §6.3):
// (lead-time demand + safety stock) − current stock, floored at 1 and raised
// to the supplier's minimum order quantity when one is set.
export function suggestedOrderQty(p: ProductStockInput, moq: number | null): number {
  const suggested = Math.max(1, Math.ceil(reorderPoint(p) - p.stock_qty));
  return moq != null ? Math.max(suggested, moq) : suggested;
}

export type PoStatus = "draft" | "sent" | "received" | "cancelled";

const PO_TONE_KEY: Record<PoStatus, keyof ThemeColors["status"]> = {
  draft: "neutral",
  sent: "warning",
  received: "success",
  cancelled: "neutral",
};

export function poStatusTone(colors: ThemeColors, status: PoStatus): StatusTone {
  return colors.status[PO_TONE_KEY[status]];
}

export function poStatusLabelKey(status: PoStatus) {
  return `po.status.${status}` as StringKey;
}
