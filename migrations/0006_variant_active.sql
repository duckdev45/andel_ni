-- 0006_variant_active：規格停用（規格 5.1a）。後台刪掉的規格若已有訂單或進貨紀錄（外鍵擋刪除），改成停用；前台、購物車、結帳只看啟用的規格。
ALTER TABLE product_variants ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
