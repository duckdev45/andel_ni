-- 0008_catalog_admin：分類、品牌改由後台維護（原本寫死在 app/lib/catalog.ts、app/lib/admin.ts）。
-- 分類可停用（前台不顯示）；品牌加預設進貨幣別。

ALTER TABLE categories ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
ALTER TABLE brands ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'
  CHECK (currency IN ('EUR', 'GBP', 'JPY', 'USD', 'TWD'));

-- 原本寫死的品牌清單（網站結構，正式站也要有）。已存在的品牌只補空白欄位，不覆蓋後台改過的值。
INSERT INTO brands (name, slug, origin, blurb, currency) VALUES
  ('A.P.C.', 'apc', '法國', NULL, 'EUR'),
  ('ACNE STUDIOS', 'acne-studios', '瑞典', NULL, 'EUR'),
  ('AMI PARIS', 'ami-paris', '法國', NULL, 'EUR'),
  ('Balenciaga', 'balenciaga', '法國', NULL, 'EUR'),
  ('Bottega Veneta', 'bottega-veneta', '義大利', NULL, 'EUR'),
  ('Burberry', 'burberry', '英國', NULL, 'GBP'),
  ('CHANEL', 'chanel', '法國', NULL, 'EUR'),
  ('DIOR', 'dior', '法國', NULL, 'EUR'),
  ('GOYARD', 'goyard', '法國', '1853 年創立於巴黎的行李箱品牌，以 Goyardine 印花聞名。', 'EUR'),
  ('Jellycat', 'jellycat', '英國', NULL, 'GBP'),
  ('LEMAIRE', 'lemaire', '法國', NULL, 'EUR'),
  ('LOEWE', 'loewe', '西班牙', NULL, 'EUR'),
  ('Maison Margiela', 'maison-margiela', '法國', NULL, 'EUR'),
  ('MIU MIU', 'miu-miu', '義大利', NULL, 'EUR'),
  ('PRADA', 'prada', '義大利', NULL, 'EUR'),
  ('Saint Laurent', 'saint-laurent', '法國', NULL, 'EUR'),
  ('Steiff', 'steiff', '德國', NULL, 'EUR'),
  ('TOTEME', 'toteme', '瑞典', NULL, 'EUR'),
  ('Vivienne Westwood', 'vivienne-westwood', '英國', NULL, 'EUR')
ON CONFLICT (name) DO UPDATE SET
  origin = COALESCE(brands.origin, excluded.origin),
  blurb = COALESCE(brands.blurb, excluded.blurb);

-- 原本寫死的品牌幣別（含示範商品的品牌，只更新已存在的）
UPDATE brands SET currency = 'USD' WHERE name IN ('Estée Lauder', 'Urban Sophistication');
UPDATE brands SET currency = 'JPY' WHERE name = 'The North Face';
UPDATE brands SET currency = 'GBP' WHERE name IN ('Burberry', 'Jellycat');
