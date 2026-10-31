// config.ts (or AppConfig.ts — wherever this file lives)

import { SystemSettings } from "@/app/settings/page";
import { readCachedSettings, sessionStore } from "@/helpers/formatStrings";
import { IdAndName } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Transaction type constants
// ─────────────────────────────────────────────────────────────────────────────
export const TransactionTypes = {
  SALE: "SALE",
  PURC: "PURCH", // purchase
  ADJS: "ADJUS", // stock adjustment
  STCK: "STOCK",  //stock tacke
  TRAN: "TRANS", // stock transfer
  DEPO: "DEPO", // financial deposit
  SLP:  "SALA", // salary payment
  MISC: "MISC", // miscellaneous
  SREV: "SREV", // sale reversal
  PREV: "PREV", // purchase reversal
  TREV: "TREV",
  GIFT: "GIFT",
} as const;

/** The shape of the `TransactionTypes` object — keys + readonly literal values. */
export type TransactionTypesMap = typeof TransactionTypes;

/** Union of all numeric transaction codes: 1 | 2 | 3 | ... | 11 */
export type TransactionType = TransactionTypesMap[keyof TransactionTypesMap];

// ─────────────────────────────────────────────────────────────────────────────
// App configuration interface
// ─────────────────────────────────────────────────────────────────────────────
interface AppConfiguration {
  //qrCodePrinterSize?: number;
  // barCodePrinterSize?: number;
  paymentMethods?: IdAndName[];
  categories: IdAndName[];
  unitOfMeasurements: IdAndName[];
  transactionTypes: TransactionTypesMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static lists
// ─────────────────────────────────────────────────────────────────────────────
export const paymentMethods: IdAndName[] = [
   { name: "Cash", id: 1 },
  { name: "Mobile Money", id: 2 },
  { name: "Cheque", id: 3 },
  { name: "Bank Transfer", id: 4 },
  { name: "Other", id: 5 },
];

export const CATEGORIES: IdAndName[] = [
  { name: 'Academics', id: "1" },
  { name: 'Edible',    id: "2" },
  // { name: 'Tech',   id: "3" },
  { name: 'Apparel',   id: "4" },
  { name: 'Product',   id: "5" },
  { name: 'Tool',      id: "6" },
  { name: 'Device',    id: "7" },
  { name: 'Other',     id: "8" },
];

export const UNITS: IdAndName[] = [
  { name: 'Piece',   id: "1" },
  { name: 'Box',     id: "2" },
  { name: 'Set',     id: "3" },
  { name: 'Pack',    id: "4" },
  { name: 'Liter',   id: "5" },
  { name: 'Yard',    id: "6" },
  { name: 'Meters',  id: "7" },
  { name: 'Feet',    id: "8" },
  { name: 'Tonnage', id: "9" },
  { name: 'Bag',     id: "10" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Runtime configuration
// ─────────────────────────────────────────────────────────────────────────────
export const config: AppConfiguration = {
  paymentMethods,
  unitOfMeasurements: UNITS,
  categories: CATEGORIES,
  transactionTypes: TransactionTypes,
};

export const settings: SystemSettings | null = readCachedSettings(sessionStore.get("selectedShop") || "")

// ─────────────────────────────────────────────────────────────────────────────
// Public (unauthenticated) routes
// ─────────────────────────────────────────────────────────────────────────────
export const publicPaths = [
  '/',
  '/auth',
  '/auth/login',
  'auth/signup',
  '/account/confirmation',
];