import { Decimal } from "@prisma/client/runtime/library";

/**
 * Calculates new Moving Weighted Average (HPP) after a purchase.
 *
 * Formula:
 * New HPP = ((Current Stock * Current HPP) + (Purchased Qty * Purchase Price)) / (Current Stock + Purchased Qty)
 * If Current Stock <= 0, New HPP = Purchase Price.
 */
export function calculateMovingAverageHPP(
  currentStock: number,
  currentHpp: number | Decimal,
  purchaseQty: number,
  purchasePrice: number | Decimal
): number {
  const curHpp = typeof currentHpp === "number" ? currentHpp : Number(currentHpp);
  const buyPrice = typeof purchasePrice === "number" ? purchasePrice : Number(purchasePrice);

  if (purchaseQty <= 0) {
    return curHpp;
  }

  // If current stock is 0 or negative, new HPP is simply the latest purchase price
  if (currentStock <= 0) {
    return buyPrice;
  }

  const currentTotalVal = currentStock * curHpp;
  const newPurchaseVal = purchaseQty * buyPrice;
  const totalQty = currentStock + purchaseQty;

  const newAverage = (currentTotalVal + newPurchaseVal) / totalQty;
  return Math.round(newAverage * 100) / 100; // Round to 2 decimal places
}

/**
 * Format number to Indonesian Rupiah currency format.
 * Example: 45000 -> "Rp 45.000"
 */
export function formatRupiah(value: number | Decimal | string | null | undefined): string {
  if (value === null || value === undefined) return "Rp 0";
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return "Rp 0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format plain number with thousand separator
 */
export function formatNumber(value: number | Decimal | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return "0";

  return new Intl.NumberFormat("id-ID").format(num);
}

/**
 * Format Date to Indonesian format: 17 Nov 2026
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Format Date with Time: 17 Nov 2026, 14:30
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Generates transaction code e.g. PJ-20261117-001 or PB-20261117-001
 */
export function generateCode(prefix: string, sequenceNumber: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const seq = String(sequenceNumber).padStart(4, "0");
  return `${prefix}-${year}${month}${day}-${seq}`;
}
