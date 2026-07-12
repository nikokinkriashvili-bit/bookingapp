-- Run manually in the Supabase SQL Editor, after 009.
--
-- Two safety fixes surfaced by the July 2026 system audit:
--
-- 1. adjust_stock() — atomic stock movement. The app previously did a
--    read-then-write (SELECT stock_qty, then UPDATE stock_qty + delta) from
--    the client. With staff accounts now live, two members logging
--    consumption (or receiving a PO) at the same time could read the same
--    starting value and one update would clobber the other. A single UPDATE
--    that adds the delta in-place is atomic and can't lose a write. It's
--    security-definer + membership-checked so it honours the same tenant
--    boundary as the RLS policies.
--
-- 2. one_draft_po_per_supplier — the reorder flow is meant to keep exactly
--    one open draft PO per supplier and merge repeat "order" taps into it.
--    Concurrent taps could still race and create two. This partial unique
--    index makes the database enforce the invariant.
--
--    NOTE: if this index fails to create with a "could not create unique
--    index" error, you already have duplicate draft POs for a supplier from
--    before this migration. Open Inventory → Orders, cancel the extra draft(s)
--    so each supplier has at most one draft, then re-run just the index.

create or replace function adjust_stock(p_product_id uuid, p_delta numeric)
returns numeric
language sql
security definer
set search_path = public
as $$
  update products
  set stock_qty = stock_qty + p_delta
  where id = p_product_id
    and business_id in (select member_business_ids())
  returning stock_qty;
$$;

create unique index if not exists one_draft_po_per_supplier
  on purchase_orders (business_id, supplier_id)
  where status = 'draft';
