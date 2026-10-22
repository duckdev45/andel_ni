-- 0001_init：規格第 8 節資料表初稿。
-- 規則（規格 11.5）：已套用的 migration 不再修改，改資料表一律新增檔案。
-- 時間一律存 ISO 8601 UTC 字串；金額存整數台幣。

-- ── 會員 ─────────────────────────────────────────────

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified_at TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  password_changed_at TEXT
);

-- 第一版只有 email；保留給之後的 line | google（規格 3.1）
CREATE TABLE auth_identities (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_uid TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (provider, provider_uid)
);

CREATE TABLE email_otps (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset_password', 'change_email')),
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX email_otps_email_purpose ON email_otps (email, purpose);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE addresses (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cvs', 'home')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cvs_brand TEXT CHECK (cvs_brand IN ('711', 'family')),
  cvs_store_id TEXT,
  cvs_store_name TEXT,
  address TEXT,
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX addresses_user ON addresses (user_id);

-- ── 商品 ─────────────────────────────────────────────

CREATE TABLE brands (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  origin TEXT,
  blurb TEXT
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  coming_soon INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  -- 對外商品編號 AN0014，永不重用（規格 5.1a）
  code TEXT NOT NULL UNIQUE,
  -- 網址描述，可改；網址以 code 為準
  slug TEXT NOT NULL,
  brand_id INTEGER NOT NULL REFERENCES brands (id),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  -- 規格 8 寫 現貨 | 客訂；前台另分出 部分現貨、代購 兩種標示
  type TEXT NOT NULL CHECK (type IN ('現貨', '部分現貨', '代購', '客訂')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_new INTEGER NOT NULL DEFAULT 0,
  -- 規格名稱（顏色、款式）；單一規格商品為 NULL
  option_name TEXT,
  -- 卡片上的規格摘要，例如「4 色」
  variant_summary TEXT,
  -- 規格表 JSON：[["材質","小牛皮"], ...]
  specs TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX products_status_created ON products (status, created_at);

-- 每件商品至少一筆；單一規格商品的 option_label 為 NULL
CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  option_label TEXT,
  sku TEXT NOT NULL UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  swatch TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX product_variants_product ON product_variants (product_id, sort);

CREATE TABLE product_images (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  -- R2 物件鍵；開頭為 / 表示站內靜態檔（種子資料）
  r2_key TEXT NOT NULL,
  -- 1200×630 分享圖（規格 5.2）
  og_r2_key TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  alt TEXT NOT NULL DEFAULT ''
);
CREATE INDEX product_images_product ON product_images (product_id, sort);

-- ── 購物車 ───────────────────────────────────────────

CREATE TABLE carts (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  qty INTEGER NOT NULL CHECK (qty > 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (user_id, variant_id)
);

-- ── 訂單 ─────────────────────────────────────────────

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users (id),
  -- 規格 6.1：待付款 → 待出貨 → 已出貨 → 已完成；已取消；退回
  status TEXT NOT NULL CHECK (
    status IN ('pending_payment', 'pending_shipment', 'shipped', 'completed', 'cancelled', 'returned')
  ),
  subtotal INTEGER NOT NULL,
  shipping_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit', 'apple_pay', 'atm', 'bnpl')),
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('711', 'family', 'tcat')),
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  cvs_store_id TEXT,
  cvs_store_name TEXT,
  address TEXT,
  tracking_no TEXT,
  -- 客訂商品勾選「已了解不適用 7 天鑑賞期」（規格 9）
  consent_no_return INTEGER NOT NULL DEFAULT 0,
  stock_hold_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  paid_at TEXT,
  shipped_at TEXT
);
CREATE INDEX orders_user_created ON orders (user_id, created_at);
CREATE INDEX orders_status_created ON orders (status, created_at);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants (id),
  name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_cost INTEGER
);
CREATE INDEX order_items_order ON order_items (order_id);

-- 綠界付款通知：同一筆交易重複通知不重複入帳（冪等，規格 6.3）
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id),
  provider TEXT NOT NULL,
  trade_no TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  raw TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (provider, trade_no)
);

CREATE TABLE order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX order_events_order ON order_events (order_id, created_at);

-- ── 進貨與設定 ───────────────────────────────────────

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants (id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  foreign_price REAL NOT NULL,
  currency TEXT NOT NULL,
  fx_rate REAL NOT NULL,
  card_fee_rate REAL NOT NULL,
  twd_cost INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX purchases_variant ON purchases (variant_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
