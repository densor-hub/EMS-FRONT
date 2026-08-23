"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Eye,
} from "lucide-react";
import { apiService } from "@/lib/api-service";
import type { Transaction } from "@/lib/types";
import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/dashboard/modal";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(
    null
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiService.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : transactions.filter((t) => {
          if (activeTab === "sales") return t.type === "sale" || t.type === "credit_sale";
          if (activeTab === "purchases")
            return t.type === "purchase" || t.type === "credit_purchase";
          return true;
        });

  const salesTotal = transactions
    .filter((t) => t.type === "sale" || t.type === "credit_sale")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const purchasesTotal = transactions
    .filter((t) => t.type === "purchase" || t.type === "credit_purchase")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const netRevenue = salesTotal - purchasesTotal;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "sale":
        return "bg-green-100 text-green-800";
      case "credit_sale":
        return "bg-yellow-100 text-yellow-800";
      case "purchase":
        return "bg-blue-100 text-blue-800";
      case "credit_purchase":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "sale":
        return "Cash Sale";
      case "credit_sale":
        return "Credit Sale";
      case "purchase":
        return "Cash Purchase";
      case "credit_purchase":
        return "Credit Purchase";
      default:
        return type;
    }
  };

  const columns = [
    {
      key: "createdAt" as keyof Transaction,
      label: "Date",
      sortable: true,
      render: (transaction: Transaction) => (
        <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "type" as keyof Transaction,
      label: "Type",
      render: (transaction: Transaction) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
          {getTypeLabel(transaction.type)}
        </span>
      ),
    },
    {
      key: "items" as keyof Transaction,
      label: "Items",
      render: (transaction: Transaction) => (
        <span>{transaction.items?.length || 0} item(s)</span>
      ),
    },
    {
      key: "customerId" as keyof Transaction,
      label: "Customer/Supplier",
      render: (transaction: Transaction) =>
        transaction.customerId || transaction.supplierName || (
          <span className="text-gray-500">Walk-in</span>
        ),
    },
    {
      key: "totalAmount" as keyof Transaction,
      label: "Amount",
      sortable: true,
      render: (transaction: Transaction) => (
        <span
          className={`font-bold ${transaction.type.includes("sale") ? "text-green-600" : "text-red-600"}`}
        >
          {transaction.type.includes("sale") ? "+" : "-"}${transaction.totalAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status" as keyof Transaction,
      label: "Status",
      render: (transaction: Transaction) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          transaction.status === "completed" 
            ? "bg-green-100 text-green-800" 
            : "bg-yellow-100 text-yellow-800"
        }`}>
          {transaction.status}
        </span>
      ),
    },
    {
      key: "actions" as keyof Transaction,
      label: "Actions",
      render: (transaction: Transaction) => (
        <button
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => setViewTransaction(transaction)}
        >
          <Eye size={14} className="mr-1.5" />
          View
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">
            View and manage all transactions
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          <Download size={16} className="mr-2" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-50">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Sales</p>
              <h3 className="text-2xl font-bold text-green-600">
                GHC {salesTotal.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50">
              <TrendingDown className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Purchases</p>
              <h3 className="text-2xl font-bold text-red-600">
                GHC {purchasesTotal.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Net Revenue</p>
              <h3
                className={`text-2xl font-bold ${netRevenue >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                GHC {netRevenue.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-3 px-4 font-medium text-sm ${activeTab === "all" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("all")}
            >
              All Transactions
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm ${activeTab === "sales" ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("sales")}
            >
              Sales
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm ${activeTab === "purchases" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("purchases")}
            >
              Purchases
            </button>
          </nav>
        </div>
        <div className="p-0">
          <DataTable
            columns={columns}
            data={filteredTransactions}
            searchKeys={["customerId", "supplierName"]}
          />
        </div>
      </div>

      <Modal
        isOpen={!!viewTransaction}
        onClose={() => setViewTransaction(null)}
        title="Transaction Details"
        size="lg"
      >
        {viewTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Transaction Type</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getTypeColor(viewTransaction.type)}`}>
                  {getTypeLabel(viewTransaction.type)}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  viewTransaction.status === "completed" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {viewTransaction.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Date</p>
                <p className="font-medium">
                  {new Date(viewTransaction.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">
                  {viewTransaction.type.includes("sale") ? "Customer" : "Supplier"}
                </p>
                <p className="font-medium">
                  {viewTransaction.customerId ||
                    viewTransaction.supplierName ||
                    "Walk-in Customer"}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold mb-3">Items</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                {viewTransaction.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between py-2 border-b border-gray-200 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} x ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-bold">${item.total.toFixed(2)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-3 mt-2 border-t border-gray-200">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-blue-600">
                    ${viewTransaction.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}