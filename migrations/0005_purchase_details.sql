-- 0005_purchase_details：進貨的日期與備註（規格 7 進貨）。twd_cost 是這筆進貨的台幣總成本（含刷卡手續費）。
ALTER TABLE purchases ADD COLUMN purchased_on TEXT NOT NULL DEFAULT '';
ALTER TABLE purchases ADD COLUMN note TEXT NOT NULL DEFAULT '';
