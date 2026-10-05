// components/util/TransactionDetailsTabs.tsx
'use client';

import React, { Dispatch, SetStateAction, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, CreditCard, Truck, RotateCcw, Plus } from 'lucide-react';
import { alphaNumericDate, formatNumberWithCommas } from '@/helpers/formatStrings';
import { IdAndName, TransactionItem } from '@/lib/types';
import TransactionItemsTable from './TransactionItemsTable';
import { config } from './AppConfig';
import StatusBadge from '../ui/statusbadge';
import AddPayment from '@/app/purchases/addPayments';

interface Payment {
  paymentDate: string;
  paymentMethod: number;
  amount: number;
  coupon?: { amount: number };
  remarks?: string;
}

interface TransactionDetails {
  items: TransactionItem[];
  totalAmount: number;
  payments?: Payment[];
  transactionDate?: string;
  transactionCode?: string;
}

interface TransactionDetailsTabsProps {
  transactionDetails: Partial<TransactionDetails>;
  activeTab : 'items'| 'payments' | 'deliveries' | 'reversals' | string  ,
  setActiveTab: Dispatch<SetStateAction<'items'| 'payments' | 'deliveries' | 'reversals' | string>>
  selectedTransaction: {
    transactionCode?: string;
    transactionDate?: string;
    supplierId?: string;
    customerName?: string;
  };

  transactionType: 'sale' | 'purchase';
  businessPartnerName: string;
  paymentMethods: IdAndName[] | undefined;
  onAddPayment?: () => void;
  onAddDelivery?: () => void;
  loading?: boolean;
  showItemsCode?: boolean;
  itemsTableMinWidth?: string;
}

