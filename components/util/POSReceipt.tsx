// @ts-nocheck
import React, { useState, useEffect, Dispatch, SetStateAction, useRef } from 'react'
// @ts-ignore
import EscPosEncoder from 'esc-pos-encoder'
import { toastErrors, toastSuccess } from '@/helpers/formatStrings'
import { useAuth } from '@/lib/auth-context'
import jsPDF from 'jspdf'
import { config } from './AppConfig'
import { useToaster } from './CustomToast'
import { sessionStore } from '@/helpers/formatStrings';

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
  items?: Array<{ name: string; code?: string; quantity: number; price: number }>
  customerName?: string
  showQRCode?: boolean
  paidAmount?: number
  balance?: number
  taxAmount?: number
  discountAmount?: number
  uniqueCount?: number;
}

interface POSReceiptUi {
  data: POSReceiptProps
  setData: Dispatch<SetStateAction<POSReceiptProps | null>>
}

var sessionShop = sessionStore.get("selectedShop");

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
  const hasAutoPrinted = useRef(false)   // guards against double-print in Strict Mode

  // Destructure data for easier access
  const {
    qrCode,
    transactionNumber,
    merchantName = user?.locations?.find(x => x.id == (selectedShop || sessionShop))?.name || "SHOP NAME",
    date = new Date().toLocaleString(),
    items = [],
    customerName = '',
    showQRCode = true,
    uniqueCount
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
    if (!Array.isArray(items) || items.length === 0) {
      return 0;
    }

    const total = items.reduce((sum, v) => {
      const price = typeof v.price === 'number' && !isNaN(v.price) ? v.price : 0;
      const quantity = typeof v.quantity === 'number' && !isNaN(v.quantity) ? v.quantity : 0;
      return sum + (price * quantity);
    }, 0);

    return total;
  };

  const amount = safeAmount();

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
      const LINE_WIDTH = 32

      const fit = (text: string, width: number, align: 'left' | 'right' | 'center' = 'left') => {
        const s = String(text ?? '')
        if (s.length > width) return s.substring(0, width)
        if (align === 'right') return s.padStart(width, ' ')
        if (align === 'center') {
          const totalPad = width - s.length
          const left = Math.floor(totalPad / 2)
          return ' '.repeat(left) + s + ' '.repeat(totalPad - left)
        }
        return s.padEnd(width, ' ')
      }

      let receipt = encoder
        .initialize()
        .align('center')
        .bold(true)
        .line(fit(merchantName, LINE_WIDTH, 'center').trim())
        .bold(false)
        .line(fit('POS Receipt', LINE_WIDTH, 'center').trim())
        .line(fit(date, LINE_WIDTH, 'center').trim())
        .newline()

      receipt = receipt
        .align('left')
        .line(fit(`Transaction: ${transactionNumber}`, LINE_WIDTH))

      if (customerName) {
        receipt = receipt.line(fit(`Customer: ${customerName}`, LINE_WIDTH))
      }

      receipt = receipt.newline()

      if (showQRCode && qrCode) {
        try {
          receipt = receipt
            .align('center')
            .qrcode(qrCode, 2, 6, 'm')
            .newline()
          console.log('✅ QR code queued for native print')
        } catch (error) {
          console.error('QR code generation failed:', error)
          receipt = receipt
            .align('left')
            .line(fit('[QR Code Unavailable]', LINE_WIDTH))
            .newline()
        }
      } else if (showQRCode && !qrCode) {
        receipt = receipt
          .align('left')
          .line(fit('[No QR Code]', LINE_WIDTH))
          .newline()
      }

      receipt = receipt.newline()

      if (items.length > 0) {
        const SEP = '-'.repeat(LINE_WIDTH)

        receipt = receipt
          .align('left')
          .line(SEP)
          .bold(true)
          .line(fit('Item', 14) + fit('Qty', 6, 'right') + fit('Price', 12, 'right'))
          .bold(false)

        items.forEach((item) => {
          const name = fit(item.name, 14)
          const qty = fit(String(item.quantity), 6, 'right')
          const price = fit(item.price.toFixed(2), 12, 'right')
          receipt = receipt.line(name + qty + price)
        })

        receipt = receipt.line(SEP)
      }

      if (amount > 0) {
        const totalLabel = 'TOTAL'
        const totalValue = `${config.currency}${amount.toFixed(2)}`
        receipt = receipt
          .align('left')
          .bold(true)
          .line(fit(totalLabel, 10) + fit(totalValue, 22, 'right'))
          .bold(false)
      }

      receipt = receipt
        .newline()
        .align('center')
        .line(fit('Thank you !', LINE_WIDTH, 'center').trim())
        .line(fit('* * * * *', LINE_WIDTH, 'center').trim())
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
              { vendorId: 0x0483, productId: 0x070B },
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
            { vendorId: 0x0483, productId: 0x070B },
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

  // ============ AUTO-PRINT EFFECT ============
  // Runs once on mount when items exist. Prints, then clears the receipt data.
  // Placed AFTER handleDirectPrint so there's no reference-before-init error.
 useEffect(() => {
  if (!items || items.length === 0) return
  if (!isWebUSBSupported) return
  if (hasAutoPrinted.current) return

  // *** CRITICAL: bail out unless we already have a paired printer ***
  if (!savedDevice) {
    console.log("[auto-print] no saved printer → user must click Print manually once")
    return
  }

  const timer = setTimeout(async () => {
    if (hasAutoPrinted.current) return
    hasAutoPrinted.current = true
    try {
      await handleDirectPrint()
    } catch (e) {
      console.error("[auto-print] failed:", e)
    } finally {
      setData(null)
    }
  }, 300)

  return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [items, isWebUSBSupported, savedDevice])


  // Share functionality
  const handleShare = async () => {
    if (!receiptRef.current) {
      toastErrors(toast, 'Receipt not found', 'Share Error')
      return
    }

    setIsSharing(true)

    try {
      let totalHeight = 0
      const pageWidth = 80
      const margin = 3

      totalHeight += 8
      totalHeight += 3
      totalHeight += 4
      totalHeight += 3
      totalHeight += 4

      totalHeight += 4
      totalHeight += 4
      totalHeight += 4

      if (customerName) {
        totalHeight += 4
        totalHeight += 4
        totalHeight += 4
      }

      if (showQRCode && qrCode) {
        totalHeight += 25
        totalHeight += 4
        totalHeight += 4
        totalHeight += 4
      }

      if (items.length > 0) {
        totalHeight += 4
        totalHeight += 4
        totalHeight += 4

        items.forEach(() => {
          totalHeight += 4
        })

        totalHeight += 4
      }

      if (amount > 0) {
        totalHeight += 4
        totalHeight += 6
      }

      totalHeight += 4
      totalHeight += 4
      totalHeight += 4
      totalHeight += 5

      const pdf = new jsPDF({
        unit: 'mm',
        format: [pageWidth, totalHeight + 8],
        orientation: 'portrait',
      })

      const FONT = 'courier'

      let yPos = 6

      const centerText = (text: string, y: number, fontSize: number = 10, fontStyle: string = 'normal', color: string = '#000000') => {
        pdf.setFont(FONT, fontStyle)
        pdf.setFontSize(fontSize)
        pdf.setTextColor(color)
        const textWidth = pdf.getStringUnitWidth(text) * fontSize / pdf.internal.scaleFactor
        const x = (pageWidth - textWidth) / 2
        pdf.text(text, x, y)
        return y
      }

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

      const addItemRow = (name: string, qty: number, price: number, y: number) => {
        pdf.setFont(FONT, 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor('#000000')

        const totalWidth = pageWidth - (margin * 2)
        const itemWidth = totalWidth * 0.60
        const qtyWidth = totalWidth * 0.20
        const priceWidth = totalWidth * 0.20

        const maxNameChars = Math.floor(itemWidth / 1.5)
        const nameDisplay = name.substring(0, maxNameChars).padEnd(maxNameChars)
        const qtyDisplay = String(qty).padStart(3)
        const priceDisplay = `${price.toFixed(2)}`.padStart(8)

        pdf.text(nameDisplay, margin, y)

        const qtyX = margin + itemWidth + (qtyWidth - pdf.getStringUnitWidth(qtyDisplay) * 8 / pdf.internal.scaleFactor)
        pdf.text(qtyDisplay, qtyX, y)

        const priceX = margin + itemWidth + qtyWidth + (priceWidth - pdf.getStringUnitWidth(priceDisplay) * 8 / pdf.internal.scaleFactor)
        pdf.text(priceDisplay, priceX, y)

        return y + 4
      }

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

      if (items.length > 0) {
        yPos = addSeparator(yPos, '#888888')

        pdf.setFont(FONT, 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor('#666666')

        const totalWidth = pageWidth - (margin * 2)
        const itemWidth = totalWidth * 0.60
        const qtyWidth = totalWidth * 0.20
        const priceWidth = totalWidth * 0.20

        pdf.text('Item', margin, yPos)

        const qtyHeader = 'Qty'
        const qtyHeaderWidth = pdf.getStringUnitWidth(qtyHeader) * 8 / pdf.internal.scaleFactor
        const qtyHeaderX = margin + itemWidth + (qtyWidth - qtyHeaderWidth)
        pdf.text(qtyHeader, qtyHeaderX, yPos)

        const priceHeader = 'Price'
        const priceHeaderWidth = pdf.getStringUnitWidth(priceHeader) * 8 / pdf.internal.scaleFactor
        const priceHeaderX = margin + itemWidth + qtyWidth + (priceWidth - priceHeaderWidth)
        pdf.text(priceHeader, priceHeaderX, yPos)
        yPos += 4

        yPos = addSeparator(yPos, '#888888')

        items.forEach((item) => {
          yPos = addItemRow(item.name, item.quantity, item.price, yPos)
        })

        yPos = addSeparator(yPos, '#888888')
      }

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

      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor('#666666')
      yPos = centerText('Thank you...', yPos, 7, 'normal', '#666666')
      yPos += 4
      yPos = centerText('* * * * *', yPos, 8, 'normal', '#666666')
      yPos += 4

      const pdfBlob = pdf.output('blob')

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

  if (!qrCode && !transactionNumber && items.length === 0 && !uniqueCount) {
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
      <div className=''>
        {items?.length == 0 && (
          <div className=" flex flex-col items-center justify-between bg-card p-5 py-2">
            <div className="w-full text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Stocking Code
              </p>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="rounded-lg bg-primary/10 px-6 py-3">
                <span className="font-mono text-3xl font-bold tracking-widest text-primary">
                  {uniqueCount}
                </span>
              </div>
            </div>
          </div>
        )}
        {
          <div ref={receiptRef} className={`bg-white shadow-lg rounded-lg p-4 mb-4 max-w-[${showQRCode ? config.qrCodePrinterSize : config.receiptPrinterSize}mm]`}>
            <div className="w-full bg-white text-black text-xs" style={{ fontFamily: 'var(--font-courier-prime), Courier New, monospace' }}>
              <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                <h2 className="text-base font-bold uppercase">{merchantName}</h2>
                <p className="text-[10px] text-gray-600">POS Receipt</p>
                <p className="text-[10px] text-gray-600">{date}</p>
              </div>

              <div className="mb-3 text-center">
                <p className="text-[10px] text-gray-500">Transaction #</p>
                <p className={(showQRCode && ((config?.qrCodePrinterSize || 0)) < 80) || (!showQRCode && (config.receiptPrinterSize || 0) < 80) ? "text-xs font-bold tracking-wide" : "text-sm font-bold tracking-wide"}>{transactionNumber}</p>
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
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-bold mb-1">
                    <span className="col-span-7">Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-3 text-right">Price</span>
                  </div>

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
                <p className="text-[8px] text-gray-400">Thank you !</p>
                <p className="text-[8px] text-gray-400">★ ★ ★ ★ ★</p>
              </div>
            </div>
          </div>
        }
      </div>

      {/* Action Buttons — always visible, as before */}
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

        <button
          onClick={() => { setData(null) }}
          disabled={isSharing || isPrinting}
          className={`p-2 md:p-3 text-white rounded-md transition-colors text-md ${
            isSharing || isPrinting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Back
        </button>
      </div>

      {/* Printer status — always visible, as before */}
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