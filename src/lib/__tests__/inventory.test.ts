import {
  leadTimeDays,
  reorderPoint,
  stockStatus,
  suggestedOrderQty,
  type ProductStockInput,
} from "@/lib/inventory";

const base: ProductStockInput = {
  stock_qty: 100,
  sales_per_week: 70, // 10/day
  safety_stock: 5,
  lead_time_days_override: null,
  supplierLeadTimeDays: null,
};

describe("leadTimeDays", () => {
  it("prefers the product override, then the supplier, then 30", () => {
    expect(leadTimeDays({ ...base, lead_time_days_override: 14 })).toBe(14);
    expect(leadTimeDays({ ...base, supplierLeadTimeDays: 21 })).toBe(21);
    expect(leadTimeDays(base)).toBe(30);
  });
});

describe("reorderPoint", () => {
  it("= (weekly/7) * leadDays + safety", () => {
    // 10/day * 10 days + 5 = 105
    expect(reorderPoint({ ...base, lead_time_days_override: 10 })).toBe(105);
  });
});

describe("stockStatus", () => {
  const lead10 = { ...base, lead_time_days_override: 10 }; // reorderPoint = 105
  it("critical at or below safety stock", () => {
    expect(stockStatus({ ...lead10, stock_qty: 5 })).toBe("critical");
    expect(stockStatus({ ...lead10, stock_qty: 3 })).toBe("critical");
  });
  it("order_now at or below reorder point (but above safety)", () => {
    expect(stockStatus({ ...lead10, stock_qty: 100 })).toBe("order_now");
    expect(stockStatus({ ...lead10, stock_qty: 105 })).toBe("order_now");
  });
  it("order_soon within 25% above reorder point", () => {
    expect(stockStatus({ ...lead10, stock_qty: 130 })).toBe("order_soon"); // <=131.25
  });
  it("ok when comfortably above", () => {
    expect(stockStatus({ ...lead10, stock_qty: 200 })).toBe("ok");
  });
});

describe("suggestedOrderQty", () => {
  const lead10 = { ...base, lead_time_days_override: 10, stock_qty: 100 }; // point 105
  it("covers the gap to the reorder point, floored at 1", () => {
    // ceil(105 - 100) = 5
    expect(suggestedOrderQty(lead10, null)).toBe(5);
  });
  it("never suggests below 1 even when well stocked", () => {
    expect(suggestedOrderQty({ ...lead10, stock_qty: 500 }, null)).toBe(1);
  });
  it("raises to the supplier MOQ when set", () => {
    expect(suggestedOrderQty(lead10, 50)).toBe(50);
    expect(suggestedOrderQty(lead10, 2)).toBe(5); // MOQ below need → keep need
  });
});