export function TransactionDetailsTabs({
  transactionDetails,
  selectedTransaction,
  transactionType,
  businessPartnerName,
  paymentMethods,
  onAddPayment,
  onAddDelivery,
  loading = false,
  showItemsCode = false,
  itemsTableMinWidth = '600px',
  setActiveTab,
  activeTab = 'items'
}: TransactionDetailsTabsProps) {
  //const [activeTab, setActiveTab] = useState<string>('items');
  const [paymentStartDate, setPaymentStartDate] = useState<string>('');
  const [paymentEndDate, setPaymentEndDate] = useState<string>('');
  const [deliveryStartDate, setDeliveryStartDate] = useState<string>('');
  const [deliveryEndDate, setDeliveryEndDate] = useState<string>('');
  const [filterItem, setFilterItem] = useState<string>('all');
  const [reversalStartDate, setReversalStartDate] = useState<string>("");
  const [reversalEndDate, setReversalEndDate] = useState<string>("");

  const details = transactionDetails;
  if (!details) return null;

  const isPurchase = transactionType === 'purchase';

  const renderPaymentsTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    const totalPaid = details?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    const remainingBalance = (details.totalAmount || 0) - totalPaid;

    
    const totalPayments = details?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    const totalDiscount = details?.payments?.reduce((sum: number, p: any) => sum + (p.coupon?.amount || 0), 0) || 0;

    // Filter payments by date
    const filteredPayments = details?.payments?.filter((payment: any) => {
      if (paymentStartDate || paymentEndDate) {
        const paymentDate = new Date(payment.paymentDate);
        const start = new Date(paymentStartDate);
        const end = new Date(paymentEndDate);
        if (paymentStartDate && !paymentEndDate) return paymentDate >= start;
        if (paymentEndDate && !paymentStartDate) return paymentDate <= end;
        return paymentDate >= start && paymentDate <= end;
      }
      return true;
    }) || [];

    return (
       <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-[10px] sm:text-sm text-gray-600">Amount</p>
            <p className="text-xs sm:text-sm font-bold text-primary">{formatNumberWithCommas(details.totalAmount?.toFixed(2) || '0.00')}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-[10px] sm:text-sm text-gray-600">Payments</p>
            <p className="text-xs sm:text-sm font-bold text-green-600">{formatNumberWithCommas(totalPayments.toFixed(2))}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-[10px] sm:text-sm text-gray-600">Discount</p>
            <p className="text-xs sm:text-sm font-bold text-blue-600">{formatNumberWithCommas(totalDiscount.toFixed(2))}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
             {remainingBalance <= 0 ? <p className="text-[10px] sm:text-sm text-gray-600">Balance</p> : <p className="text-[10px] sm:text-sm text-gray-600">Debt</p>}
            {remainingBalance <= 0 ? <p className="text-xs sm:text-sm font-bold text-blue-600">{formatNumberWithCommas(remainingBalance.toFixed(2))}</p> : 
            <p className="text-xs sm:text-sm font-bold text-red-600">{formatNumberWithCommas(remainingBalance.toFixed(2))}</p> }
          </div>
        </div>

        {/* Date Filter - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">From Date</Label>
              <Input
                type="date"
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                min={selectedTransaction?.transactionDate?.split('T')[0]}
                max={paymentEndDate}
              />
            </div>
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">To Date</Label>
              <Input
                type="date"
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                min={paymentStartDate || selectedTransaction?.transactionDate?.split('T')[0]}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPaymentStartDate("");
              setPaymentEndDate("");
            }}
            className="w-full sm:w-auto text-xs sm:text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            ✕ Clear Filter
          </Button>
          {(paymentEndDate || paymentStartDate) && (
            <div className="p-2 sm:p-3 text-right text-xs sm:text-sm">
              Filtered Total: <span className='font-bold'>
                {formatNumberWithCommas(filteredPayments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2))}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Payment Date</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Method</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">Remarks</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Amount {`${config?.currency}`}</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Discount {`${config?.currency}`}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.sort((a, b) => a.paymentDate?.localeCompare(b.paymentDate)).map((payment: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">{alphaNumericDate(payment.paymentDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">
                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-medium">
                      {paymentMethods?.find(x => x.id === payment.paymentMethod)?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{payment.remarks || '-'}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold"> {formatNumberWithCommas(payment.amount.toFixed(2))}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold text-blue-600">
                     {formatNumberWithCommas(payment.coupon?.amount?.toFixed(2) || '0.00')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={3} className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm">Total Paid</td>
                <td className="p-2 sm:p-3 text-right font-bold text-green-600 text-xs sm:text-sm">
                   {formatNumberWithCommas(filteredPayments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2))}
                </td>
                <td className="p-2 sm:p-3 text-right font-bold text-blue-600 text-xs sm:text-sm">
                  {formatNumberWithCommas(filteredPayments.reduce((sum: number, p: any) => sum + (p.coupon?.amount || 0), 0).toFixed(2))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Render deliveries tab content
  const renderDeliveriesTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    // Collect all deliveries from items
    let allDeliveries: any[] = [];
    details?.items?.forEach((item: any) => {
      if (item.itemsDelivered && item.itemsDelivered.length > 0) {
        item.itemsDelivered.forEach((delivery: any) => {
          allDeliveries.push({
            itemName: item.name || item.itemName,
            itemCode: item.code,
            deliveryDate: delivery.deliveryDate,
            quantity: delivery.quantity,
            deliveredQuantity: delivery.quantity,
            deliveryId: delivery.deliveryId,
            reversals: delivery.itemReversals || [],
            batchId: delivery?.batchId,
            itemId: item.id,
            status: delivery?.status
          });
        });
      }
    });

    // Filter deliveries by date
    allDeliveries = allDeliveries.filter((delivery) => {
      if (deliveryStartDate || deliveryEndDate) {
        const deliveryDate = new Date(delivery.deliveryDate);
        const start = new Date(deliveryStartDate);
        const end = new Date(deliveryEndDate);
        if (deliveryStartDate && !deliveryEndDate) return deliveryDate >= start;
        if (deliveryEndDate && !deliveryStartDate) return deliveryDate <= end;
        return deliveryDate >= start && deliveryDate <= end;
      }
      return true;
    });

    // Filter deliveries by item
    if (filterItem && filterItem !== 'all') {
      allDeliveries = allDeliveries.filter(delivery => delivery.itemId === filterItem);
    }

    if (allDeliveries.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <Truck className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300" />
          <p className="text-gray-500 mt-2 text-sm sm:text-base">No deliveries recorded for this transaction</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Date Filter - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex flex-row gap-2 w-full sm:w-auto">
              <div className="space-y-1 flex-1 sm:flex-none">
                <Label className="text-xs sm:text-sm">From Date</Label>
                <Input
                  type="date"
                  value={deliveryStartDate}
                  onChange={(e) => setDeliveryStartDate(e.target.value)}
                  className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                  min={selectedTransaction?.transactionDate?.split('T')[0]}
                  max={deliveryEndDate}
                />
              </div>
              <div className="space-y-1 flex-1 sm:flex-none">
                <Label className="text-xs sm:text-sm">To Date</Label>
                <Input
                  type="date"
                  value={deliveryEndDate}
                  onChange={(e) => setDeliveryEndDate(e.target.value)}
                  className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                  min={deliveryStartDate || selectedTransaction?.transactionDate?.split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-1 w-full sm:w-[200px]">
              <Label className="text-xs sm:text-sm">Select Item</Label>
              <Select value={filterItem} onValueChange={setFilterItem}>
                <SelectTrigger className="bg-white border-border w-full text-xs sm:text-sm h-9">
                  <SelectValue placeholder="Select Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {transactionDetails?.items?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm">{item.name}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">{item.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDeliveryStartDate("");
              setDeliveryEndDate("");
              setFilterItem("all");
            }}
            className="w-full sm:w-auto text-xs sm:text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            ✕ Clear Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item Name</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Status</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">
                  {isPurchase ? 'Receival Date' : 'Delivery Date'}
                </th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {allDeliveries.sort((a, b) => a.deliveryDate?.localeCompare(b.deliveryDate)).map((delivery, index) => (
                <tr key={delivery.deliveryId || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{delivery.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{delivery.itemCode}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600" ><StatusBadge className='p-0 h-[20px]'  status={delivery.status} heartbeat={false}/></td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{alphaNumericDate(delivery.deliveryDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">
                    {formatNumberWithCommas(delivery.quantity?.toString() || '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='flex flex-wrap justify-end gap-2 sm:gap-4 text-xs sm:text-sm'>
          <p>{isPurchase ? 'Receivals' : 'Deliveries'}: <span className='font-semibold'>
            {(new Set(allDeliveries.map(x => x?.batchId))).size}
          </span></p>
          <p>{isPurchase ? 'Received' : 'Delivered'} Qty: <span className='font-semibold'>
            {allDeliveries.reduce((sum, r) => sum + r.quantity, 0)}
          </span></p>
        </div>
      </div>
    );
  };

  // Render reversals tab content
  const renderReversalsTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    // Collect all reversals from deliveries
    let allReversals: any[] = [];
    details?.items?.forEach((item: any) => {
      if (item.itemsDelivered && item.itemsDelivered.length > 0) {
        item.itemsDelivered.forEach((delivery: any) => {
          if (delivery.itemReversals && delivery.itemReversals.length > 0) {
            delivery.itemReversals.forEach((reversal: any) => {
              allReversals.push({
                itemName: item.name || item.itemName,
                itemCode: item.code,
                reversalDate: reversal.reversalDate,
                quantity: reversal.quantity,
                deliveryId: delivery.deliveryId,
                reversalId: reversal.reversalId,
                itemId: item.id
              });
            });
          }
        });
      }
    });

    // Filter reversals by date
    allReversals = allReversals.filter((reversal) => {
      if (reversalStartDate || reversalEndDate) {
        const reversalDate = new Date(reversal.reversalDate);
        const start = new Date(reversalStartDate);
        const end = new Date(reversalEndDate);
        if (reversalStartDate && !reversalEndDate) return reversalDate >= start;
        if (reversalEndDate && !reversalStartDate) return reversalDate <= end;
        return reversalDate >= start && reversalDate <= end;
      }
      return true;
    });

    // Filter reversals by item
    if (filterItem && filterItem !== 'all') {
      allReversals = allReversals.filter(reversal => reversal.itemId === filterItem);
    }

    if (allReversals.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <RotateCcw className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300" />
          <p className="text-gray-500 mt-2 text-sm sm:text-base">No reversals recorded for this transaction</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Reversals</p>
            <p className="text-base sm:text-xl font-bold">{allReversals.length}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Items Reversed</p>
            <p className="text-base sm:text-xl font-bold">
              {allReversals.reduce((sum, r) => sum + r.quantity, 0)}
            </p>
          </div>
        </div>

        {/* Date Filter - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex flex-row gap-2 w-full sm:w-auto">
              <div className="space-y-1 flex-1 sm:flex-none">
                <Label className="text-xs sm:text-sm">From Date</Label>
                <Input
                  type="date"
                  value={reversalStartDate}
                  onChange={(e) => setReversalStartDate(e.target.value)}
                  className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                  min={selectedTransaction?.transactionDate?.split('T')[0]}
                  max={reversalEndDate}
                />
              </div>
              <div className="space-y-1 flex-1 sm:flex-none">
                <Label className="text-xs sm:text-sm">To Date</Label>
                <Input
                  type="date"
                  value={reversalEndDate}
                  onChange={(e) => setReversalEndDate(e.target.value)}
                  className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                  min={reversalStartDate || selectedTransaction?.transactionDate?.split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-1 w-full sm:w-[200px]">
              <Label className="text-xs sm:text-sm">Select Item</Label>
              <Select value={filterItem} onValueChange={setFilterItem}>
                <SelectTrigger className="bg-white border-border w-full text-xs sm:text-sm h-9">
                  <SelectValue placeholder="Select Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {transactionDetails?.items?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm">{item.name}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">{item.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReversalStartDate("");
              setReversalEndDate("");
              setFilterItem("all");
            }}
            className="w-full sm:w-auto text-xs sm:text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            ✕ Clear Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item Name</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">Reversal Date</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {allReversals.map((reversal, index) => (
                <tr key={reversal.reversalId || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{reversal.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{reversal.itemCode}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{alphaNumericDate(reversal.reversalDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold text-red-600">
                    {formatNumberWithCommas(reversal.quantity?.toString() || '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full px-2 sm:px-4">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-col sm:flex-col lg:flex-row justify-between items-start sm:items-center gap-3">
          <div className="w-full sm:w-auto">
            <h2 className="text-sm sm:text-xl font-bold text-gray-800 break-words">
              {businessPartnerName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
              <span className="text-xs sm:text-sm text-gray-600">
                Transaction: <span className="font-semibold">{selectedTransaction.transactionCode}</span>
              </span>
              <span className="text-xs sm:text-sm text-gray-600">
                Date: <span className="font-semibold">{alphaNumericDate(selectedTransaction.transactionDate || '')}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
           {onAddPayment != null && <Button
              variant="outline"
              size="sm"
              onClick={onAddPayment}
              className="flex-1 sm:flex-none bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Payment
            </Button>}
            {onAddDelivery != null && <Button
              variant="outline"
              size="sm"
              onClick={onAddDelivery}
              className="flex-1 sm:flex-none bg-purple-500 text-white hover:bg-purple-600 text-xs sm:text-sm"
            >
              <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {isPurchase ? 'Receive' : 'Delivery'}
            </Button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full"> 
          <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 bg-emerald-200 overflow-x-auto">
            <TabsTrigger value="items" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Items</span>
              <span className="sm:hidden">Items</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:block">{isPurchase ? 'Receivals' : 'Deliveries'}</span>
              <span className="sm:hidden">{isPurchase ? 'Rec' : 'Del'}</span>
            </TabsTrigger>
            <TabsTrigger value="reversals" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Reversals</span>
              <span className="sm:hidden">Rev</span>
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <TabsContent value="items" className="mt-0">
                <TransactionItemsTable
                  items={details?.items || []}
                  totalAmount={details?.totalAmount || 0}
                  transactionType={transactionType}
                  showCode={showItemsCode}
                  minWidth={itemsTableMinWidth}
                />
              </TabsContent>
              <TabsContent value="payments" className="mt-0">
                {renderPaymentsTab()}
              </TabsContent>
              <TabsContent value="deliveries" className="mt-0">
                {renderDeliveriesTab()}
              </TabsContent>
              <TabsContent value="reversals" className="mt-0"> 
                {renderReversalsTab()}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default TransactionDetailsTabs;