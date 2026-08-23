'use client'

import { useState } from "react";
import { Transaction } from "@/lib/types";
import { printReceiptViaWebUSB, printViaBrowser } from "./posPrint";
import { handlePrint } from "@/lib/utils";


 const SaleComplete = ({ transaction, printRef  }: { transaction: Partial<Transaction>, printRef: React.RefObject<HTMLDivElement | null>}) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintWithWebUSB = async () => {
    setIsPrinting(true);
    const result = await printReceiptViaWebUSB(transaction);
    if (!result.success) {
      // Fallback to browser print
      const useFallback = confirm('POS printer not found. Use browser print?');
      if (useFallback) {
        //printViaBrowser(transaction);
        handlePrint(printRef)
      }
    }
    setIsPrinting(false);
    setShowReceipt(false);
  };

  const handleBrowserPrint = () => {
    handlePrint(printRef);
    setShowReceipt(false);
  };

  return (
    <div>
      <button
        onClick={() => setShowReceipt(true)}
        className="bg-green-500 text-white px-6 py-1 w-full rounded-lg font-bold"
      >
        Print Receipt
      </button>

      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Print Receipt</h3>
            <div className="space-y-3">
              <button
                onClick={handlePrintWithWebUSB}
                disabled={isPrinting}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isPrinting ? 'Printing...' : 'Print to POS Printer'}
              </button>
              <button
                onClick={handleBrowserPrint}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Print via Browser
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleComplete;