'use client'
// components/Receipt.tsx
import React, { useRef, useEffect } from 'react';
import { Transaction } from '@/lib/types';

interface ReceiptProps {
  transaction: Transaction;
  onClose?: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ transaction, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getChange = () => {
    return transaction.paidAmount - transaction.totalAmount;
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `Receipt-${transaction.transactionCode}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the receipt');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.transactionCode}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 5mm;
              line-height: 1.3;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .store-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .divider-solid {
              border-top: 1px solid #000;
              margin: 8px 0;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .item-details {
              flex: 1;
            }
            .item-name {
              font-size: 11px;
            }
            .item-meta {
              font-size: 10px;
              color: #666;
              margin-left: 10px;
            }
            .totals {
              margin-top: 10px;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .grand-total {
              font-size: 14px;
              font-weight: bold;
              margin-top: 5px;
              padding-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
            }
            .payment-details {
              margin: 10px 0;
            }
            .text-right {
              text-align: right;
            }
            .thankyou {
              text-align: center;
              margin: 15px 0;
              font-size: 12px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    printWindow.onafterprint = () => {
      printWindow.close();
      document.title = originalTitle;
      if (onClose) onClose();
    };

    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Receipt Preview</h2>
          <div className="space-x-2">
            <button
              onClick={handlePrint}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
        
        <div ref={receiptRef} className="p-4" style={{ fontFamily: "'Courier New', monospace" }}>
          {/* Receipt Content */}
          <div className="header">
            <div className="store-name">YOUR STORE NAME</div>
            <div>123 Main Street</div>
            <div>City, State 12345</div>
            <div>Tel: (555) 123-4567</div>
            <div className="divider"></div>
            <div>RECEIPT</div>
            <div className="divider"></div>
          </div>

          <div>
            <div>Date: {formatDate(transaction.transactionDate)}</div>
            <div>Receipt #: {transaction.transactionCode}</div>
            <div>Transaction ID: {transaction.transactionId}</div>
            {transaction.customerId && <div>Customer ID: {transaction.customerId}</div>}
            {transaction.supplierName && <div>Supplier: {transaction.supplierName}</div>}
            <div className="divider"></div>
          </div>

          <div>
            <div className="flex justify-between font-bold mb-2">
              <span>ITEM</span>
              <span>QTY</span>
              <span>PRICE</span>
              <span>TOTAL</span>
            </div>
            {transaction.items.map((item, idx) => (
              <div key={idx} className="receipt-item">
                <div className="item-details">
                  <div className="item-name">{item.itemName}</div>
                  <div className="item-meta">Code: {item.code}</div>
                </div>
                <div className="text-right" style={{ minWidth: '100px' }}>
                  <div className="flex justify-between gap-2">
                    <span>{item.quantity}</span>
                    <span>x {formatMoney(item.unitPrice)}</span>
                    <span>= {formatMoney(item.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <div className="totals">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>{formatMoney(transaction.totalAmount)}</span>
            </div>
            {transaction.discountCode && (
              <div className="total-line">
                <span>Discount ({transaction.discountCode}):</span>
                <span>-{formatMoney(0)}</span>
              </div>
            )}
            <div className="total-line">
              <span>Tax:</span>
              <span>{formatMoney(0)}</span>
            </div>
            <div className="divider"></div>
            <div className="total-line grand-total">
              <span>TOTAL:</span>
              <span>{formatMoney(transaction.totalAmount)}</span>
            </div>
            <div className="total-line">
              <span>Paid:</span>
              <span>{formatMoney(transaction.paidAmount)}</span>
            </div>
            <div className="total-line">
              <span>Change:</span>
              <span>{formatMoney(getChange())}</span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="payment-details">
            <div>Payment Status: {transaction?.status?.toUpperCase()}</div>
            {transaction.notes && <div>Notes: {transaction.notes}</div>}
          </div>

          <div className="thankyou">
            THANK YOU!
          </div>

          <div className="footer">
            <div>No refunds or exchanges without receipt</div>
            <div>Visit us again!</div>
            <div className="divider-solid"></div>
            <div>Powered by YourPOS System</div>
          </div>
        </div>
      </div>
    </div>
  );
};