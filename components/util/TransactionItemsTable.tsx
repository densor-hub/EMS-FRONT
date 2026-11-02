// components/util/TransactionItemsTable.tsx
'use client';

import React from 'react';
import { formatNumberWithCommas, readCachedSettings } from '@/helpers/formatStrings';
import { TransactionItem, TransactionItemsDelivered } from '@/lib/types';
import { config, settings } from './AppConfig';

export interface TransactionItemsTableProps {
  items: TransactionItem[];
  totalAmount: number;
  transactionType?: string; // Determines the label for delivered/received
  showCode?: boolean;
  className?: string;
  minWidth?: string;
}

export function TransactionItemsTable({
  items,
  totalAmount,
  transactionType = config.transactionTypes.SALE,
  showCode = false,
  className = '',
  minWidth = '600px',
}: TransactionItemsTableProps) {
  const deliveredLabel =
    transactionType === config.transactionTypes.PURC ? 'Receivals' : 'Deliveries';

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-gray-500 text-sm sm:text-base">No items found for this transaction</p>
      </div>
    );
  }

  // Calculate delivered quantity
  const getDeliveredQuantity = (item: TransactionItem): number => {
    return (
      item?.itemsDelivered?.reduce(
        (sum: number, el: TransactionItemsDelivered) => sum + (el?.quantity || 0),
        0
      ) || 0
    );
  };

  // Calculate reversed quantity
  const getReversedQuantity = (item: TransactionItem): number => {
    return (
      item?.itemsDelivered?.reduce(
        (sum: number, el: TransactionItemsDelivered) =>
          sum +
          (el?.itemReversals?.reduce(
            (calc: number, reversal: any) => calc + (reversal?.quantity || 0),
            0
          ) || 0),
        0
      ) || 0
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ✅ Mobile: stacked card list — wraps naturally, no horizontal scroll */}
      <div className="sm:hidden space-y-2">
        {items.map((item: TransactionItem, index: number) => (
          <div key={item.id || index} className="border rounded-lg p-3 bg-white space-y-2">
            <p className="text-sm font-semibold break-words">{item.name || item.itemName}</p>
            {showCode && item.code && (
              <p className="text-xs text-muted-foreground break-all">{item.code}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Ordered:{' '}
                <span className="font-semibold text-foreground">
                  {formatNumberWithCommas(item?.quantity?.toString() || '0')}
                </span>
              </span>
              <span>
                {deliveredLabel}:{' '}
                <span className="font-semibold text-foreground">
                  {formatNumberWithCommas(getDeliveredQuantity(item).toString())}
                </span>
              </span>
              <span>
                Reversed:{' '}
                <span className="font-semibold text-foreground">
                  {formatNumberWithCommas(getReversedQuantity(item).toString())}
                </span>
              </span>
              <span>
                Price:{' '}
                <span className="font-semibold text-foreground">
                  {formatNumberWithCommas(item.unitPrice?.toFixed(2) || '0.00')}
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t">
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-primary">
                {readCachedSettings()?.currency}{' '}
                {formatNumberWithCommas(
                  ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)
                )}
              </span>
            </div>
          </div>
        ))}
        {/* Total not shown here on mobile — it's in the header (TransactionDetailsTabs) */}
      </div>

      {/* ✅ Desktop: unchanged table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className={`w-full min-w-[${minWidth}]`}>
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-200">
              <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item</th>
              {showCode && (
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
              )}
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Ordered</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">
                {deliveredLabel}
              </th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Reversals</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Price</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: TransactionItem, index: number) => (
              <tr
                key={item.id || index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                  {item.name || item.itemName}
                </td>
                {showCode && (
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">
                    {item.code || '-'}
                  </td>
                )}
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(item?.quantity?.toString() || '0')}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(getDeliveredQuantity(item).toString())}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(getReversedQuantity(item).toString())}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(item.unitPrice?.toFixed(2) || '0.00')}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">
                  {formatNumberWithCommas(
                    ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="w-full text-left">
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td></td>
              <td
                colSpan={showCode ? 5 : 4}
                className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm"
              >
                Total
              </td>
              <td className="p-2 sm:p-3 text-right font-bold text-primary text-xs sm:text-sm">
                {`${readCachedSettings()?.currency}`}{' '}
                {formatNumberWithCommas(totalAmount?.toFixed(2) || '0.00')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default TransactionItemsTable;