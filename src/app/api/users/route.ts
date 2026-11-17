import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwner, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Akses ditolak";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwner(req);
    const { name, email, password, role = "OPERATOR" } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Nama, email, dan password wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "User",
        recordId: user.id,
        metadata: JSON.stringify({ email: user.email, role: user.role }),
        createdById: session.id,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menambah pengguna";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireOwner(req);
    const { id, name, role, status, password } = await req.json();

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "ID dan nama wajib diisi" }, { status: 400 });
    }

    const dataToUpdate: Record<string, unknown> = {
      name: name.trim(),
      role,
      status,
    };

    if (password && password.trim()) {
      dataToUpdate.passwordHash = await hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "User",
        recordId: id,
        metadata: JSON.stringify({ role, status, passwordReset: !!password }),
        createdById: session.id,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memperbarui pengguna";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
