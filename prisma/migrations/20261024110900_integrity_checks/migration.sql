-- Database-level validation (money in integer paise, stock never negative).
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonneg" CHECK ("pricePaise" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_compare_valid" CHECK ("compareAtPaise" IS NULL OR "compareAtPaise" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonneg" CHECK ("stock" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_qty_pos" CHECK ("quantity" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_nonneg" CHECK ("totalPaise" >= 0 AND "subtotalPaise" >= 0 AND "shippingPaise" >= 0);
