'use client'

import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { useToaster } from './CustomToast'
import { toastErrors } from '@/helpers/formatStrings'
import { Transaction } from '@/lib/types'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  visible: boolean
  onClose: () => void
  transaction: Transaction | null
  isLoading: boolean
  fetchTransaction: (decodedText: string) => void
  setError: Dispatch<SetStateAction<string | null>>
  error: string | null
  initialValue: string
}

const QRScanner: React.FC<QRScannerProps> = ({
  visible,
  onClose,
  isLoading,
  transaction,
  fetchTransaction,
  setError,
  error,
  initialValue
}) => {
  const toast = useToaster()
  const [qrValue, setQrValue] = useState('')
  const [scanning, setScanning] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [scannerRunning, setScannerRunning] = useState(false)

  const qrRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoFetchDoneRef = useRef(false)

  // ---- Safe stop scanner (sync wrapper around async stop) ----
  const safeStopScanner = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!html5QrCodeRef.current) {
      setScanning(false)
      setScannerRunning(false)
      return
    }

    Promise.resolve().then(async () => {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.warn('Failed to stop scanner', err)
      } finally {
        html5QrCodeRef.current = null
        setScannerRunning(false)
        setScanning(false)
      }
    })
  }

  // ---- Start scanner ----
  const startScanner = async () => {
    if (scannerRunning || !qrRef.current) return

    setPermissionDenied(false)
    setScannerRunning(true)
    setScanning(true)

    const scanner = new Html5Qrcode(qrRef.current.id)
    html5QrCodeRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          safeStopScanner()
          setQrValue(decodedText)
          await fetchTransaction(decodedText)
        },
        () => {}
      )
    } catch (err: any) {
      setScannerRunning(false)
      setScanning(false)

      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true)
        toastErrors(
          toast,
          'Camera access denied. Please allow camera permission.',
          'Permission Denied'
        )
      } else {
        console.error('Scanner start failed', err)
        toastErrors(toast, 'Failed to start camera', 'Camera Error')
      }
    }
  }

  // ---- Close handler ----
  const handleClose = () => {
    safeStopScanner()
    onClose()
  }

  // ---- Manual input submit ----
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qrValue.trim()) {
       await fetchTransaction(qrValue.trim())

    }
  }

  // ---- Visibility effect: only start the camera when there is NO initial value ----
  useEffect(() => {
    if (!visible) {
      safeStopScanner()
      return
    }

    // If a value was pre-supplied (e.g. clicked from backlog card),
    // don't open the camera — the auto-fetch effect will resolve it.
    if (initialValue) {
      return
    }

    const timer = setTimeout(() => {
      startScanner()
    }, 200)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValue])

  // ---- Reset guard + input when the modal closes ----
  useEffect(() => {
    if (!visible) {
      autoFetchDoneRef.current = false
      setQrValue('')
      setPermissionDenied(false)
    }
  }, [visible])

  // ---- Auto-fetch once per open when initialValue is provided ----
  useEffect(() => {
    if (!visible) return
    if (!initialValue) return
    if (autoFetchDoneRef.current) return

    autoFetchDoneRef.current = true
    setQrValue(initialValue)
    safeStopScanner() // ensure no camera is left running
    void fetchTransaction(initialValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValue])

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      safeStopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {initialValue ? 'Loading Transaction' : 'Scan QR Code'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* QR Scanner Container — hidden when resolving an initial value */}
          {!initialValue && (
            <div
              id="qr-scanner"
              ref={qrRef}
              className="w-full max-w-[400px] mx-auto mb-4 bg-gray-900 rounded-lg overflow-hidden"
              style={{ minHeight: '300px' }}
            />
          )}

          {/* Permission Denied Alert */}
          {permissionDenied && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Camera access denied. Please allow camera permission in your browser
                settings.
              </p>
            </div>
          )}

          {/* Scanning Status */}
          {scanning && !initialValue && (
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Scanning for QR code...</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading transaction...</span>
              </div>
            </div>
          )}

          {/* Stop Scanning Button */}
          {scanning && !initialValue && (
            <div className="text-center mt-4">
              <button
                onClick={() => safeStopScanner()}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                Stop Scanning
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && !transaction && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  if (initialValue) {
                    // Re-attempt the same lookup
                    void fetchTransaction(initialValue)
                  } else {
                    startScanner()
                  }
                }}
                className="mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or enter manually</span>
            </div>
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={qrValue}
              onChange={(e) => setQrValue(e.target.value)}
              placeholder="Enter transaction ID..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={isLoading || scanning}
            />
            <button
              type="submit"
              disabled={isLoading || scanning || !qrValue.trim()}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </form>
        </div>
      </div>
      {toast.ToastComponent}
    </div>
  )
}

export default QRScanner