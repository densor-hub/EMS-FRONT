// app/transactions/delivery/page.tsx
'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import QRScanner from '@/components/util/QRScanner'
import { Header } from '@/components/dashboard/header'
import { Transaction } from '@/lib/types'
import POSReceipt, { POSReceiptProps } from '@/components/util/POSReceipt'
import { useAuth } from '@/lib/auth-context'
import axiosInstance from '@/lib/customAxios'
import { toastErrors, toastSuccess } from '@/helpers/formatStrings'
import { useToaster } from '@/components/util/CustomToast'
import { LoadingOverlay } from '@/components/SkeletonLoading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, RefreshCw, ScanLine, Package, Hash } from 'lucide-react'

// ---- Matches the API schema ----
interface SaleDeliveryBacklog {
  transactionNumber: string
  dailyCountNumber: number
  saleDate: string
  saleDeliveryRequestId: string
  createdAt: string
  isDelivered: boolean
}

// ---- Helpers ----
function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDate(value?: string): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

function formatTime(value?: string): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export default function DeliveryPage() {
  const { user, selectedShop } = useAuth()
  const toast = useToaster()

  const sessionShop =
    typeof window !== 'undefined' ? sessionStorage.getItem('selectedShop') : null
  const currentShopId = selectedShop || sessionShop || ''

  // ---- Scanner / receipt state ----
  const [showScanner, setShowScanner] = useState(false)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [receiptData, setReceiptData] = useState<POSReceiptProps | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [qrScannerError, setQrScannerError] = useState<string | null>(null)
  const [scannerInitialValue, setScannerInitialValue] = useState<string | null>(null)

  // ---- Backlog state ----
  const [selectedDate, setSelectedDate] = useState<string>(todayISO())
  const [backlogs, setBacklogs] = useState<SaleDeliveryBacklog[]>([])
  const [isLoadingBacklogs, setIsLoadingBacklogs] = useState(false)
  const [backlogError, setBacklogError] = useState<string | null>(null)

  // ---- Daily count number filter ----
  const [dailyCount, setDailyCount] = useState<string>('')
  const [notFoundNumber, setNotFoundNumber] = useState<string | null>(null)

  // ---- Fetch backlogs on shop / date change ----
  useEffect(() => {
    if (!currentShopId) return
    void loadBacklogs(currentShopId, selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShopId, selectedDate])

  useEffect(() => {
    if (receiptData === null) setShowScanner(false)
  }, [receiptData])

  const loadBacklogs = async (shopId: string, saleDate: string) => {
    setIsLoadingBacklogs(true)
    setBacklogError(null)
    try {
      const { data } = await axiosInstance.get(
        `/Sales/SaleDeliveryBackLogs/${shopId}`,
        { params: { SaleDate: saleDate } }
      )
      setBacklogs(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Failed to load delivery backlogs.'
      setBacklogError(message)
      setBacklogs([])
      toastErrors(toast, message, 'Error')
    } finally {
      setIsLoadingBacklogs(false)
    }
  }

  const refreshBacklogs = () => {
    if (currentShopId) void loadBacklogs(currentShopId, selectedDate)
  }

  // ---- QR scan flow ----
  const fetchTransaction = async (qrCode: string) => {
    setIsScanning(true)
    setQrScannerError(null)
    setTransaction(null)

    try {
      const response = await axiosInstance.get(`/Sales/Generate-Receipt/${qrCode}`)

      if (response.data) {
        const transactionData = response.data as Transaction
        setTransaction(transactionData)
        toastSuccess(
          toast,
          `✅ Transaction found: ${
            transactionData.transactionId ||
            transactionData.id ||
            transactionData.transactionCode
          }`
        )

        setReceiptData({
          qrCode: '',
          transactionNumber: transactionData?.transactionCode || '',
          showQRCode: false,
          customerName: transactionData?.customerName,
          date: transactionData?.transactionDate,
          merchantName: user?.locations?.find((x) => x.id === currentShopId)?.name,
          items: transactionData?.items?.map((x) => ({
            name: x.itemName || x.name,
            quantity: x.quantity,
            price: x.unitPrice,
            total: x.quantity * x.unitPrice,
          })),
        })

        refreshBacklogs();
      } else {
        setQrScannerError('Transaction not found')
        toastErrors(toast, 'No transaction found with this QR code.', 'Not Found')
      }
    } catch (error: any) {
      console.error('Error fetching transaction:', error)
      setQrScannerError(
        error?.response?.data?.message
          ? error.response.data.message
          : typeof error?.response?.data === 'string'
            ? error.response.data
            : 'Failed to fetch transaction'
      )
      toastErrors(toast, 'There was a technical challenge, please try again later')
    } finally {
      setIsScanning(false)
    }
  }

  const handleOpenBacklog = (item: SaleDeliveryBacklog) => {
    setScannerInitialValue(item?.saleDeliveryRequestId || item?.transactionNumber)
    setShowScanner(true)
  }

  // ---- Filtering ----
  const trimmedDailyCount = dailyCount.trim()
  const hasFilter = trimmedDailyCount.length > 0

  // Match on dailyCountNumber (numeric comparison, tolerant of leading zeros)
  const visibleBacklogs = useMemo(() => {
    if (!hasFilter) return backlogs
    const target = Number(trimmedDailyCount)
    if (Number.isNaN(target)) return []
    return backlogs.filter((b) => Number(b.dailyCountNumber) === target)
  }, [backlogs, hasFilter, trimmedDailyCount])

  // Toast once when the typed number doesn't exist
  useEffect(() => {
    if (!hasFilter) {
      setNotFoundNumber(null)
      return
    }
    if (isLoadingBacklogs) return
    if (visibleBacklogs.length === 0 && notFoundNumber !== trimmedDailyCount) {
      setNotFoundNumber(trimmedDailyCount)
      toastErrors(
        toast,
        `No backlog found for #${trimmedDailyCount}.`,
        'Not Found'
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFilter, trimmedDailyCount, visibleBacklogs.length, isLoadingBacklogs])

  const pendingCount = backlogs.filter((b) => !b.isDelivered).length
  const deliveredCount = backlogs.filter((b) => b.isDelivered).length

  // Clickable only when a filter is active AND at least one match exists
  const isClickEnabled = hasFilter && visibleBacklogs.length > 0

  return (
    <Suspense fallback={<LoadingOverlay />}>
      {(isLoadingBacklogs || isScanning) && <LoadingOverlay />}

      <div className="p-3 sm:p-4 h-full">
        <Header title="Delivery" description="Pending sale deliveries" />

        {/* ---- Toolbar ---- */}
        <div className="mt-3 sm:mt-4 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2 sm:gap-3">
          {/* Date */}
          <div className="space-y-1 w-full sm:w-auto">
            <Label htmlFor="saleDate" className="text-xs text-muted-foreground">
              Sale Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="saleDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 bg-white border-border w-full sm:w-[180px]"
              />
            </div>
          </div>

          {/* Daily Count Number */}
          <div className="space-y-1 w-full sm:w-auto">
            <Label htmlFor="dailyCount" className="text-xs text-muted-foreground">
              Daily Count Number
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="dailyCount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={dailyCount}
                onChange={(e) => {
                  // digits only
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  setDailyCount(v)
                }}
                placeholder="Enter number"
                className="pl-10 bg-white border-border w-full sm:w-[180px]"
              />
            </div>
          </div>

          {/* Today + Refresh */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedDate(todayISO())}
              className="h-10 flex-1 sm:flex-none"
            >
              Today
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={refreshBacklogs}
              disabled={isLoadingBacklogs}
              className="h-10 flex-1 sm:flex-none"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoadingBacklogs ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          {/* Scan */}
          <div className="w-full sm:ml-auto sm:w-auto">
            <Button
              type="button"
              onClick={() => setShowScanner(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full sm:w-auto"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          </div>
        </div>

        {/* ---- Hint when no number entered ---- */}
        {!hasFilter && backlogs.length > 0 && (
          <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3 text-xs sm:text-sm text-muted-foreground">
            Enter a daily count number to enable delivery cards.
          </div>
        )}

        {/* ---- Counts ---- */}
        {backlogs.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{pendingCount}</span>{' '}
              pending
            </span>
            <span className="hidden sm:inline text-muted-foreground/50">·</span>
            <span>
              <span className="font-semibold text-foreground">{deliveredCount}</span>{' '}
              delivered
            </span>
          </div>
        )}

        {/* ---- Error banner ---- */}
        {backlogError && (
          <div className="mb-3 sm:mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive">
            {backlogError}
          </div>
        )}

        {/* ---- Empty state ---- */}
        {visibleBacklogs.length === 0 && !isLoadingBacklogs && !backlogError && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 sm:py-16 text-center px-4">
            <Package className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {hasFilter ? 'No matching backlog' : 'No pending deliveries'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilter
                ? `No backlog found for #${trimmedDailyCount}.`
                : `Nothing to deliver for ${formatDate(selectedDate)}.`}
            </p>
          </div>
        )}

        {/* ---- Backlog grid ---- */}
        {visibleBacklogs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {[...visibleBacklogs]
              .sort((a, b) => {
                if (a.isDelivered !== b.isDelivered) {
                  return a.isDelivered ? 1 : -1
                }
                return (
                  new Date(b.createdAt ?? b.saleDate).getTime() -
                  new Date(a.createdAt ?? a.saleDate).getTime()
                )
              })
              .map((item) => (
                <BacklogCard
                  key={item.saleDeliveryRequestId}
                  item={item}
                  onOpen={() => {
                    if (!isClickEnabled) return
                    handleOpenBacklog(item)
                  }}
                  clickable={isClickEnabled}
                  highlighted={hasFilter && visibleBacklogs.length > 0}
                />
              ))}
          </div>
        )}
      </div>

      {/* ---- QR Scanner modal ---- */}
      {showScanner && (
        <QRScanner
          visible={showScanner}
          onClose={() => {
            setShowScanner(false)
            setScannerInitialValue(null)
          }}
          isLoading={isScanning}
          fetchTransaction={fetchTransaction}
          transaction={transaction}
          error={qrScannerError}
          setError={setQrScannerError}
          initialValue={scannerInitialValue || ''}
        />
      )}

      {/* ---- Receipt overlay ---- */}
      {transaction && receiptData && (
        <div className="fixed inset-0 z-50 bg-gray-100 p-2 sm:p-4 flex justify-center overflow-auto">
          <div className="w-full max-w-2xl">
            <POSReceipt data={receiptData} setData={setReceiptData} />
          </div>
        </div>
      )}
    </Suspense>
  )
}

// ---- Backlog card ----
function BacklogCard({
  item,
  onOpen,
  clickable = true,
  highlighted = false,
}: {
  item: SaleDeliveryBacklog
  onOpen: () => void
  clickable?: boolean
  highlighted?: boolean
}) {
  const isDelivered = item.isDelivered

  // Base look depends ONLY on delivered state — never on clickability.
  // Delivered → greyed. Not delivered → lively.
  const baseLook = isDelivered
    ? 'border-border bg-muted/70 opacity-70 grayscale'
    : 'border-border bg-card shadow-sm'

  // Hover / cursor behavior depends on whether clicks are enabled.
  const interactive = clickable
    ? isDelivered
      ? 'cursor-pointer hover:opacity-90 hover:scale-[1.03]'
      : 'cursor-pointer hover:shadow-lg hover:border-primary/40 hover:scale-[1.03]'
    : 'cursor-not-allowed'

  // Extra emphasis when the user searched and this is the match.
  const highlightLook = highlighted
    ? isDelivered
      ? 'ring-2 ring-primary/40'
      : 'ring-2 ring-primary shadow-xl border-primary/60 scale-[1.03]'
    : ''

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-disabled={!clickable}
      className={[
        'group w-full text-left rounded-xl border p-3 sm:p-4 lg:p-5 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary/40',
        baseLook,
        interactive,
        highlightLook,
      ].join(' ')}
    >
      {/* Number badge */}
      <div className="flex items-center justify-center py-1 sm:py-2">
        <div
          className={[
            'flex items-center justify-center rounded-full',
            'w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20',
            isDelivered ? 'bg-muted' : 'bg-primary/10',
          ].join(' ')}
        >
          <span
            className={[
              'font-bold leading-none',
              'text-xl sm:text-2xl lg:text-3xl',
              isDelivered ? 'text-muted-foreground' : 'text-primary',
            ].join(' ')}
          >
            {item.dailyCountNumber}
          </span>
        </div>
      </div>

      {/* Transaction number */}
      <div className="mt-2 sm:mt-3 text-center">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
          Transaction
        </p>
        <p
          className={[
            'mt-0.5 text-[11px] sm:text-[12px] font-medium truncate',
            isDelivered ? 'text-muted-foreground' : 'text-foreground',
          ].join(' ')}
        >
          {item.transactionNumber}
        </p>
      </div>

      {/* Date + time footer */}
      <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-border flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <p>{formatDate(item.saleDate)}</p>
        <p>{formatTime(item.createdAt)}</p>
      </div>

      {/* Delivered tag */}
      {isDelivered && (
        <div className="mt-1.5 sm:mt-2 text-center">
          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
            Delivered
          </span>
        </div>
      )}
    </button>
  )
}