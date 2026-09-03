import React, { useState, useEffect, Dispatch, SetStateAction, useRef } from 'react'
// @ts-ignore
import EscPosEncoder from 'esc-pos-encoder'
import { toastErrors, toastSuccess } from '@/helpers/formatStrings'
import { useAuth } from '@/lib/auth-context'
import jsPDF from 'jspdf'
import { config } from './AppConfig'
import { useToaster } from './CustomToast'

// Add WebUSB type definitions
declare global {
  interface USBDevice {
    vendorId: number
    productId: number
    serialNumber?: string
    manufacturerName?: string
    productName?: string
    open(): Promise<void>
    close(): Promise<void>
    selectConfiguration(configurationValue: number): Promise<void>
    claimInterface(interfaceNumber: number): Promise<void>
    transferOut(endpointNumber: number, data: BufferSource): Promise<{ bytesWritten: number }>
  }

  interface USB {
    requestDevice(options?: { filters?: USBDeviceFilter[] }): Promise<USBDevice>
    getDevices(): Promise<USBDevice[]>
  }

  interface USBDeviceFilter {
    vendorId?: number
    productId?: number
    classCode?: number
    subclassCode?: number
    protocolCode?: number
    serialNumber?: string
  }

  interface Navigator {
    usb: USB
  }
}

export interface POSReceiptProps {
  qrCode: string
  transactionNumber: string
  merchantName?: string
  date?: string
  //amount?: number
  items?: Array<{ name: string; code?: string, quantity: number; price: number }>
  customerName?: string
  showQRCode?: boolean
  paidAmount?: number
  balance?: number
  taxAmount?: number
  discountAmount?: number
}

interface POSReceiptUi {
  data: POSReceiptProps
  setData: Dispatch<SetStateAction<POSReceiptProps | null>>
}

var sessionShop = sessionStorage.getItem("selectedShop");

const POSReceipt: React.FC<POSReceiptUi> = ({
  data,
  setData
}) => {
  const { user, selectedShop } = useAuth()
  const toast = useToaster()
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isWebUSBSupported, setIsWebUSBSupported] = useState(true)
  const [savedDevice, setSavedDevice] = useState<any>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  // Destructure data for easier access
  const {
    qrCode,
    transactionNumber,
    merchantName = user?.locations?.find(x => x.id == (selectedShop || sessionShop))?.name || "SHOP NAME",
    date = new Date().toLocaleString(),
    //amount = 0,
    items = [],
    customerName = '',
    showQRCode = true,
  } = data

  useEffect(() => {
    if (!('usb' in navigator)) {
      setIsWebUSBSupported(false)
    }

    try {
      const saved = localStorage.getItem('posPrinterDevice')
      if (saved) {
        setSavedDevice(JSON.parse(saved))
      }
    } catch (e) {
      // Ignore
    }
  }, [])

 const safeAmount = () => {
  // 1. Guard: items must be a non‑empty array
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  // 2. Reduce with initial value 0 and safe number parsing
  const total = items.reduce((sum, v) => {
    // Ensure price and quantity are valid numbers
    const price = typeof v.price === 'number' && !isNaN(v.price) ? v.price : 0;
    const quantity = typeof v.quantity === 'number' && !isNaN(v.quantity) ? v.quantity : 0;
    return sum + (price * quantity);
  }, 0); // << initial value is critical

  // 3. Round to 2 decimal places (currency)
  return total; 
};

