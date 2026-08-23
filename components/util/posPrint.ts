'use client'

import { Transaction } from "@/lib/types";
// utils/posPrint.ts
export interface PrintSettings {
  printerName?: string;
  copies?: number;
}

// ESC/POS Commands
const ESC_POS = {
  INIT: '\x1B\x40',           // Initialize printer
  BOLD_ON: '\x1B\x45\x01',    // Bold on
  BOLD_OFF: '\x1B\x45\x00',   // Bold off
  ALIGN_LEFT: '\x1B\x61\x00', // Left align
  ALIGN_CENTER: '\x1B\x61\x01', // Center align
  ALIGN_RIGHT: '\x1B\x61\x02',  // Right align
  FONT_SIZE_NORMAL: '\x1D\x21\x00', // Normal font
  FONT_SIZE_LARGE: '\x1D\x21\x11',  // Large font
  CUT: '\x1D\x56\x42\x00',    // Partial cut
  LINE_FEED: '\x0A',           // Line feed
};

export const printReceiptViaWebUSB = async (transaction: Partial<Transaction>) => {
  try {
    // Request printer via WebUSB
    const device = await (navigator as any).usb.requestDevice({
      filters: [{ classCode: 7 }] // Printer class
    });

    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    const encoder = new TextEncoder();
    let data = '';

    // Build receipt data
    data += ESC_POS.INIT;
    data += ESC_POS.ALIGN_CENTER;
    data += ESC_POS.FONT_SIZE_LARGE;
    data += 'YOUR STORE NAME\n';
    data += ESC_POS.FONT_SIZE_NORMAL;
    data += '123 Main Street\n';
    data += 'City, State 12345\n';
    data += 'Tel: (555) 123-4567\n';
    data += '\n';
    data += 'RECEIPT\n';
    data += '--------------------------------\n';
    data += ESC_POS.ALIGN_LEFT;
    data += `Date: ${new Date(transaction?.transactionDate || "").toLocaleString()}\n`;
    data += `Receipt #: ${transaction.transactionCode}\n`;
    data += `Transaction ID: ${transaction.transactionId}\n`;
    data += '--------------------------------\n';
    
    // Items header
    data += `${'Item'.padEnd(20)}${'Qty'.padEnd(5)}${'Price'.padEnd(8)}${'Total'}\n`;
    data += '--------------------------------\n';
    
    // Items
    transaction?.items?.forEach(item => {
      const name = item.itemName.substring(0, 20);
      const qty = item.quantity.toString();
      const price = formatMoney(item.unitPrice);
      const total = formatMoney(item.total);
      data += `${name.padEnd(20)}${qty.padEnd(5)}${price.padEnd(8)}${total}\n`;
    });
    
    data += '--------------------------------\n';
    data += `${'Total:'.padEnd(33)}${formatMoney(transaction?.totalAmount || 0)}\n`;
    data += `${'Paid:'.padEnd(33)}${formatMoney(transaction.paidAmount || 0)}\n`;
    data += `${'Change:'.padEnd(33)}${formatMoney((transaction.paidAmount || 0) - (transaction.totalAmount || 0))}\n`;
    data += '--------------------------------\n';
    data += ESC_POS.ALIGN_CENTER;
    data += '\nTHANK YOU!\n';
    data += 'Visit us again!\n';
    data += ESC_POS.CUT;
    
    // Send to printer
    const dataArray = encoder.encode(data);
    await device.transferOut(1, dataArray);
    
    await device.close();
    return { success: true };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, error };
  }
};

// Fallback: Browser print
export const printViaBrowser = (transaction: Partial<Transaction>) => {
  const printContent = document.getElementById('receipt-content');
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
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0;
            padding: 5mm;
          }
          /* Add your print styles here */
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
  printWindow.onafterprint = () => printWindow.close();
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};