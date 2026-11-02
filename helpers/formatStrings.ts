// helpers/formatStrings.ts
import type { CartItem, Transaction, TransactionItem, TransactionPayment } from '@/lib/types'
import type { ToasterReturn } from '@/components/util/CustomToast'
import { SystemSettings } from '@/app/settings/page'

// ---------- Validation ----------

export const symbol_inString = (value: string): boolean =>
  /[!@#$%^&(),.?":{}|<>/_|+`~";]/.test(value)

export const symbol_inNumber = (value: string): boolean =>
  /[!@#$%^&()*?":{}|<>/_|+`~";]/.test(value)

export const hasAlphabetInNumber = (value: string): boolean => /[a-zA-Z]/.test(value)

export const removeAllAlphabets = (str: string): string =>
  String(str ?? '').replace(/[a-zA-Z]/g, '')

// ---------- Strings ----------

export const capitalize = (data: string): string => {
  if (!data || data.trim().length === 0) return ''
  return data
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export const separateByCapitalLetters = (str: string): string =>
  String(str).replace(/([A-Z])/g, ' $1').trim()

// ---------- Dates ----------

export const time = (date: string): string => {
  if (!date || !date.trim()) return date
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const alphaNumericDate = (date: string): string => {
  if (!date || !date.trim()) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const alphaNumericCurrentDate = (): string => alphaNumericDate(new Date().toISOString())
export const currentDate = (): string => alphaNumericCurrentDate()

export const numericCurrentDate = (format: string): string => {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')

  switch (format?.toLowerCase().trim()) {
    case 'yyyy-mm-dd':
      return `${yyyy}-${mm}-${dd}`
    case 'mm-dd-yyyy':
      return `${mm}-${dd}-${yyyy}`
    default:
      return `${dd}-${mm}-${yyyy}`
  }
}


export const numericDate = (date: string, format: string): string => {
  if (!date) return '';

  // Take only the date portion so a trailing time/zone can't shift the day.
  const datePart = String(date).split('T')[0];

  // Parse at noon local — safe in every timezone.
  const parsed = new Date(`${datePart}T12:00:00`);
  if (isNaN(parsed.getTime())) return '';

  const yyyy = String(parsed.getFullYear());
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');

  switch (format?.toLowerCase().trim()) {
    case 'yyyy-mm-dd':
      return `${yyyy}-${mm}-${dd}`;
    case 'mm-dd-yyyy':
      return `${mm}-${dd}-${yyyy}`;
    default:
      return `${dd}-${mm}-${yyyy}`;
  }
};


export const lastDayOfYear = (date: string | Date): string => {
  if (!date) return '';

  const datePart =
    date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : String(date).split('T')[0];

  const parsed = new Date(`${datePart}T12:00:00`);
  if (isNaN(parsed.getTime())) return '';

  // Dec 31 of the same year, at noon local
  const lastDay = new Date(parsed.getFullYear(), 11, 31, 12, 0, 0);

  const yyyy = String(lastDay.getFullYear());
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;  // always YYYY-MM-DD
};

// ---------- Numbers ----------

export const formatNumberWithCommas = (number: string): string => {
  if (number === null || number === undefined || number === '') return ''
  const cleaned = String(number).replace(/,/g, '')
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return ''

  const [intPart, decPart] = cleaned.split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted
}

export const currency = (value: string): string => {
  if (!value) return ''
  const num = Number(String(value).replace(/,/g, ''))
  if (isNaN(num)) return ''
  return formatNumberWithCommas(num.toFixed(2))
}

export const removeCommasFromNumbers = (value: string): number => {
  if (value === undefined || value === null || symbol_inNumber(value)) return 0
  return Number(String(value).replace(/,/g, ''))
}

export const volume = (value: string): string | number => {
  if (Number(value) === 0 || String(value).trim() === '0') return 0
  return formatNumberWithCommas(String(removeCommasFromNumbers(value)))
}

export const Sum = <T extends Record<string, unknown>>(
  prop: keyof T,
  array: T[] = []
): number => {
  return array.reduce((total, item) => {
    const n = Number(String(item[prop] ?? '').replace(/,/g, ''))
    return total + (isNaN(n) ? 0 : n)
  }, 0)
}

// ---------- Vehicle numbers ----------

export const removeHyphinFromCarNumber = (str: string): string =>
  String(str ?? '').replace(/-/g, '')

/**
 * Formats a Ghanaian plate number into "AB-1234-23" form.
 * Accepts: "GT123423", "GT-1234-23", "GT 1234 23"
 */
export const carNumber = (str: string): string => {
  if (str === undefined || str === null) return ''
  if (str.includes('-')) return str.toUpperCase()
  if (str.length > 10) return str

  const clean = removeHyphinFromCarNumber(str)
  if (!clean) return ''

  const lastChar = clean[clean.length - 1]
  if (isNaN(Number(lastChar))) {
    return `${clean.slice(0, 2)}-${clean.slice(2, clean.length - 1)}-${lastChar}`
  }
  return `${clean.slice(0, 2)}-${clean.slice(2, clean.length - 2)}-${clean.slice(-2)}`
}

// ---------- URL ----------

export const urlParams = (): Record<string, string> => {
  const params: Record<string, string> = {}
  if (typeof window === 'undefined') return params

  window.location.search
    .slice(1)
    .split('&')
    .filter(Boolean)
    .forEach((pair) => {
      const [key, value] = pair.split('=')
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '')
    })
  return params
}

// ---------- Search validation ----------

export const isNotValidSearchInput = (
  value = '',
  allowEmptyValue = false
): string | undefined => {
  const filter = value.trim()
  if (!filter && !allowEmptyValue) return 'Please enter a filter in the search box'
  if (!/[a-zA-Z0-9]/.test(filter) && filter !== '*') {
    return 'Please enter valid search text'
  }
  return undefined
}

// ---------- Toasts ----------

export const toastErrors = (
  toast: ToasterReturn,
  error: unknown,
  heading = '',
  showHeading = false
): void => {
  const axiosErr = error as {
    response?: { data?: { message?: string } | string }
  }
  const description =
    typeof error === 'string'
      ? error
      : axiosErr?.response?.data && typeof axiosErr.response.data === 'object'
        ? axiosErr.response.data.message
        : typeof axiosErr?.response?.data === 'string'
          ? axiosErr.response.data
          : 'Please try again later'

  toast.warning({
    title: heading || (showHeading ? 'Failed to submit' : ''),
    description: description ?? 'Please try again later',
  })
}

export const toastSuccess = (
  toast: ToasterReturn,
  message: string,
  heading = ''
): void => {
  toast.success({ title: heading, description: message })
}

// ---------- Stock / cart helpers ----------

export const getDeliveredQuantity = (
  item: TransactionItem,
  isStockTransfer: boolean,
  supplierId: string
): number => {
  if (!item.itemsDelivered) return 0
  if (isStockTransfer && supplierId !== sessionStorage.getItem('selectedShop')) {
    return item.itemsReceived?.reduce((sum, d) => sum + d.quantity, 0) ?? 0
  }
  return item.itemsDelivered.reduce((sum, d) => sum + d.quantity, 0)
}

export const getOriginalRemainingQuantity = (
  item: TransactionItem,
  isStockTransfer: boolean,
  supplierId: string
): number => {
  const delivered = getDeliveredQuantity(item, isStockTransfer, supplierId)
  return (item.quantity || 0) - delivered
}

const getCartQuantity = (itemId: string, cart: CartItem[]): number => {
  const cartItem = cart.find((c) => c.id === itemId)
  return cartItem?.receivingQuantity ?? 0
}

export const getRemainingQuantity = (
  item: TransactionItem,
  isStockTransfer: boolean,
  supplierId: string,
  cart: CartItem[]
): number => {
  const original = getOriginalRemainingQuantity(item, isStockTransfer, supplierId)
  const inCart = getCartQuantity(item.id || item.itemId, cart)
  return original - inCart
}

// lib/storage.ts
export const sessionStore = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch {}
  },
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

export const localStore = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};

// 1. Replace unwrapItems with this exact version (matches your confirmed flat shape):
export const unwrapItems = <T,>(response: any): { items: T[]; total: number; pages: number } => {
  // axios response: response.data is the body
  const body = response?.data ?? response;

  // Flat paginated shape (your case):
  // { items: [...], totalCount: 12, page: 1, pageSize: 10, totalPages: 2, ... }
  if (body && Array.isArray(body.items)) {
    const items = body.items as T[];
    const total =
      typeof body.totalCount === "number" ? body.totalCount : items.length;
    const pages =
      typeof body.totalPages === "number" ? body.totalPages : 1;
    return { items, total, pages };
  }

  // Legacy plain array
  if (Array.isArray(body)) {
    return { items: body as T[], total: body.length, pages: 1 };
  }

  // Double-wrapped (future-proof, just in case)
  if (body && body.data) {
    return unwrapItems({ data: body.data });
  }

  return { items: [], total: 0, pages: 0 };
};

export const SETTINGS_CACHE_KEY = "locationSettigs";

export function readCachedSettings (): SystemSettings | null {
  try {
    const raw = sessionStore.get(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SystemSettings;
    //if (parsed?.locationId !== locationId && parsed.locationId != "") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export function filterByDateRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

  return transactions.filter((t) => {
    const d = new Date(t.transactionDate).getTime();
    return d >= start && d <= end;
  });
}

// ─────────────────────────────────────────────────────────
// Normalization — your backend types vs your TS union
// ─────────────────────────────────────────────────────────

/**
 * Map the backend's transaction type to a canonical bucket.
 * Adjust this once you know what the backend actually returns.
 */
export function normalizeType(type: string): 'sale' | 'purchase' | 'transfer' | 'deposit' | 'other' {
  const t = (type || '').toUpperCase();
  if (t === 'SALE' || t === 'CREDIT_SALE') return 'sale';
  if (t === 'PURCH' || t === 'PURCHASE' || t === 'CREDIT_PURCHASE') return 'purchase';
  if (t === 'TRAN' || t === 'TRANSFER') return 'transfer';
  if (t === 'DEPO' || t === 'DEPOSIT') return 'deposit';
  return 'other';
}

export function partnerName(t: Transaction): string {
  const bucket = normalizeType(t.type);
  if (bucket === 'sale') return t.customerName ?? '';
  if (bucket === 'purchase') return t.supplierName ?? '';
  return '';
}

export function partnerId(t: Transaction): string {
  const bucket = normalizeType(t.type);
  if (bucket === 'sale') return t.customerId ?? '';
  if (bucket === 'purchase') return t.supplierId ?? '';
  return '';
}

// ─────────────────────────────────────────────────────────
// Payment helpers
// ─────────────────────────────────────────────────────────

function paymentsOf(t: Transaction): TransactionPayment[] {
  return t.payments ?? [];
}

export function sumCoupon(t: Transaction): number {
  return paymentsOf(t).reduce((s, p) => s + (p.coupon?.amount ?? 0), 0);
}

export function sumPayments(t: Transaction): number {
  return paymentsOf(t).reduce((s, p) => s + p.amount, 0);
}

export function sumItems(t: Transaction): number {
  return (t.items ?? []).reduce((s, i) => s + i.quantity, 0);
}

// ─────────────────────────────────────────────────────────
// Status buckets
// ─────────────────────────────────────────────────────────

export type StatusBucket = 'pending' | 'approved' | 'declined';

export function statusBucket(status?: number): StatusBucket | null {
  if (status === 1) return 'pending';
  if (status === 3) return 'approved';
  if (status === -1 || status === -2) return 'declined';
  return null;
}

export interface StatusBreakdown {
  pending: { count: number; amount: number };
  approved: { count: number; amount: number };
  declined: { count: number; amount: number };
}

export function buildStatusBreakdown(transactions: Transaction[]): StatusBreakdown {
  const result: StatusBreakdown = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    declined: { count: 0, amount: 0 },
  };

  for (const t of transactions) {
    const bucket = statusBucket(t.statusNumber);
    if (!bucket) continue;
    result[bucket].count += 1;
    result[bucket].amount += t.totalAmount;
  }

  return result;
}

// ─────────────────────────────────────────────────────────
// SALE delivery split
// ─────────────────────────────────────────────────────────

export function salesDeliverySplit(transactions: Transaction[]): {
  delivered: { count: number; amount: number };
  pending: { count: number; amount: number };
} {
  const result = {
    delivered: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
  };

  for (const t of transactions) {
    if (normalizeType(t.type) !== 'sale') continue;

    const deliveries = (t.items ?? []).flatMap((i) =>
      (i.itemsDelivered ?? []).filter(
        (d) => d.transactionDeliveryRequestId && d.transactionDeliveryRequestId !== ''
      )
    );

    if (deliveries.length === 0) {
      result.pending.count += 1;
      result.pending.amount += t.totalAmount;
      continue;
    }

    const allDelivered = deliveries.every((d) => d.isDelivered === true);
    if (allDelivered) {
      result.delivered.count += 1;
      result.delivered.amount += t.totalAmount;
    } else {
      result.pending.count += 1;
      result.pending.amount += t.totalAmount;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────
// Payment methods
// ─────────────────────────────────────────────────────────

export interface NameValue {
  name: string;
  value: number;
}

export function paymentMethodBreakdown(transactions: Transaction[]): NameValue[] {
  const map = new Map<string, number>();

  for (const t of transactions) {
    for (const p of paymentsOf(t)) {
      const key = p.paymentMethodName || `Method ${p.paymentMethod}`;
      map.set(key, (map.get(key) ?? 0) + p.amount);
    }
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ─────────────────────────────────────────────────────────
// Bar chart aggregators
// ─────────────────────────────────────────────────────────

export interface PartnerStat {
  id: string;
  name: string;
  value: number;
}

function aggregateByPartner(
  transactions: Transaction[],
  bucket: 'sale' | 'purchase',
  valueOf: (t: Transaction) => number,
  limit = 20
): PartnerStat[] {
  const map = new Map<string, { name: string; value: number }>();

  for (const t of transactions) {
    if (normalizeType(t.type) !== bucket) continue;
    const v = valueOf(t);
    if (!Number.isFinite(v) || v <= 0) continue;

    const id = partnerId(t);
    const name = partnerName(t);
    if (!id) continue;

    const existing = map.get(id);
    if (existing) existing.value += v;
    else map.set(id, { name, value: v });
  }

  return Array.from(map.entries())
    .map(([id, v]) => ({ id, name: v.name, value: v.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function topCustomersNetSales(t: Transaction[], limit = 20) {
  return aggregateByPartner(t, 'sale', (x) => x.totalAmount - sumCoupon(x), limit);
}

export function topCustomersCoupons(t: Transaction[], limit = 20) {
  return aggregateByPartner(t, 'sale', sumCoupon, limit);
}

export function topCustomersPendingDebts(t: Transaction[], limit = 20) {
  return aggregateByPartner(
    t, 'sale',
    (x) => x.totalAmount - (sumPayments(x) + sumCoupon(x)),
    limit
  );
}

export function topSuppliersPurchases(t: Transaction[], limit = 20) {
  return aggregateByPartner(t, 'purchase', (x) => x.totalAmount, limit);
}

export function topSuppliersDebts(t: Transaction[], limit = 20) {
  return aggregateByPartner(
    t, 'purchase',
    (x) => x.totalAmount - (sumPayments(x) + sumCoupon(x)),
    limit
  );
}