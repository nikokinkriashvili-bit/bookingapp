import { supabase } from "@/lib/supabase";

// Creates a draft PO for the product's supplier — or merges into the existing
// draft for that supplier, so repeated "order" taps from the dashboard build
// one order per supplier (BRD §6.3: auto-draft, owner reviews and approves).
export async function draftPurchaseOrder(opts: {
  businessId: string;
  productId: string;
  productName: string;
  productSku: string;
  supplierId: string;
  qty: number;
  unitPrice: number | null;
}): Promise<{ poId: string | null; error: string | null }> {
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("business_id", opts.businessId)
    .eq("supplier_id", opts.supplierId)
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();

  let poId: string | null = existing?.id ?? null;

  if (!poId) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("currency")
      .eq("id", opts.supplierId)
      .single();
    const { data: created, error: createError } = await supabase
      .from("purchase_orders")
      .insert({
        business_id: opts.businessId,
        supplier_id: opts.supplierId,
        currency: supplier?.currency ?? "EUR",
      })
      .select("id")
      .single();
    if (createError || !created) {
      return { poId: null, error: createError?.message ?? "Failed to create order." };
    }
    poId = created.id;
  }

  const { data: existingItem } = await supabase
    .from("purchase_order_items")
    .select("id, qty")
    .eq("purchase_order_id", poId)
    .eq("product_id", opts.productId)
    .maybeSingle();

  if (existingItem) {
    const { error: updateError } = await supabase
      .from("purchase_order_items")
      .update({ qty: Number(existingItem.qty) + opts.qty })
      .eq("id", existingItem.id);
    if (updateError) return { poId, error: updateError.message };
  } else {
    const { error: insertError } = await supabase.from("purchase_order_items").insert({
      purchase_order_id: poId,
      product_id: opts.productId,
      product_name: opts.productName,
      product_sku: opts.productSku,
      qty: opts.qty,
      unit_price: opts.unitPrice,
    });
    if (insertError) return { poId, error: insertError.message };
  }

  return { poId, error: null };
}

// Marks a PO received and adds each item's qty to its product's stock.
export async function receivePurchaseOrder(
  poId: string,
  items: { product_id: string; qty: number }[]
): Promise<string | null> {
  for (const item of items) {
    // Atomic in-place add (migration 010) — safe against concurrent writers.
    const { data, error: stockError } = await supabase.rpc("adjust_stock", {
      p_product_id: item.product_id,
      p_delta: Number(item.qty),
    });
    if (stockError) return stockError.message;
    if (data == null) return "Product not found.";
  }

  const { error: statusError } = await supabase
    .from("purchase_orders")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", poId);
  return statusError?.message ?? null;
}
