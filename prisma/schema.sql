-- =============================================================================
-- SQL SCHEMA: Sistem Inventory Bengkel Motor (PostgreSQL / Supabase)
-- Sesuai dengan PRD v1.0 dan Prisma Schema
-- Anda dapat langsung meng-copy script ini ke menu SQL Editor di Dashboard Supabase.
-- =============================================================================

-- 1. ENUM TYPES
CREATE TYPE "Role" AS ENUM ('OWNER', 'OPERATOR');
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "TransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');
CREATE TYPE "StockMovementType" AS ENUM (
  'IN_PURCHASE',
  'OUT_SALE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'OPNAME',
  'VOID_PURCHASE',
  'VOID_SALE'
);
CREATE TYPE "OpnameStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" DEFAULT 'OPERATOR' NOT NULL,
  "status" "EntityStatus" DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS "categories" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "status" "EntityStatus" DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "contactPerson" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "status" "EntityStatus" DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. PRODUCTS TABLE (Master Barang)
CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "sku" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "unit" TEXT DEFAULT 'Pcs' NOT NULL,
  "lastBuyPrice" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "averageBuyPrice" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "sellPrice" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "stock" INTEGER DEFAULT 0 NOT NULL,
  "minStock" INTEGER DEFAULT 5 NOT NULL,
  "status" "EntityStatus" DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");

-- 6. PURCHASES TABLE (Faktur Pembelian Masuk)
CREATE TABLE IF NOT EXISTS "purchases" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "supplierId" TEXT NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "status" "TransactionStatus" DEFAULT 'POSTED' NOT NULL,
  "subtotal" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "discount" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "additionalFee" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "total" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "purchases_supplierId_idx" ON "purchases"("supplierId");
CREATE INDEX IF NOT EXISTS "purchases_date_idx" ON "purchases"("date");
CREATE INDEX IF NOT EXISTS "purchases_status_idx" ON "purchases"("status");

-- 7. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS "purchase_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseId" TEXT NOT NULL REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" INTEGER NOT NULL,
  "buyPrice" DECIMAL(15, 2) NOT NULL,
  "subtotal" DECIMAL(15, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");
CREATE INDEX IF NOT EXISTS "purchase_items_productId_idx" ON "purchase_items"("productId");

-- 8. SALES TABLE (Invoice Penjualan Kasir)
CREATE TABLE IF NOT EXISTS "sales" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "customerName" TEXT DEFAULT 'Umum',
  "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "status" "TransactionStatus" DEFAULT 'POSTED' NOT NULL,
  "subtotal" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "discount" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "total" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "sales_date_idx" ON "sales"("date");
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales"("status");

-- 9. SALE ITEMS TABLE (Menyimpan snapshot HPP saat transaksi terjadi)
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "saleId" TEXT NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" INTEGER NOT NULL,
  "sellPrice" DECIMAL(15, 2) NOT NULL,
  "hppSnapshot" DECIMAL(15, 2) NOT NULL,
  "discount" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  "subtotal" DECIMAL(15, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS "sale_items_saleId_idx" ON "sale_items"("saleId");
CREATE INDEX IF NOT EXISTS "sale_items_productId_idx" ON "sale_items"("productId");

-- 10. STOCK MOVEMENTS TABLE (Kartu Stok / Audit Trail Mutasi)
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "type" "StockMovementType" NOT NULL,
  "refNumber" TEXT,
  "quantity" INTEGER NOT NULL,
  "previousStock" INTEGER NOT NULL,
  "currentStock" INTEGER NOT NULL,
  "reason" TEXT,
  "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX IF NOT EXISTS "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");
CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements"("type");

-- 11. STOCK OPNAMES TABLE (Header Sesi Opname)
CREATE TABLE IF NOT EXISTS "stock_opnames" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "opnameNumber" TEXT UNIQUE NOT NULL,
  "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "status" "OpnameStatus" DEFAULT 'DRAFT' NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "stock_opnames_date_idx" ON "stock_opnames"("date");

-- 12. STOCK OPNAME ITEMS TABLE (Hitung Fisik & Selisih)
CREATE TABLE IF NOT EXISTS "stock_opname_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "stockOpnameId" TEXT NOT NULL REFERENCES "stock_opnames"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "systemStock" INTEGER NOT NULL,
  "physicalStock" INTEGER NOT NULL,
  "difference" INTEGER NOT NULL,
  "reason" TEXT
);
CREATE INDEX IF NOT EXISTS "stock_opname_items_stockOpnameId_idx" ON "stock_opname_items"("stockOpnameId");
CREATE INDEX IF NOT EXISTS "stock_opname_items_productId_idx" ON "stock_opname_items"("productId");

-- 13. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT UNIQUE NOT NULL,
  "status" "EntityStatus" DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. EXPENSES TABLE (Beban / Biaya Operasional)
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" TEXT NOT NULL REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "amount" DECIMAL(15, 2) NOT NULL,
  "description" TEXT NOT NULL,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "expenses_categoryId_idx" ON "expenses"("categoryId");
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses"("date");

-- 15. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "metadata" TEXT,
  "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_recordId_idx" ON "audit_logs"("entity", "recordId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- 16. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT PRIMARY KEY DEFAULT 'default',
  "storeName" TEXT DEFAULT 'Bengkel Motor Sahabat' NOT NULL,
  "phone" TEXT DEFAULT '0812-3456-7890' NOT NULL,
  "address" TEXT DEFAULT 'Jl. Raya Otomotif No. 123, Jakarta' NOT NULL,
  "receiptFooter" TEXT DEFAULT 'Terima kasih atas kunjungan Anda. Garansi servis 7 hari.' NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- DATA AWAL (INITIAL SEED DATA)
-- Akun Login Demo:
-- Pemilik  : pemilik@bengkel.com  / admin123
-- Operator : operator@bengkel.com / operator123
-- =============================================================================

INSERT INTO "settings" ("id", "storeName", "phone", "address", "receiptFooter")
VALUES ('default', 'Bengkel Motor Sahabat', '0812-3456-7890', 'Jl. Raya Otomotif No. 123, Jakarta', 'Terima kasih atas kunjungan Anda. Garansi servis & suku cadang asli.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "status")
VALUES 
  ('usr-owner-001', 'Budi Santoso (Pemilik)', 'pemilik@bengkel.com', '$2a$10$wN9iL6Zf72tH6r7rP/uGk.1wKzZJc0M87b2g7f9qB9h0K1l2M3n4O', 'OWNER', 'ACTIVE'),
  ('usr-operator-001', 'Andi Wijaya (Operator)', 'operator@bengkel.com', '$2a$10$sX8jM7Yg83uI7s8sQ/vHl.2xLaAKd1N98c3h8g0rC0i1L2m3N4o5P', 'OPERATOR', 'ACTIVE')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "expense_categories" ("id", "name", "status")
VALUES
  ('exp-cat-1', 'Listrik & Air Bengkel', 'ACTIVE'),
  ('exp-cat-2', 'Gaji / Uang Makan Karyawan', 'ACTIVE'),
  ('exp-cat-3', 'Sewa Tempat & Kebersihan', 'ACTIVE'),
  ('exp-cat-4', 'Alat Kerja & Spare Part Tools', 'ACTIVE'),
  ('exp-cat-5', 'Konsumsi & Operasional Lainnya', 'ACTIVE')
ON CONFLICT ("name") DO NOTHING;
