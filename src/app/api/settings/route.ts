import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser, requireOwner } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const setting = await prisma.setting.findFirst({
      where: { id: "default" },
    });

    return NextResponse.json({
      setting: setting || {
        storeName: "Bengkel Motor Sahabat",
        phone: "0812-3456-7890",
        address: "Jl. Raya Otomotif No. 123, Jakarta",
        receiptFooter: "Terima kasih atas kunjungan Anda. Garansi servis 7 hari.",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat pengaturan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireOwner(req);

    const { storeName, phone, address, receiptFooter } = await req.json();

    const updated = await prisma.setting.upsert({
      where: { id: "default" },
      update: {
        storeName: storeName?.trim(),
        phone: phone?.trim(),
        address: address?.trim(),
        receiptFooter: receiptFooter?.trim(),
      },
      create: {
        id: "default",
        storeName: storeName?.trim() || "Bengkel Motor Sahabat",
        phone: phone?.trim() || "0812-3456-7890",
        address: address?.trim() || "Jl. Raya Otomotif No. 123, Jakarta",
        receiptFooter: receiptFooter?.trim() || "Terima kasih atas kunjungan Anda.",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Setting",
        recordId: "default",
        metadata: JSON.stringify({ storeName, phone, address }),
        createdById: session.id,
      },
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memperbarui pengaturan";
    const status = msg.includes("UNAUTHORIZED") ? 401 : msg.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
