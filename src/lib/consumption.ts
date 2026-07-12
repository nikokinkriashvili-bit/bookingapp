import { supabase } from "@/lib/supabase";

// Product consumption per job (BRD BK-08). Stock adjusts at logging time —
// add decrements, remove restores, qty change applies the delta — so job
// status changes never touch stock and can't double-count it.

async function adjustStock(productId: string, delta: number): Promise<string | null> {
  // Atomic in-place add (migration 010) — safe against concurrent writers.
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_delta: delta,
  });
  if (error) return error.message;
  if (data == null) return "Product not found.";
  return null;
}

export async function addJobProduct(
  jobId: string,
  productId: string,
  qty: number
): Promise<string | null> {
  const { error } = await supabase
    .from("job_products")
    .insert({ job_id: jobId, product_id: productId, qty });
  if (error) return error.message;
  return adjustStock(productId, -qty);
}

export async function changeJobProductQty(
  rowId: string,
  productId: string,
  oldQty: number,
  newQty: number
): Promise<string | null> {
  if (newQty <= 0) return removeJobProductRow(rowId, productId, oldQty);
  const { error } = await supabase
    .from("job_products")
    .update({ qty: newQty })
    .eq("id", rowId);
  if (error) return error.message;
  return adjustStock(productId, oldQty - newQty);
}

export async function removeJobProductRow(
  rowId: string,
  productId: string,
  qty: number
): Promise<string | null> {
  const { error } = await supabase.from("job_products").delete().eq("id", rowId);
  if (error) return error.message;
  return adjustStock(productId, qty);
}
