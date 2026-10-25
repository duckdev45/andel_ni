-- 0003_order_details：下單需要的欄位（規格 6）。
-- order_items 存下單當下的規格名稱與型態：現貨才有扣庫存，取消／逾時要依此放回庫存。

ALTER TABLE orders ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN option_snapshot TEXT;
ALTER TABLE order_items ADD COLUMN kind_snapshot TEXT NOT NULL DEFAULT '現貨'
  CHECK (kind_snapshot IN ('現貨', '代購', '客訂'));
CREATE INDEX orders_pending_hold ON orders (status, stock_hold_until);
