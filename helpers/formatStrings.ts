// helpers/formatStrings.ts
import type { CartItem, TransactionItem } from '@/lib/types'
import type { ToasterReturn } from '@/components/util/CustomToast'

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