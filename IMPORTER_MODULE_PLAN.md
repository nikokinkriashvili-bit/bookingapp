# Importer / Wholesaler Module — Feature Plan (proposal)

**Date:** July 2026 · **Status: input for Niko's importer TRD** (being drafted in Cowork). Nothing here is decided; this maps what the app can become for the importer tier, grounded in what's already built and in Carbros' real operation (importing CarPro, IK, DIY Detail, The Rag Company, MJJC; retail/wholesale via carbros.pro on WooCommerce; B2B customers = the same network detailers who use the shop tier).
When the TRD lands, the approved subset becomes **ROADMAP.md Stage 8**.

---

## 1. What's already built for this (the seams paid off)

| Seam | State |
|---|---|
| `suppliers.linked_business_id` | A shop's supplier record can point at a real platform business (Carbros) |
| Incoming-orders queue | Carbros already *sees* POs sent to it by shops — read-only list, buyer-named, line items snapshotted (`product_name`/`product_sku` survive without cross-tenant product access) |
| Landed-cost columns (dormant) | `purchase_orders`: `exchange_rate`, `freight_cost_gel`, `local_logistics_gel` · `products`: `purchase_price` (supplier currency), `duty_rate_pct`, `last_landed_cost_gel`, `b2b_price_gel`, `list_price_gel` |
| Supplier-side PO updates | RLS policy deliberately **dropped** in migration 011 (audit S1) — to be reintroduced as a safe status-transition RPC in I1, never as raw table access |
| Two-tier inventory | Carbros-as-business already has its own products/suppliers/POs in the same schema — no importer fork needed |

**The key insight: the marketplace loop is already half-closed.** A shop's reorder tap already creates an order in Carbros' queue. The importer module is about what Carbros does *after* that.

## 2. Proposed features

### I1 — Fulfilment pipeline (the incoming queue grows verbs) · *core*
Incoming orders move through importer-side states: `received → confirmed → picking → dispatched → completed`, plus `rejected` (with reason — out of stock, below MOQ, credit hold). Buyer sees status changes live on their PO. Implemented as a **security-definer status-transition RPC** (validates legal transitions + supplier identity — the safe replacement for the dropped S1 policy). Dispatch decrements Carbros stock; the buyer's existing "mark received" keeps adding to theirs — the full §6.6 loop, closed.

### I2 — Landed cost & FX (wake the dormant columns) · *core*
On a Carbros *inbound* PO (from CarPro EU etc.): order currency + exchange rate (manual until 6.4's NBG fetch, then auto at order date), freight + local logistics, per-product duty %. On receipt: landed cost per unit computed and **frozen** per line, `last_landed_cost_gel` updated. This is the number every import decision hangs on — margin per product becomes real instead of felt.

### I3 — B2B price list & dealer terms · *core*
`b2b_price_gel` exists per product but nothing uses it. Add: per-dealer assignment (linked business ⇒ dealer record), pricing tier or per-dealer discount %, minimum order value, payment terms (prepay / net-14 / net-30) and a simple credit limit. Incoming orders price themselves from the buyer's tier; below-MOQ or over-credit orders flag for manual confirmation instead of auto-pricing.

### I4 — Invoices & receivables (the InvoiceGE heritage) · *core*
A completed fulfilment generates an invoice (number, dealer, lines, GEL total, due date from terms). Receivables view: outstanding per dealer, aging (current / 15 / 30 / 60+), payment recording reusing the shop tier's payments mechanism (ROADMAP 4.3b). For an importer, *who owes me what* matters more than any dashboard.

### I5 — Shipment/batch tracking · *should-have, phase 2 of the module*
Link received inbound stock to the shipment (PO) it arrived on → per-batch landed cost → true FIFO COGS instead of last-cost approximation; also answers "which container is this from" for warranty/defect claims with brands. **Decision for TRD: last-cost (simple, close enough) vs. FIFO batches (accurate, heavier). Recommend starting last-cost (I2) and adding batches only if margins are misleading in practice.**

### I6 — carbros.pro (WooCommerce) stock sync · *strategic, riskiest*
Carbros' retail stock lives in WooCommerce; the app's stock lives in Supabase. Two inventories of the same physical shelf will drift immediately. Options for the TRD:
- **(a) App is source of truth**, one-way push to Woo (REST API, Edge Function) — recommended;
- (b) two-way sync — reconciliation hell, avoid;
- (c) manual for pilot — acceptable bridge.
Also unlocks TRD Risk #4 (stock-intelligence data feed) — Woo order webhooks → real sales velocity per product, replacing the manual `sales_per_week` field for Carbros.

### I7 — Importer analytics · *nice-to-have, after data accrues*
Sales by brand (CarPro vs. Rag Company…), by dealer, by product; dealer purchase frequency/recency; margin by brand using I2's landed costs. Feeds Phase-3 Stock Intelligence honestly.

### I8 — Warehouse receiving aids · *nice-to-have*
Phone-camera barcode scan on receive/dispatch (products get a `barcode` column; `expo-camera`). Cheap accuracy win once volumes justify it.

## 3. Data-model sketch (new tables, all per-business RLS as usual)

- `fulfilments` (or status columns + history on `purchase_orders`): state, timestamps, rejection reason — **TRD decision: separate table vs. extending `po_status`** (recommend separate importer-side state so buyer status and supplier status don't fight).
- `dealers`: business_id (importer), buyer_business_id, tier/discount, payment_terms, credit_limit_gel, min_order_gel.
- `invoices` + `invoice_items`; payments reuse 4.3b's table with an `invoice_id`.
- `shipments` (+ `shipment_id` on received PO items) — only if I5 approved.
- `products.barcode` — only if I8 approved.

## 4. Decisions Niko's TRD must settle

1. Fulfilment states: exactly which, and can a dealer cancel after `confirmed`?
2. Pricing: tiers (A/B/C) vs. per-dealer % — how does Carbros actually quote today?
3. Credit: real credit limits, or just terms + manual judgment for the pilot?
4. COGS: last-cost or FIFO batches (I5)?
5. WooCommerce: source of truth + sync direction (I6 a/b/c)?
6. Invoices: legal requirements for Georgian B2B invoices (RS.ge e-invoice/waybill integration eventually?) — determines how "real" I4's invoices must be.
7. Dealers who are *not* on the platform (order by phone) — do they get manual sales orders in the app, or platform-only?

## 5. Proposed build order (becomes Stage 8 when TRD confirms)

| Step | Feature | Why this order |
|---|---|---|
| 8.1 | I1 fulfilment pipeline | Closes the loop already half-built; visible value to pilot detailers immediately |
| 8.2 | I3 dealer terms + B2B pricing | Orders start pricing themselves correctly |
| 8.3 | I2 landed cost + FX (with 6.4 NBG) | Margins become real |
| 8.4 | I4 invoices & receivables | The money layer |
| 8.5 | I6 Woo sync (option a) | After internal flows are stable |
| 8.6+ | I5 batches · I7 analytics · I8 barcode | As data/volume justifies |
