// app/dashboard/page.tsx
'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Truck,
  AlertCircle,
  Loader2,
  Store,
  Bell,
  Activity,
  Sparkles,
  Construction,
  TrendingUp,
  Users,
  DollarSign,
  Package,
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

// ────────────────────────────────────────────────
// Skeleton primitives
// ────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      aria-hidden="true"
    />
  )
}

function SkeletonStatCard() {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-3 w-12 shrink-0" />
    </div>
  )
}

function SkeletonBarRow() {
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
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
    <div className="p-4 sm:p-6 pb-16">
      <Header
        title={`Welcome, ${firstName}`}
        description={shopName ? `Signed in at ${shopName}` : 'Dashboard'}
      />

      {/* ──────────────────────────────────────────── */}
      {/* Under construction banner */}
      {/* ──────────────────────────────────────────── */}
      <div className="mt-6 relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Construction className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                We&apos;re building something great
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              More widgets, insights, and analytics are on the way. In the
              meantime, here&apos;s a preview of what&apos;s coming.
            </p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* Real stats */}
      {/* ──────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Pending Deliveries"
          value={isLoading ? '…' : pendingDeliveries ?? '—'}
          icon={<Truck className="w-5 h-5" />}
          description="Today"
          variant={
            pendingDeliveries && pendingDeliveries > 0 ? 'warning' : 'success'
          }
        />

        {/* Skeleton stat cards for upcoming metrics */}
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* Error */}
      {/* ──────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* Skeleton widget grid */}
      {/* ──────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
              <span className="ml-auto text-[10px] font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                Soon
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="divide-y divide-border">
              <SkeletonListRow />
              <SkeletonListRow />
              <SkeletonListRow />
              <SkeletonListRow />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Alerts
              <span className="ml-auto text-[10px] font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                Soon
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="divide-y divide-border">
              <SkeletonListRow />
              <SkeletonListRow />
              <SkeletonListRow />
            </div>
          </CardContent>
        </Card>

        {/* Sales Overview */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Sales Overview
              <span className="ml-auto text-[10px] font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                Soon
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <SkeletonBarRow />
            <SkeletonBarRow />
            <SkeletonBarRow />
            <SkeletonBarRow />
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Top Items
              <span className="ml-auto text-[10px] font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                Soon
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="divide-y divide-border">
              <SkeletonListRow />
              <SkeletonListRow />
              <SkeletonListRow />
              <SkeletonListRow />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* Footer note */}
      {/* ──────────────────────────────────────────── */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Widgets shown above are placeholders and will light up as features ship.
      </p>
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