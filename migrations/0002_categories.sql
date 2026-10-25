-- 0002_categories：分類是網站結構（規格 5.1），不是示範資料，正式站也要有。
-- 與 app/lib/catalog.ts 的 CATEGORIES 一致；已存在的分類不覆蓋。

INSERT OR IGNORE INTO categories (slug, name, name_en, sort, coming_soon) VALUES
  ('bag', '包包', 'Bags', 0, 0),
  ('slg', '小皮件', 'Small Leather Goods', 1, 0),
  ('acc', '飾品', 'Accessories', 2, 0),
  ('rtw', '衣服褲子', 'Ready-to-wear', 3, 0),
  ('shoes', '鞋子', 'Shoes', 4, 0),
  ('doll', '娃娃', 'Plush', 5, 0),
  ('beauty', '彩妝保養', 'Beauty', 6, 0),
  ('home', '家飾', 'Coming soon', 7, 1);
