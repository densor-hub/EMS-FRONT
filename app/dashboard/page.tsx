// app/dashboard/page.tsx
'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Truck,
  AlertCircle,
  Loader2,
  Store,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import axiosInstance from '@/lib/customAxios'
import { LoadingOverlay } from '@/components/SkeletonLoading'

interface SaleDeliveryBacklog {
  transactionNumber: string
  dailyCountNumber: number
  saleDate: string
  saleDeliveryRequestId: string
  createdAt: string
  isDelivered: boolean
}

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function DashboardContent() {
  const { user, selectedShop } = useAuth()
  const sessionShop =
    typeof window !== 'undefined' ? sessionStorage.getItem('selectedShop') : null
  const currentShopId = selectedShop || sessionShop || ''

  const [pendingDeliveries, setPendingDeliveries] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentShopId) return
    void loadPendingDeliveries(currentShopId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShopId])

  const loadPendingDeliveries = async (shopId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await axiosInstance.get(
        `/Sales/SaleDeliveryBackLogs/${shopId}`,
        { params: { SaleDate: todayISO() } }
      )
      const list: SaleDeliveryBacklog[] = Array.isArray(data) ? data : []
      setPendingDeliveries(list.filter((b) => !b.isDelivered).length)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (typeof err?.response?.data === 'string' ? err.response.data : null) ||
          'Could not load dashboard data.'
      )
      setPendingDeliveries(null)
    } finally {
      setIsLoading(false)
    }
  }

  const firstName = user?.firstName || 'there'
  const shopName = user?.locations?.find((l) => l.id === currentShopId)?.name

  return (
    <div className="p-4 sm:p-6">
      <Header
        title={`Welcome, ${firstName}`}
        description={shopName ? `Signed in at ${shopName}` : 'Dashboard'}
      />

      {/* --- Real stats --- */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Pending Deliveries"
          value={isLoading ? '…' : pendingDeliveries ?? '—'}
          icon={<Truck className="w-5 h-5" />}
          description="Today"
          variant={pendingDeliveries && pendingDeliveries > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* --- Error --- */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* --- Placeholder area for future widgets --- */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Activity feed coming soon.
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing to flag right now.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}