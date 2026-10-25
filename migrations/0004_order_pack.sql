-- 0004_order_pack：每筆訂單的包材費（記帳簿用，規格 7）；NULL 表示用設定的預設值。
ALTER TABLE orders ADD COLUMN pack_cost INTEGER CHECK (pack_cost >= 0);
