-- 0007_order_payment：綠界付款（規格 6.3）。
-- pay_attempts：前往付款的次數，綠界交易編號 = 訂單編號＋兩位次數（同一個編號不能重送）。
-- pay_info：取號結果 JSON，ATM 是 {"bank","account","expire"}，無卡分期申請後是 {"bnpl":true}。
ALTER TABLE orders ADD COLUMN pay_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN pay_info TEXT;
