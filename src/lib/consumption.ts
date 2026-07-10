import { supabase } from "@/lib/supabase";

// Product consumption per job (BRD BK-08). Stock adjusts at logging time —
// add decrements, remove restores, qty change applies the delta — so job
// status changes never touch stock and can't double-count it.

async function adjustStock(productId: string, delta: number): Promise<string | null> {
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("stock_qty")
    .eq("id", productId)
    .single();
  if (fetchError || !product) return fetchError?.message ?? "Product not found.";
  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_qty: Number(product.stock_qty) + delta })
    .eq("id", productId);
  return updateError?.message ?? null;
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
