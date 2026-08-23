import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handlePrint = (printContentRef: any) => {
  const printContents = printContentRef.current.innerHTML;
  const printWindow = window.open('', '_blank');
  
  printWindow?.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Purchase Order</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          .print-container {
            max-width: 100%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${printContents}
        </div>
        <div class="footer">
          Printed on: ${new Date().toLocaleString()}
        </div>
        <script>
          window.onload = function() {
            window.print();
            
            // Close the window after print dialog is dismissed
            window.onafterprint = function() {
              window.close();
            };
            
            // Fallback: close after 10 miliSeconds if onafterprint doesn't fire
            setTimeout(function() {
              window.close();
            }, 10);
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow?.document.close();
};
