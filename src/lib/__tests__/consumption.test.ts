/* eslint-disable import/first */ // jest.mock must be hoisted above imports
// The value in testing consumption.ts is the stock-delta *sign* on each
// operation — an inverted sign silently corrupts stock. We mock Supabase and
// assert what delta the adjust_stock RPC is called with.
//
// Everything is built inside the jest.mock factory (which is hoisted) to avoid
// referencing outer variables that would still be in the temporal dead zone
// when the factory runs. Stable mock refs are exposed back via `__mocks`.

jest.mock("@/lib/supabase", () => {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const insert = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn(() => ({ eq }));
  const del = jest.fn(() => ({ eq }));
  const rpc = jest.fn().mockResolvedValue({ data: 1, error: null });
  const from = jest.fn(() => ({ insert, update, delete: del }));
  return { supabase: { rpc, from, __mocks: { rpc, insert, update, del, eq } } };
});

import { supabase } from "@/lib/supabase";
import {
  addJobProduct,
  changeJobProductQty,
  removeJobProductRow,
} from "@/lib/consumption";

const m = (supabase as unknown as { __mocks: Record<string, jest.Mock> }).__mocks;

beforeEach(() => {
  Object.values(m).forEach((fn) => fn.mockClear());
});

describe("addJobProduct", () => {
  it("inserts the row and decrements stock by qty", async () => {
    const err = await addJobProduct("job1", "prod1", 3);
    expect(err).toBeNull();
    expect(m.insert).toHaveBeenCalledWith({
      job_id: "job1",
      product_id: "prod1",
      qty: 3,
    });
    expect(m.rpc).toHaveBeenCalledWith("adjust_stock", {
      p_product_id: "prod1",
      p_delta: -3,
    });
  });
});

describe("removeJobProductRow", () => {
  it("deletes the row and restores stock by qty", async () => {
    const err = await removeJobProductRow("row1", "prod1", 4);
    expect(err).toBeNull();
    expect(m.rpc).toHaveBeenCalledWith("adjust_stock", {
      p_product_id: "prod1",
      p_delta: 4,
    });
  });
});

describe("changeJobProductQty", () => {
  it("applies the delta (old - new) when increasing quantity", async () => {
    await changeJobProductQty("row1", "prod1", 2, 5);
    // old 2 → new 5 means 3 more consumed → stock delta -3
    expect(m.rpc).toHaveBeenCalledWith("adjust_stock", {
      p_product_id: "prod1",
      p_delta: -3,
    });
  });

  it("routes to removal when the new quantity is zero or less", async () => {
    await changeJobProductQty("row1", "prod1", 4, 0);
    expect(m.del).toHaveBeenCalled();
    expect(m.rpc).toHaveBeenCalledWith("adjust_stock", {
      p_product_id: "prod1",
      p_delta: 4,
    });
  });
});
