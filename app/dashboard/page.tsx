'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable } from '@/components/dashboard/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
  Truck,
  CreditCard,
} from 'lucide-react';
// import { dashboardService, transactionService, stockService } from '@/lib/api-service';
import type { DashboardStats, Transaction, StockItem, Item } from '@/lib/types';
import { getCustomerById, getSupplierById, getItemById } from '@/lib/mock-data';
import Loading from './loading';
import { AuthGuard } from '@/routes/auth-guard';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Array<StockItem & { item: Item }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // setIsLoading(true);
        // const [statsData, transactionsData, lowStockData] = await Promise.all([
        //   dashboardService.getStats(),
        //   transactionService.getAll(),
        //   stockService.getLowStock(),
        // ]);
        // setStats(statsData);
        // setRecentTransactions(transactionsData.slice(0, 5));
        // setLowStockItems(lowStockData);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTransactionTypeLabel = (type: Transaction['type']) => {
    const labels: Record<Transaction['type'], string> = {
      sale: 'Sale',
      credit_sale: 'Credit Sale',
      purchase: 'Purchase',
      credit_purchase: 'Credit Purchase',
      deposit: 'Deposit',
      payment: 'Payment',
    };
    return labels[type];
  };

  const getTransactionTypeColor = (type: Transaction['type']) => {
    const colors: Record<Transaction['type'], string> = {
      sale: 'bg-success/20 text-success',
      credit_sale: 'bg-warning/20 text-warning',
      purchase: 'bg-info/20 text-info',
      credit_purchase: 'bg-destructive/20 text-destructive',
      deposit: 'bg-primary/20 text-primary',
      payment: 'bg-success/20 text-success',
    };
    return colors[type];
  };

  const getPartyName = (transaction: Transaction) => {
    // if (transaction.customerId) {
    //   const customer = getCustomerById(transaction.customerId);
    //   return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
    // }
    // if (transaction.supplierId) {
    //   const supplier = getSupplierById(transaction.supplierId);
    //   return supplier ? supplier.name : 'Unknown Supplier';
    // }
    return '-';
  };

  if (isLoading) {
    return <Loading/>
  }

  return (
    <AuthGuard>
        <div className="min-h-screen">
      <Header title="Dashboard" description="Overview of your enterprise operations" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Sales"
            value={formatCurrency(stats?.totalSales || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: 12.5, isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Total Purchases"
            value={formatCurrency(stats?.totalPurchases || 0)}
            icon={<ShoppingCart className="w-5 h-5" />}
            trend={{ value: 8.2, isPositive: true }}
            variant="primary"
          />
          <StatsCard
            title="Pending Credits"
            value={formatCurrency(stats?.pendingCredits || 0)}
            icon={<CreditCard className="w-5 h-5" />}
            description="Outstanding receivables"
            variant="warning"
          />
          <StatsCard
            title="Low Stock Items"
            value={stats?.lowStockItems || 0}
            icon={<AlertTriangle className="w-5 h-5" />}
            description="Items below reorder level"
            variant="danger"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Customers"
            value={stats?.totalCustomers || 0}
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Total Suppliers"
            value={stats?.totalSuppliers || 0}
            icon={<Truck className="w-5 h-5" />}
          />
          <StatsCard
            title="Total Items"
            value={stats?.totalItems || 0}
            icon={<Package className="w-5 h-5" />}
          />
          <StatsCard
            title="Total Employees"
            value={stats?.totalEmployees || 0}
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Badge className={getTransactionTypeColor(transaction.type)}>
                        {getTransactionTypeLabel(transaction.type)}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getPartyName(transaction)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(transaction.totalAmount)}
                      </p>
                      <Badge
                        variant={transaction.status === 'completed' ? 'default' : 'outline'}
                        className={
                          transaction.status === 'completed'
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning'
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {lowStockItems.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    All items are well stocked
                  </div>
                ) : (
                  lowStockItems.map(stock => (
                    <div key={stock.id} className="flex items-center justify-between p-4 hover:bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">{stock.item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {stock.item.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-destructive">
                          {stock.quantity} {stock.item.unitOfMeasure}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reorder at: {stock.item.reorderLevel}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    </AuthGuard>
  );
}
