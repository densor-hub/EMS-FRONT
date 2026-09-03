// components/util/TransactionItemsTable.tsx
'use client';

import React from 'react';
import { formatNumberWithCommas } from '@/helpers/formatStrings';
import { TransactionItem, TransactionItemsDelivered } from '@/lib/types';
import { config } from './AppConfig';

export interface TransactionItemsTableProps {
  items: TransactionItem[];
  totalAmount: number;
  transactionType?: 'sale' | 'purchase'; // Determines the label for delivered/received
  showCode?: boolean;
  className?: string;
  minWidth?: string;
}

export function TransactionItemsTable({
  items,
  totalAmount,
  transactionType = 'sale',
  showCode = false,
  className = '',
  minWidth = '600px',
}: TransactionItemsTableProps) {
  const deliveredLabel = transactionType === 'purchase' ? 'Received' : 'Delivered';

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-gray-500 text-sm sm:text-base">No items found for this transaction</p>
      </div>
    );
  }

  // Calculate delivered quantity
  const getDeliveredQuantity = (item: TransactionItem): number => {
    return item?.itemsDelivered?.reduce(
      (sum: number, el: TransactionItemsDelivered) => sum + (el?.quantity || 0),
      0
    ) || 0;
  };

  // Calculate reversed quantity
  const getReversedQuantity = (item: TransactionItem): number => {
    return item?.itemsDelivered?.reduce(
      (sum: number, el: TransactionItemsDelivered) => 
        sum + (el?.itemReversals?.reduce(
          (calc: number, reversal: any) => calc + (reversal?.quantity || 0),
          0
        ) || 0),
      0
    ) || 0;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[${minWidth}]`}>
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-200">
              <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item</th>
              {showCode && (
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
              )}
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Ordered</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">{deliveredLabel}</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Reversed</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Price</th>
              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: TransactionItem, index: number) => (
              <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{item.name || item.itemName}</td>
                {showCode && (
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{item.code || '-'}</td>
                )}
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(item?.quantity?.toString() || '0')}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(getDeliveredQuantity(item).toString())}
                  {/* <span>{item?.itemsDelivered?.find(x=> x.s)}</span> */}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(getReversedQuantity(item).toString())}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                  {formatNumberWithCommas(item.unitPrice?.toFixed(2) || '0.00')}
                </td>
                <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">
                  {formatNumberWithCommas((item.quantity * item.unitPrice)?.toFixed(2) || '0.00')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className=' w-full text-left'>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td></td>
              <td colSpan={showCode ? 5 : 4} className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm" >
                Total
              </td>
              <td className="p-2 sm:p-3 text-right font-bold text-primary text-xs sm:text-sm" >
                {`${config.currency}`} {formatNumberWithCommas(totalAmount?.toFixed(2) || '0.00')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default TransactionItemsTable;