import { PrismaClient, Role, EntityStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database Sistem Inventory Bengkel Motor...");

  // 1. Settings
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Bengkel Motor Sahabat",
      phone: "0812-3456-7890",
      address: "Jl. Raya Otomotif No. 123, Jakarta",
      receiptFooter: "Terima kasih atas kunjungan Anda. Garansi servis & suku cadang asli.",
    },
  });

  // 2. Users
  const passwordOwner = await bcrypt.hash("admin123", 10);
  const passwordOperator = await bcrypt.hash("operator123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "pemilik@bengkel.com" },
    update: {},
    create: {
      name: "Budi Santoso (Pemilik)",
      email: "pemilik@bengkel.com",
      passwordHash: passwordOwner,
      role: Role.OWNER,
      status: EntityStatus.ACTIVE,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: "operator@bengkel.com" },
    update: {},
    create: {
      name: "Andi Wijaya (Operator)",
      email: "operator@bengkel.com",
      passwordHash: passwordOperator,
      role: Role.OPERATOR,
      status: EntityStatus.ACTIVE,
    },
  });

  console.log(`Users seeded: ${owner.email}, ${operator.email}`);

  // 3. Categories
  const categoriesData = [
    { name: "Oli & Pelumas", description: "Oli mesin matic, bebek, manual, dan oli gardan" },
    { name: "Busi & Filter", description: "Busi standar, iridium, dan filter udara" },
    { name: "Rem & Suspensi", description: "Kampas rem cakram, tromol, dan minyak rem" },
    { name: "Kelistrikan & Aki", description: "Aki kering, basah, bohlam lampu, dan sekring" },
    { name: "Transmisi & CVT", description: "V-belt, roller, per cvt, dan kampas ganda" },
    { name: "Ban & Velg", description: "Ban tubeless, ban dalam, dan pentil" },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        description: cat.description,
        status: EntityStatus.ACTIVE,
      },
    });
    categoryMap[cat.name] = c.id;
  }

  // 4. Suppliers
  const suppliersData = [
    {
      name: "PT Astra Otoparts Distribusi",
      contactPerson: "Pak Hendra",
      phone: "0811-2233-4455",
      address: "Kawasan Industri Pulogadung, Jakarta",
      notes: "Distributor resmi suku cadang Honda & Aspira",
    },
    {
      name: "CV Sumber Pelumas Abadi",
      contactPerson: "Ibu Linda",
      phone: "0813-8899-7766",
      address: "Jl. Daan Mogot Km 12, Jakarta Barat",
      notes: "Distributor Oli Pertamina, Federal, Yamalube, Shell",
    },
    {
      name: "Toko Grosir Sparepart Maju",
      contactPerson: "Koh Akong",
      phone: "0812-9988-1122",
      address: "Pasar Senen Blok 3, Jakarta Pusat",
      notes: "Suplier aksesoris umum & fast moving parts",
    },
  ];

  for (const sup of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    if (!existing) {
      await prisma.supplier.create({
        data: {
          name: sup.name,
          contactPerson: sup.contactPerson,
          phone: sup.phone,
          address: sup.address,
          notes: sup.notes,
          status: EntityStatus.ACTIVE,
        },
      });
    }
  }

  // 5. Products
  const productsData = [
    {
      sku: "OLI-MPX2-08",
      name: "AHM Oil MPX 2 Matic 0.8L",
      category: "Oli & Pelumas",
      unit: "Botol",
      buyPrice: 46000,
      sellPrice: 58000,
      stock: 24,
      minStock: 6,
    },
    {
      sku: "OLI-YAM-08",
      name: "Yamalube Matic Motor Oil 0.8L",
      category: "Oli & Pelumas",
      unit: "Botol",
      buyPrice: 45000,
      sellPrice: 56000,
      stock: 18,
      minStock: 6,
    },
    {
      sku: "BUSI-CPR9",
      name: "Busi NGK CPR9EA-9 (Beat/Vario)",
      category: "Busi & Filter",
      unit: "Pcs",
      buyPrice: 16000,
      sellPrice: 25000,
      stock: 15,
      minStock: 5,
    },
    {
      sku: "REM-DPN-HND",
      name: "Kampas Rem Depan Honda Beat/Vario",
      category: "Rem & Suspensi",
      unit: "Set",
      buyPrice: 32000,
      sellPrice: 48000,
      stock: 10,
      minStock: 4,
    },
    {
      sku: "REM-BLK-HND",
      name: "Kampas Rem Belakang Tromol Honda",
      category: "Rem & Suspensi",
      unit: "Set",
      buyPrice: 28000,
      sellPrice: 42000,
      stock: 8,
      minStock: 4,
    },
    {
      sku: "AKI-GS-GTZ5S",
      name: "Aki Kering GS Astra GTZ5S 12V 3.5Ah",
      category: "Kelistrikan & Aki",
      unit: "Pcs",
      buyPrice: 195000,
      sellPrice: 245000,
      stock: 3, // Low stock alert!
      minStock: 4,
    },
    {
      sku: "CVT-BELT-BEAT",
      name: "Drive Belt Kit (Vanbelt + Roller) Beat FI",
      category: "Transmisi & CVT",
      unit: "Set",
      buyPrice: 115000,
      sellPrice: 155000,
      stock: 5,
      minStock: 3,
    },
    {
      sku: "BAN-FDR-9090",
      name: "Ban Luar Tubeless FDR Sport XR 90/90-14",
      category: "Ban & Velg",
      unit: "Pcs",
      buyPrice: 175000,
      sellPrice: 220000,
      stock: 4,
      minStock: 2,
    },
    {
      sku: "FIL-BEAT-ESP",
      name: "Saringan Udara / Filter Udara Beat eSP",
      category: "Busi & Filter",
      unit: "Pcs",
      buyPrice: 38000,
      sellPrice: 52000,
      stock: 2, // Low stock alert!
      minStock: 4,
    },
  ];

  for (const prod of productsData) {
    const catId = categoryMap[prod.category];
    if (catId) {
      await prisma.product.upsert({
        where: { sku: prod.sku },
        update: {},
        create: {
          sku: prod.sku,
          name: prod.name,
          categoryId: catId,
          unit: prod.unit,
          lastBuyPrice: prod.buyPrice,
          averageBuyPrice: prod.buyPrice,
          sellPrice: prod.sellPrice,
          stock: prod.stock,
          minStock: prod.minStock,
          status: EntityStatus.ACTIVE,
        },
      });
    }
  }

  // 6. Expense Categories
  const expenseCategories = [
    "Listrik & Air Bengkel",
    "Gaji / Uang Makan Karyawan",
    "Sewa Tempat & Kebersihan",
    "Alat Kerja & Spare Part Tools",
    "Konsumsi & Operasional Lainnya",
  ];

  for (const expName of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: expName },
      update: {},
      create: {
        name: expName,
        status: EntityStatus.ACTIVE,
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
