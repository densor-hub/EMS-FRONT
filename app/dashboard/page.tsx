'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import axiosInstance from '@/lib/customAxios';
import { useAuth } from '@/lib/auth-context';
import { Transaction } from '@/lib/types';
import {
  defaultDateRange,
  filterByDateRange,
  sumItems,
  buildStatusBreakdown,
  salesDeliverySplit,
  paymentMethodBreakdown,
  topCustomersNetSales,
  topCustomersCoupons,
  topCustomersPendingDebts,
  topSuppliersPurchases,
  topSuppliersDebts,
  normalizeType,
} from '@/helpers/formatStrings';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import { Header } from '@/components/dashboard/header';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export default function AnalyticsPage() {
  const initial = defaultDateRange();
  const {selectedShop} = useAuth();
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    axiosInstance
      .get(`/Transactions?locationId=${selectedShop}`)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data ?? res?.data ?? [];
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? 'Failed to load transactions.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => filterByDateRange(transactions, startDate, endDate),
    [transactions, startDate, endDate]
  );

  // Cards
  const salesMetrics = useMemo(() => {
    const sales = filtered.filter((t) => normalizeType(t.type) === 'sale');
    return {
      count: sales.length,
      items: sales.reduce((s, t) => s + sumItems(t), 0),
      amount: sales.reduce((s, t) => s + t.totalAmount, 0),
    };
  }, [filtered]);

  const purchaseBreakdown = useMemo(
    () => buildStatusBreakdown(filtered.filter((t) => normalizeType(t.type) === 'purchase')),
    [filtered]
  );

  const transferBreakdown = useMemo(
    () => buildStatusBreakdown(filtered.filter((t) => normalizeType(t.type) === 'transfer')),
    [filtered]
  );

  const couponMetrics = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const t of filtered) {
      for (const p of t.payments ?? []) {
        if (p.coupon && p.coupon.amount > 0) {
          count++;
          amount += p.coupon.amount;
        }
      }
    }
    return { count, amount };
  }, [filtered]);

  // Pies
  const deliverySplit = useMemo(() => salesDeliverySplit(filtered), [filtered]);
  const paymentMethods = useMemo(() => paymentMethodBreakdown(filtered), [filtered]);

  const deliveryPie = [
    { name: 'Delivered', value: deliverySplit.delivered.amount, count: deliverySplit.delivered.count },
    { name: 'Pending', value: deliverySplit.pending.amount, count: deliverySplit.pending.count },
  ];

  const purchasePie = [
    { name: 'Pending', value: purchaseBreakdown.pending.amount, count: purchaseBreakdown.pending.count },
    { name: 'Approved', value: purchaseBreakdown.approved.amount, count: purchaseBreakdown.approved.count },
    { name: 'Declined', value: purchaseBreakdown.declined.amount, count: purchaseBreakdown.declined.count },
  ];

  const transferPie = [
    { name: 'Pending', value: transferBreakdown.pending.amount, count: transferBreakdown.pending.count },
    { name: 'Approved', value: transferBreakdown.approved.amount, count: transferBreakdown.approved.count },
    { name: 'Declined', value: transferBreakdown.declined.amount, count: transferBreakdown.declined.count },
  ];

  const paymentPie = paymentMethods.map((p) => ({ name: p.name, value: p.value }));

  // Bars
  const topCustNet = useMemo(() => topCustomersNetSales(filtered), [filtered]);
  const topCustCoupons = useMemo(() => topCustomersCoupons(filtered), [filtered]);
  const topCustDebts = useMemo(() => topCustomersPendingDebts(filtered), [filtered]);
  const topSuppPurchases = useMemo(() => topSuppliersPurchases(filtered), [filtered]);
  const topSuppDebts = useMemo(() => topSuppliersDebts(filtered), [filtered]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <LoadingOverlay />;

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className=" space-y-2">
      <Header title='Dashboard'/>
      <Card>
        
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>Insights across sales, purchases, transfers, and deposits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => {
              const d = defaultDateRange();
              setStartDate(d.startDate);
              setEndDate(d.endDate);
            }}>Last 7 days</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sales</CardDescription>
            <CardTitle className="text-3xl">{salesMetrics.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>Items: <span className="text-foreground font-medium">{salesMetrics.items.toLocaleString()}</span></div>
            <div>Amount: <span className="text-foreground font-medium">{fmt(salesMetrics.amount)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchases</CardDescription>
            <CardTitle className="text-3xl">
              {purchaseBreakdown.pending.count + purchaseBreakdown.approved.count + purchaseBreakdown.declined.count}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Pending</span><span>{purchaseBreakdown.pending.count} · {fmt(purchaseBreakdown.pending.amount)}</span></div>
            <div className="flex justify-between"><span>Approved</span><span>{purchaseBreakdown.approved.count} · {fmt(purchaseBreakdown.approved.amount)}</span></div>
            <div className="flex justify-between"><span>Declined</span><span>{purchaseBreakdown.declined.count} · {fmt(purchaseBreakdown.declined.amount)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Coupons</CardDescription>
            <CardTitle className="text-3xl">{couponMetrics.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Amount: <span className="text-foreground font-medium">{fmt(couponMetrics.amount)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Transfers</CardDescription>
            <CardTitle className="text-3xl">
              {transferBreakdown.pending.count + transferBreakdown.approved.count + transferBreakdown.declined.count}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Pending</span><span>{transferBreakdown.pending.count} · {fmt(transferBreakdown.pending.amount)}</span></div>
            <div className="flex justify-between"><span>Approved</span><span>{transferBreakdown.approved.count} · {fmt(transferBreakdown.approved.amount)}</span></div>
            <div className="flex justify-between"><span>Declined</span><span>{transferBreakdown.declined.count} · {fmt(transferBreakdown.declined.amount)}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SimplePie title="Sales — Delivery status" data={deliveryPie} />
        <SimplePie title="Purchases — Status" data={purchasePie} />
        <SimplePie title="Stock Transfers — Status" data={transferPie} />
        <SimplePie title="Payment methods — Amount" data={paymentPie} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <SimpleBar title="Top 20 Customers — Net sales (total − coupon)" data={topCustNet} color="#3b82f6" />
        <SimpleBar title="Top 20 Customers — Coupons" data={topCustCoupons} color="#10b981" />
        <SimpleBar title="Top 20 Customers — Outstanding debt" data={topCustDebts} color="#ef4444" />
        <SimpleBar title="Top 20 Suppliers — Purchases" data={topSuppPurchases} color="#8b5cf6" />
        <SimpleBar title="Top 20 Suppliers — Outstanding debt" data={topSuppDebts} color="#f97316" />
      </div>
    </div>
  );
}

function SimplePie({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number; count?: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: any, _n: any, entry: any) => [
                `${Number(value).toLocaleString()}${entry?.payload?.count != null ? ` (${entry.payload.count})` : ''}`,
                entry?.payload?.name,
              ]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleBar({
  title, data, color,
}: {
  title: string;
  data: { name: string; value: number }[];
  color: string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, data.length * 26)}>
            <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
              <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}