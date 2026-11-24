import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  // Build the datasource URL with PgBouncer-safe parameters
  // connection_limit=1 required for serverless (Vercel) + PgBouncer pooler
  // pool_timeout=0 disables client-side queuing (Prisma hands connection back immediately)
  const baseUrl = process.env.DATABASE_URL ?? "";
  const separator = baseUrl.includes("?") ? "&" : "?";
  const datasourceUrl = baseUrl.endsWith("connection_limit=1")
    ? baseUrl
    : `${baseUrl}${separator}connection_limit=1&pool_timeout=0`;

  return new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

globalThis.prismaGlobal = prisma;

export default prisma;