const amount = safeAmount();

  // console.log(data)
  // Convert base64 to image data for ESC/POS
  const base64ToImageData = (base64: string, width: number = 200, height: number = 200) => {
    return new Promise<{ data: Uint8Array; width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        
        const bitmapData = new Uint8Array(Math.ceil((width * height) / 8))
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4
            const gray = (data[index] + data[index + 1] + data[index + 2]) / 3
            const bit = gray < 128 ? 1 : 0
            if (bit === 1) {
              const byteIndex = Math.floor((y * width + x) / 8)
              const bitIndex = 7 - (x % 8)
              bitmapData[byteIndex] |= (1 << bitIndex)
            }
          }
        }
        resolve({ data: bitmapData, width, height })
      }
      img.onerror = reject
      img.src = `data:image/png;base64,${base64}`
    })
  }

  const generateReceiptData = async () => {
    try {
      const encoder = new EscPosEncoder()

      let receipt = encoder
        .initialize()
        .align('center')
        .bold(true)
        .line(merchantName)
        .bold(false)
        .line('POS Receipt')
        .line(date)
        .newline()

      receipt = receipt
        .align('left')
        .line(`Transaction: ${transactionNumber}`)
      
      if (customerName) {
        receipt = receipt.line(`Customer: ${customerName}`)
      }
      
      receipt = receipt.newline()

      if (showQRCode && qrCode) {
        try {
          const imageData = await base64ToImageData(qrCode, 200, 200)
          receipt = receipt.image(imageData.data, imageData.width, imageData.height, 'dither')
          receipt = receipt.newline()
        } catch (error) {
          console.error('QR Code conversion failed:', error)
          receipt = receipt.line('[QR Code Unavailable]').newline()
        }
      } else if (showQRCode && !qrCode) {
        receipt = receipt.line('[No QR Code]').newline()
      }

      receipt = receipt.newline()

      if (items.length > 0) {
        receipt = receipt
          .line('----------------------------------------------------------')
          .align('left')
          .bold(true)
          .line('Item                    Qty  Price')
          .bold(false)

        items.forEach((item) => {
          const name = item.name.substring(0, 20).padEnd(20) // 60% of 32 chars
          const qty = String(item.quantity).padStart(8) // 20% of 32 chars
          const price = `${item.price.toFixed(2)}`.padStart(8) // 20% of 32 chars
          receipt = receipt.line(`${name}${qty}${price}`)
        })

        receipt = receipt.line('-----------------------------------------------------------------------------')
      }

      if (amount > 0) {
        receipt = receipt
          .align('right')
          .bold(true)
          .line(`TOTAL: ${config.currency}${amount.toFixed(2)}`)
          .bold(false)
      }

      receipt = receipt
        .newline()
        .align('center')
        .line('Thank you for your business!')
        .line('★ ★ ★ ★ ★')
        .newline()
        .newline()
        .cut('part')

      return receipt.encode()
    } catch (error) {
      console.error('Encoder error:', error)
      throw new Error('Failed to generate receipt data')
    }
  }

  const handleDirectPrint = async () => {
    if (!qrCode && !transactionNumber && items.length === 0) {
      toastErrors(toast, 'No receipt data to print.', 'Print Error')
      return
    }

    setIsPrinting(true)

    try {
      let device: USBDevice

      if (savedDevice) {
        try {
          const devices = await (navigator as any).usb.getDevices()
          device = devices.find((d: any) => 
            d.vendorId === savedDevice.vendorId && 
            d.productId === savedDevice.productId
          )

          if (device) {
            await device.open()
            await device.selectConfiguration(1)
            await device.claimInterface(0)
            console.log('✅ Reconnected to saved printer')
          } else {
            throw new Error('Device not found')
          }
        } catch {
          console.log('🔄 Saved device not found, showing picker...')
          device = await (navigator as any).usb.requestDevice({
            filters: [
              { vendorId: 0x04b8 },
              { vendorId: 0x0b05 },
              { vendorId: 0x0a48 },
              { vendorId: 0x1a86 },
            ]
          })

          await device.open()
          await device.selectConfiguration(1)
          await device.claimInterface(0)

          const deviceInfo = {
            vendorId: device.vendorId,
            productId: device.productId,
            serialNumber: device.serialNumber,
          }
          setSavedDevice(deviceInfo)
          localStorage.setItem('posPrinterDevice', JSON.stringify(deviceInfo))
          console.log('💾 Saved printer for future use')
        }
      } else {
        console.log('🖨️ First time - showing printer picker...')
        device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x04b8 },
            { vendorId: 0x0b05 },
            { vendorId: 0x0a48 },
            { vendorId: 0x1a86 },
          ]
        })

        await device.open()
        await device.selectConfiguration(1)
        await device.claimInterface(0)

        const deviceInfo = {
          vendorId: device.vendorId,
          productId: device.productId,
          serialNumber: device.serialNumber,
        }
        setSavedDevice(deviceInfo)
        localStorage.setItem('posPrinterDevice', JSON.stringify(deviceInfo))
        console.log('💾 Saved printer for future use')
      }

      const receiptData = await generateReceiptData()
      await device.transferOut(1, receiptData)
      await device.close()

      setData(null)
      toastSuccess(toast, '✅ Receipt printed successfully! Data has been cleared.')
    } catch (error) {
      console.error('Printing failed:', error)
      
      let errorMessage = 'Printing failed. '
      if (error instanceof Error) {
        if (error.message.includes('No device found')) {
          errorMessage += 'No printer found. Please connect a POS printer.'
        } else if (error.message.includes('Access denied')) {
          errorMessage += 'Permission denied. Please grant access to the printer.'
        } else if (error.message.includes('not supported')) {
          errorMessage += 'WebUSB is not supported. Please use Chrome or Edge.'
        } else {
          errorMessage += error.message
        }
      }
      toastErrors(toast, `❌ ${errorMessage}`, 'Print Error')
    } finally {
      setIsPrinting(false)
    }
  }

  // Share functionality - Convert receipt to PDF using ref content with dynamic height
  const handleShare = async () => {
    if (!receiptRef.current) {
      toastErrors(toast, 'Receipt not found', 'Share Error')
      return
    }

    setIsSharing(true)

    try {
      // Calculate height dynamically
      let totalHeight = 0
      const pageWidth = 80
      const margin = 3
      
      // Header section
      totalHeight += 8 // merchant name (bold)
      totalHeight += 3 // spacing
      totalHeight += 4 // "POS Receipt"
      totalHeight += 3 // date
      totalHeight += 4 // spacing

      // Transaction
      totalHeight += 4 // "Transaction #"
      totalHeight += 4 // transaction number
      totalHeight += 4 // spacing

      // Customer (if exists)
      if (customerName) {
        totalHeight += 4
        totalHeight += 4
        totalHeight += 4
      }

      // QR Code (if exists)
      if (showQRCode && qrCode) {
        totalHeight += 25 // QR code size
        totalHeight += 4 // spacing after QR
        totalHeight += 4 // "Scan QR to verify"
        totalHeight += 4 // spacing
      }

      // Items
      if (items.length > 0) {
        totalHeight += 4 // separator
        totalHeight += 4 // header
        totalHeight += 4 // separator
        
        items.forEach(() => {
          totalHeight += 4 // each item
        })
        
        totalHeight += 4 // separator
      }

      // Total
      if (amount > 0) {
        totalHeight += 4 // spacing
        totalHeight += 6 // total
      }

      // Footer
      totalHeight += 4 // spacing
      totalHeight += 4 // "Thank you..."
      totalHeight += 4 // "★ ★ ★ ★ ★"

      // Bottom padding
      totalHeight += 5

      // Create PDF with monospace font
      const pdf = new jsPDF({
        unit: 'mm',
        format: [pageWidth, totalHeight + 8],
        orientation: 'portrait',
      })

      // Use Courier (monospace) font
      const FONT = 'courier'

      let yPos = 6

      // Helper to center text
      const centerText = (text: string, y: number, fontSize: number = 10, fontStyle: string = 'normal', color: string = '#000000') => {
        pdf.setFont(FONT, fontStyle)
        pdf.setFontSize(fontSize)
        pdf.setTextColor(color)
        const textWidth = pdf.getStringUnitWidth(text) * fontSize / pdf.internal.scaleFactor
        const x = (pageWidth - textWidth) / 2
        pdf.text(text, x, y)
        return y
      }

      // Helper to add FULL-WIDTH separator line with GREY color
      const addSeparator = (y: number, color: string = '#888888') => {
        pdf.setFont(FONT, 'normal')
        pdf.setFontSize(6)
        pdf.setTextColor(color)
        
        const leftMargin = 2
        const rightMargin = 2
        const lineWidth = pageWidth - leftMargin - rightMargin
        
        const dashCount = Math.floor(lineWidth / 0.85)
        const line = '-'.repeat(dashCount)
        pdf.text(line, leftMargin, y)
        return y + 3.5
      }

      // Helper to add item row with proper columns (60% Item, 20% Qty, 20% Price)
      const addItemRow = (name: string, qty: number, price: number, y: number) => {
        pdf.setFont(FONT, 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor('#000000')
        
        // Calculate column widths
        const totalWidth = pageWidth - (margin * 2)
        const itemWidth = totalWidth * 0.60
        const qtyWidth = totalWidth * 0.20
        const priceWidth = totalWidth * 0.20
        
        // Truncate name to fit in 60% width
        const maxNameChars = Math.floor(itemWidth / 1.5) // Approximate characters that fit
        const nameDisplay = name.substring(0, maxNameChars).padEnd(maxNameChars)
        const qtyDisplay = String(qty).padStart(3)
        const priceDisplay = `${price.toFixed(2)}`.padStart(8)
        
        // Left align item name
        pdf.text(nameDisplay, margin, y)
        
        // Right align Qty (position at 60% + 20% mark)
        const qtyX = margin + itemWidth + (qtyWidth - pdf.getStringUnitWidth(qtyDisplay) * 8 / pdf.internal.scaleFactor)
        pdf.text(qtyDisplay, qtyX, y)
        
        // Right align Price (position at 80% mark)
        const priceX = margin + itemWidth + qtyWidth + (priceWidth - pdf.getStringUnitWidth(priceDisplay) * 8 / pdf.internal.scaleFactor)
        pdf.text(priceDisplay, priceX, y)
        
        return y + 4
      }

      // --- HEADER ---
      pdf.setFont(FONT, 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor('#000000')
      yPos = centerText(merchantName, yPos, 12, 'bold')
      yPos += 4

      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(9)
      yPos = centerText('POS Receipt', yPos, 9)
      yPos += 3
      
      yPos = centerText(date, yPos, 7, 'normal', '#666666')
      yPos += 5

      // --- TRANSACTION ---
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor('#666666')
      const transLabel = 'Transaction #'
      const transLabelWidth = pdf.getStringUnitWidth(transLabel) * 7 / pdf.internal.scaleFactor
      const transLabelX = (pageWidth - transLabelWidth) / 2
      pdf.text(transLabel, transLabelX, yPos)
      yPos += 4
      
      pdf.setFont(FONT, 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor('#000000')
      const transNum = transactionNumber
      const transNumWidth = pdf.getStringUnitWidth(transNum) * 10 / pdf.internal.scaleFactor
      const transNumX = (pageWidth - transNumWidth) / 2
      pdf.text(transNum, transNumX, yPos)
      yPos += 5

      // --- CUSTOMER (if exists) ---
      if (customerName) {
        pdf.setFont(FONT, 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor('#666666')
        pdf.text('Customer', margin, yPos)
        yPos += 4
        pdf.setFont(FONT, 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor('#000000')
        pdf.text(customerName, margin, yPos)
        yPos += 5
      }

      // --- QR CODE (if exists) ---
      if (showQRCode && qrCode) {
        try {
          const img = new Image()
          img.src = `data:image/png;base64,${qrCode}`
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })
          
          const qrSize = 25
          const qrX = (pageWidth - qrSize) / 2
          pdf.addImage(img, 'PNG', qrX, yPos, qrSize, qrSize)
          yPos += qrSize + 4
          
          pdf.setFont(FONT, 'normal')
          pdf.setFontSize(6)
          pdf.setTextColor('#666666')
          const verifyText = 'Scan QR to verify'
          const verifyWidth = pdf.getStringUnitWidth(verifyText) * 6 / pdf.internal.scaleFactor
          const verifyX = (pageWidth - verifyWidth) / 2
          pdf.text(verifyText, verifyX, yPos)
          yPos += 5
        } catch (error) {
          console.error('QR Code error:', error)
        }
      }

      // --- ITEMS with 60% | 20% | 20% distribution ---
      if (items.length > 0) {
        yPos = addSeparator(yPos, '#888888')
        
        pdf.setFont(FONT, 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor('#666666')
        
        // Calculate column positions
        const totalWidth = pageWidth - (margin * 2)
        const itemWidth = totalWidth * 0.60
        const qtyWidth = totalWidth * 0.20
        const priceWidth = totalWidth * 0.20
        
        // Left align "Item" at margin
        pdf.text('Item', margin, yPos)
        
        // Right align "Qty" at 60% + 20% mark
        const qtyHeader = 'Qty'
        const qtyHeaderWidth = pdf.getStringUnitWidth(qtyHeader) * 8 / pdf.internal.scaleFactor
        const qtyHeaderX = margin + itemWidth + (qtyWidth - qtyHeaderWidth)
        pdf.text(qtyHeader, qtyHeaderX, yPos)
        
        // Right align "Price" at 80% mark
        const priceHeader = 'Price'
        const priceHeaderWidth = pdf.getStringUnitWidth(priceHeader) * 8 / pdf.internal.scaleFactor
        const priceHeaderX = margin + itemWidth + qtyWidth + (priceWidth - priceHeaderWidth)
        pdf.text(priceHeader, priceHeaderX, yPos)
        yPos += 4
        
        yPos = addSeparator(yPos, '#888888')
        
        // Items - black text
        items.forEach((item) => {
          yPos = addItemRow(item.name, item.quantity, item.price, yPos)
        })

        yPos = addSeparator(yPos, '#888888')
      }

      // --- TOTAL ---
      if (amount > 0) {
        yPos += 2
        pdf.setFont(FONT, 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor('#000000')
        
        const totalText = 'TOTAL'
        const totalAmount = `${config.currency} ${amount.toFixed(2)}`
        
        pdf.text(totalText, margin, yPos)
        
        const amountWidth = pdf.getStringUnitWidth(totalAmount) * 12 / pdf.internal.scaleFactor
        const amountX = pageWidth - margin - amountWidth
        pdf.text(totalAmount, amountX, yPos)
        yPos += 6
      }

      // --- FOOTER ---
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor('#666666')
      yPos = centerText('Thank you for your business!', yPos, 7, 'normal', '#666666')
      yPos += 4
      yPos = centerText('* * * * *', yPos, 8, 'normal', '#666666')
      yPos += 4

      // --- Generate PDF ---
      const pdfBlob = pdf.output('blob')

      // Share or download
      if (navigator.share) {
        await navigator.share({
          title: `Receipt-${transactionNumber}`,
          files: [
            new File([pdfBlob], `Receipt-${transactionNumber}.pdf`, { 
              type: 'application/pdf' 
            })
          ],
        })
        toastSuccess(toast, '✅ Receipt shared successfully!')
        setData(null)
      } else {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(pdfBlob)
        link.download = `Receipt-${transactionNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        toastSuccess(toast, '✅ PDF downloaded successfully!')
        setData(null)
      }
    } catch (error) {
      console.error('Share failed:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        toastErrors(toast, 'Share was cancelled', 'Share Cancelled')
      } else {
        toastErrors(toast, 'Failed to share receipt. Please try again.', 'Share Error')
      }
    } finally {
      setIsSharing(false)
    }
  }

  if (!isWebUSBSupported) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg max-w-md mx-auto mt-8">
        ⚠️ WebUSB is not supported in this browser. Please use Chrome or Edge for POS printing.
      </div>
    )
  }

  if (!qrCode && !transactionNumber && items.length === 0) {
    return (
      <div className="bg-gray-100 p-4 flex flex-col items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🧾</div>
          <h2 className="text-xl font-semibold mb-2">No Receipt Data</h2>
          <p className="text-gray-600 mb-4">
            There is no receipt data to display or print.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 flex flex-col items-center w-fit">
      {/* Receipt Preview - ADDED THE REF HERE */}
      <div ref={receiptRef} className={ `bg-white shadow-lg rounded-lg p-4 mb-4 max-w-[${showQRCode ? config.qrCodePrinterSize : config.receiptPrinterSize}mm]` } >
        <div className="w-full bg-white text-black text-xs" style={{ fontFamily: 'var(--font-courier-prime), Courier New, monospace' }}>
          <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
            <h2 className="text-base font-bold uppercase">{merchantName}</h2>
            <p className="text-[10px] text-gray-600">POS Receipt</p>
            <p className="text-[10px] text-gray-600">{date}</p>
          </div>

          <div className="mb-3 text-center">
            <p className="text-[10px] text-gray-500">Transaction #</p>
            <p className={(showQRCode && ((config?.qrCodePrinterSize ||0)) < 80 )   || (!showQRCode && (config.receiptPrinterSize ||0) < 80) ?  "text-xs font-bold tracking-wide" : "text-sm font-bold tracking-wide"}>{transactionNumber}</p>
          </div>

          {customerName && (
            <div className="mb-3 text-center border-b border-dashed border-gray-300 pb-2">
              <p className="text-[10px] text-gray-500">Customer</p>
              <p className="text-sm font-semibold">{customerName}</p>
            </div>
          )}

          {showQRCode && qrCode && (
            <>
              <div className="flex justify-center my-3">
                <div className="border border-gray-300 p-2 bg-white">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    style={{
                      width: '200px',
                      height: '200px',
                      imageRendering: 'pixelated',
                    }}
                  />
                </div>
              </div>

              <div className="text-center mb-2">
                <p className="text-[8px] text-gray-400 uppercase tracking-wider">
                  Scan QR to verify
                </p>
              </div>
            </>
          )}

          {items.length > 0 && (
            <div className="border-t border-b border-dashed border-gray-300 py-2 my-2">
              {/* Header - 60% | 20% | 20% distribution */}
              <div className="grid grid-cols-12 gap-1 text-[10px] font-bold mb-1">
                <span className="col-span-7">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-3 text-right">Price</span>
              </div>
              
              {/* Items - 60% | 20% | 20% distribution */}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-1 text-[10px]">
                  <span className="col-span-7 truncate">{item.name}</span>
                  <span className="col-span-2 text-center">{item.quantity}</span>
                  <span className="col-span-3 text-right">{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {amount > 0 && (
            <div className="flex justify-between text-sm font-bold border-t border-dashed border-gray-300 pt-2 mt-2">
              <span>TOTAL</span>
              <span>{`${config.currency} `}{amount.toFixed(2)}</span>
            </div>
          )}

          <div className="text-center border-t border-dashed border-gray-300 pt-2 mt-3">
            <p className="text-[8px] text-gray-400">Thank you for your business!</p>
            <p className="text-[8px] text-gray-400">★ ★ ★ ★ ★</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDirectPrint}
          disabled={isPrinting}
          className={`p-2 md:p-3 text-white rounded-md transition-colors text-sm ${
            isPrinting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isPrinting ? '⏳ Printing...' : '🖨️ Print Receipt'}
        </button>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className={`p-2 md:p-3 text-white rounded-md transition-colors text-md ${
            isSharing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSharing ? '⏳ Sharing...' : '📤 Share'}
        </button>
      </div>

      {/* Show printer status */}
      {savedDevice && (
        <div className="mt-2 text-sm text-green-600">
          ✅ Printer saved - will print automatically
        </div>
      )}
      {!savedDevice && (
        <div className="mt-2 text-sm text-gray-500">
          ℹ️ First time - you'll need to select your printer once
        </div>
      )}
    </div>
  )
}

export default POSReceipt