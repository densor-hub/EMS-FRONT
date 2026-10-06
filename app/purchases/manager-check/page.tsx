"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense } from "react";
import { Plus, User, Package, CreditCard, Truck, RotateCcw } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { useToaster } from '@/components/util/CustomToast';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import {
  alphaNumericDate,
  formatNumberWithCommas,
  removeCommasFromNumbers,
  toastErrors,
} from "@/helpers/formatStrings";
import { Supplier, Transaction } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import AddPayment from '@/app/purchases/addPayments';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { sessionStore } from '@/helpers/formatStrings';

// Dynamic imports
const Modal = dynamic(
  () => import('@/components/dashboard/modal').then(mod => mod.Modal),
  { ssr: false }
);

const paymentMethods = [
  { name: "Mobile Money", id: 1 },
  { name: "Cash", id: 2 },
  { name: "Cheque", id: 3 },
  { name: "Bank Transfer", id: 4 },
  { name: "Other", id: 5 },
];

type TabKey = 'items' | 'payments' | 'deliveries' | 'reversals';

export default function PurchasePage() {
  const toast = useToaster();
  const { selectedShop, user } = useAuth();

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState('');

  // Data state
  const [sales, setsales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [suppliers, setsuppliers] = useState<Supplier[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<Transaction>>({});
  const [transactionDetails, setTransactionDetails] = useState<Partial<Transaction>>({});
  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  const [selectedSupplier, setselectedSupplier] = useState<string>();

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('items');

  // Manager response state
  const [remarks, setRemarks] = useState<string>("");
  const [remarksError, setRemarksError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isLoadingRef = useRef(false);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async (): Promise<void> => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const locationId = selectedShop || sessionShop;
      const companyId = user?.companyId || user;

      const suppliersResponse = await axiosInstance.get(
        `/Suppliers?companyId=${companyId}&locationId=${locationId}`
      );
      setsuppliers(suppliersResponse?.data);

      const purchasesResponse = await axiosInstance.get(
        `/Purchases/Requests?locationId=${locationId}&generalStatus=1`
      );
      setsales(purchasesResponse?.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const refetchPurchases = async () => {
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const purchasesResponse = await axiosInstance.get(
        `/Purchases/Requests?locationId=${selectedShop || sessionShop}&generalStatus=1`
      );
      setsales(purchasesResponse?.data);
    } catch (error) {
      console.error("Error refetching purchases:", error);
    }
  };

  const reset = () => {
    setAmountPaid("");
    setDate("");
    setPaymentMethod("");
  };

  const resetManagerResponse = () => {
    setRemarks("");
    setRemarksError("");
  };

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/Transactions/${transactionId}/location/${selectedShop || sessionStorage?.getItem("selectedShop")}`
      );
      setTransactionDetails(response?.data);
      return response?.data;
    } catch (error: any) {
      console.error("Error fetching transaction details:", error);
      toast.error({
        title: 'Failed to load details',
        description: error?.response?.data?.message || 'Please try again later',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openTransactionDetails = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    const details = await fetchTransactionDetails(
      transaction.transactionId || transaction.id || ""
    );
    if (details) {
      setTransactionDetails(details);
      setDetailsModalOpen(true);
      setActiveTab("items");
      resetManagerResponse();
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setShowAddPaymentModal(false);
    setShowDeliveryModal(false);
    reset();
    resetManagerResponse();
    setTransactionDetails({});
    setSelectedTransaction({});
    setActiveTab("items");
  };

  // ────────────────────────────────────────────────
  // PAYMENTS
  // ────────────────────────────────────────────────
  const handleAddPayment = () => {
    const totalPaid =
      transactionDetails?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    const totalAmount = transactionDetails?.totalAmount || 0;

    if (totalPaid >= totalAmount) {
      toast.warning({
        title: 'Payment Complete',
        description: 'All payments for this transaction have been completed.',
      });
      return;
    }
    setShowAddPaymentModal(true);
  };

  const submitPayment = async (): Promise<void> => {
    if (!amountPaid || !date || !paymentMethod) {
      toast.warning({
        title: 'Enter all required fields',
        description: 'Amount, date, and payment method are required.',
      });
      return;
    }

    try {
      setLoading(true);
      const paymentObj = {
        transationId: selectedTransaction?.transactionId,
        amount: removeCommasFromNumbers(amountPaid),
        paymentDate: date,
        paymentMethod: Number(paymentMethod),
      };

      await axiosInstance.post("/Transactions/Payment", paymentObj);

      reset();
      setShowAddPaymentModal(false);
      setActiveTab("payments");

      await refetchPurchases();

      if (selectedTransaction?.transactionId) {
        await fetchTransactionDetails(selectedTransaction.transactionId);
      }

      toast.success({
        title: 'Submitted successfully',
        description: 'Payment saved successfully',
      });
    } catch (error: any) {
      console.error("Error creating deposit:", error);
      toastErrors(toast, error);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // DELIVERIES
  // ────────────────────────────────────────────────
  const handleAddDelivery = () => {
    setShowDeliveryModal(true);
  };

  const onDeliverySuccess = async () => {
    setShowDeliveryModal(false);
    setActiveTab("deliveries");
    if (selectedTransaction?.transactionId) {
      await fetchTransactionDetails(selectedTransaction.transactionId);
    }
  };

  // ────────────────────────────────────────────────
  // MANAGER RESPONSE
  // ────────────────────────────────────────────────
  const submitManagerResponse = async (action: 'approve' | 'decline'): Promise<void> => {
    if (action === 'decline' && !remarks.trim()) {
      setRemarksError("Remarks are required when declining.");
      return;
    }

    try {
      setSubmitting(true);
      setRemarksError("");

      const payload = {
        transactionId: selectedTransaction?.transactionId,
        status: action === 'approve' ? 3 : -2, // adjust to your API codes
        remarks: remarks.trim() || null,
      };

      await axiosInstance.put(`/Purchases`, payload);

      toast.success({
        title: action === 'approve' ? 'Purchase approved' : 'Purchase declined',
        description: `Transaction ${selectedTransaction?.transactionCode} was ${
          action === 'approve' ? 'approved' : 'declined'
        } successfully.`,
      });

      closeDetailsModal();
      await refetchPurchases();
    } catch (error: any) {
      console.error("Error submitting manager response:", error);
      toastErrors(toast, error);
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────
  // TABLE COLUMNS
  // ────────────────────────────────────────────────
  const columns = [
    {
      key: "SuppliersName" as keyof Transaction,
      label: "Suppliers",
      sortable: true,
      render: (value: Transaction) => (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-xs sm:text-sm truncate">
            {suppliers?.find(x => x.id == value.supplierId)?.supplierCompanyName}
          </span>
        </div>
      ),
    },
    {
      key: "totalAmount" as keyof Transaction,
      label: "Total Amount",
      sortable: true,
      render: (value: Transaction) => (
        <span className="font-bold text-primary text-xs sm:text-sm">
          {formatNumberWithCommas((value.totalAmount ?? 0).toFixed(2))}
        </span>
      ),
    },
    {
      key: "paidAmount" as keyof Transaction,
      label: "Paid Amount",
      sortable: true,
      render: (value: Transaction) => (
        <span className="font-bold text-blue-500 text-xs sm:text-sm">
          {formatNumberWithCommas((value.paidAmount ?? 0).toFixed(2))}
        </span>
      ),
    },
    {
      key: "debt" as keyof Transaction,
      label: "Debt",
      sortable: true,
      render: (value: Transaction) => {
        const debt = (value.totalAmount ?? 0) - (value.paidAmount ?? 0);
        const cls = debt > 0 ? "font-bold text-red-500" : debt < 0 ? "font-bold text-blue-500" : "";
        return (
          <span className={`${cls} text-xs sm:text-sm`}>
            {formatNumberWithCommas(debt.toFixed(2))}
          </span>
        );
      },
    },
    {
      key: "transactionDate" as keyof Transaction,
      label: "Date",
      render: (value: Transaction) => (
        <span className="text-xs sm:text-sm">
          {alphaNumericDate(new Date(value.transactionDate).toLocaleDateString())}
        </span>
      ),
    },
    {
      key: "transactionCode" as keyof Transaction,
      label: "Transaction Code",
      render: (value: Transaction) => (
        <span className="font-bold text-primary text-xs sm:text-sm">
          {value.transactionCode}
        </span>
      ),
    },
  ];

  // ────────────────────────────────────────────────
  // TAB CONTENT
  // ────────────────────────────────────────────────
  const renderItemsTab = () => {
    const items: any[] = (transactionDetails as any)?.items ?? [];
    return (
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-[11px] sm:text-sm min-w-[440px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Item</th>
              <th className="text-right px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Qty</th>
              <th className="text-right px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Unit Price</th>
              <th className="text-right px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 sm:px-3 py-4 sm:py-6 text-center text-muted-foreground">
                  No items found for this transaction.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const qty = item.quantity ?? item.qty ?? 0;
                const price = item.unitPrice ?? 0;
                return (
                  <tr key={item.id ?? idx} className="border-t">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2">{item.itemName ?? item.name ?? "—"}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right">{qty}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                      {formatNumberWithCommas(price.toFixed(2))}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">
                      {formatNumberWithCommas((qty * price).toFixed(2))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPaymentsTab = () => {
    const payments: any[] = (transactionDetails as any)?.payments ?? [];
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddPayment} className="text-xs sm:text-sm h-8 sm:h-9">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Add Payment
          </Button>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-[11px] sm:text-sm min-w-[360px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Date</th>
                <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Method</th>
                <th className="text-right px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 sm:px-3 py-4 sm:py-6 text-center text-muted-foreground">
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p, idx) => (
                  <tr key={p.id ?? idx} className="border-t">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                      {p.paymentDate
                        ? alphaNumericDate(new Date(p.paymentDate).toLocaleDateString())
                        : "—"}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                      {paymentMethods.find(m => m.id === p.paymentMethod)?.name ?? "—"}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">
                      {formatNumberWithCommas((p.amount ?? 0).toFixed(2))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDeliveriesTab = () => {
    const deliveries: any[] = (transactionDetails as any)?.deliveries ?? [];
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddDelivery} className="text-xs sm:text-sm h-8 sm:h-9">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Record Delivery
          </Button>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-[11px] sm:text-sm min-w-[440px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Date</th>
                <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Received By</th>
                <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Status</th>
                <th className="text-right px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 sm:px-3 py-4 sm:py-6 text-center text-muted-foreground">
                    No deliveries recorded.
                  </td>
                </tr>
              ) : (
                deliveries.map((d, idx) => (
                  <tr key={d.id ?? idx} className="border-t">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                      {d.deliveryDate
                        ? alphaNumericDate(new Date(d.deliveryDate).toLocaleDateString())
                        : "—"}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2">{d.receivedBy ?? "—"}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2">{d.status ?? "—"}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right">{d.items?.length ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReversalsTab = () => {
    const reversals: any[] = (transactionDetails as any)?.reversals ?? [];
    return (
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-[11px] sm:text-sm min-w-[360px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Date</th>
              <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Reason</th>
              <th className="text-right px-2 sm:px-3 py-1.5 sm:py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {reversals.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 sm:px-3 py-4 sm:py-6 text-center text-muted-foreground">
                  No reversals recorded.
                </td>
              </tr>
            ) : (
              reversals.map((r, idx) => (
                <tr key={r.id ?? idx} className="border-t">
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                    {r.reversalDate
                      ? alphaNumericDate(new Date(r.reversalDate).toLocaleDateString())
                      : "—"}
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2">{r.reason ?? "—"}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">
                    {formatNumberWithCommas((r.amount ?? 0).toFixed(2))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'items', label: 'Items', icon: Package },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'deliveries', label: 'Deliveries', icon: Truck },
    { key: 'reversals', label: 'Reversals', icon: RotateCcw },
  ];

  return (
    <Suspense fallback={<LoadingOverlay />}>
      {loading && <LoadingOverlay />}
      <div className="min-h-screen w-full overflow-x-hidden" >
        <Header title="Purchases from suppliers" />
        <div className="relative">
          <div className="flex flex-row sm:flex-row justify-between gap-2 sm:gap-4 mb-2" />

          <CardContent className="m-0 p-0 overflow-x-auto">
            <DataTable
              title="All Purchases"
              data={
                selectedSupplier
                  ? sales.filter(sale => sale.supplierId === selectedSupplier)
                  : sales
              }
              columns={columns}
              searchKey="supplierName"
              addLabel="Add Purchase"
              emptyMessage="No transaction found for the selected supplier."
              onRowClick={(row) => openTransactionDetails(row)}
            />
          </CardContent>

          {/* ──────────────────────────── DETAILS MODAL ──────────────────────────── */}
          <Modal
            isOpen={detailsModalOpen}
            onClose={closeDetailsModal}
            title={`Purchase ${selectedTransaction?.transactionCode ?? ""}`}
            size="full"
            height="585px"
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-1 sm:px-3 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="rounded-lg border p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Supplier</p>
                    <p className="font-medium text-xs sm:text-sm truncate">
                      {suppliers?.find(x => x.id === selectedTransaction?.supplierId)
                        ?.supplierCompanyName || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-xs sm:text-sm">
                      {selectedTransaction?.transactionDate
                        ? alphaNumericDate(
                            new Date(selectedTransaction.transactionDate).toLocaleDateString()
                          )
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-primary text-xs sm:text-sm">
                      {formatNumberWithCommas((transactionDetails?.totalAmount ?? 0).toFixed(2))}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
                    <p className="font-bold text-red-500 text-xs sm:text-sm">
                      {formatNumberWithCommas(
                        (
                          (transactionDetails?.totalAmount ?? 0) -
                          (transactionDetails?.paidAmount ?? 0)
                        ).toFixed(2)
                      )}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                {/* <div className="border-b">
                  <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(t => {
                      const Icon = t.icon;
                      const isActive = activeTab === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setActiveTab(t.key)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            isActive
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div> */}

                {/* Tab content */}
                <div>
                  {activeTab === 'items' && renderItemsTab()}
                  {activeTab === 'payments' && renderPaymentsTab()}
                  {activeTab === 'deliveries' && renderDeliveriesTab()}
                  {activeTab === 'reversals' && renderReversalsTab()}
                </div>

                {/* Remarks */}
                <div>
                  <Label htmlFor="remarks" className="text-xs sm:text-sm font-semibold">
                    Remarks {remarksError && <span className="text-red-500">*</span>}
                  </Label>
                  <textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      if (remarksError) setRemarksError("");
                    }}
                    placeholder="Add remarks (required when declining)..."
                    rows={3}
                    className={`mt-1.5 sm:mt-2 w-full rounded-md border bg-background px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring ${
                      remarksError ? "border-red-500" : ""
                    }`}
                  />
                  {remarksError && (
                    <p className="mt-1 text-[10px] sm:text-xs text-red-500">{remarksError}</p>
                  )}
                </div>
              </div>

              {/* Sticky footer */}
              {/* Sticky footer */}
            <div className="border-t px-3 sm:px-6 py-2.5 sm:py-3 flex flex-row justify-end gap-2 sm:gap-3 bg-background">
              <Button
                variant="outline"
                onClick={() => submitManagerResponse('decline')}
                disabled={submitting}
                className="text-red-600 border-red-300 hover:bg-red-500 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-none px-2 sm:px-4"
              >
                {submitting ? "Submitting..." : "Decline"}
              </Button>
              <Button
                onClick={() => submitManagerResponse('approve')}
                disabled={submitting}
                className="text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-none px-1 sm:px-4"
              >
                {submitting ? "Submitting..." : "Approve"}
              </Button>
            </div>
            </div>
          </Modal>

          {/* ──────────────────────────── ADD PAYMENT MODAL ──────────────────────────── */}
          {/* {showAddPaymentModal && (
            <Modal
              isOpen={showAddPaymentModal}
              onClose={() => {
                reset();
                setShowAddPaymentModal(false);
              }}
              title="Add Payment"
              size="md"
            >
              <div className="p-4">
                <AddPayment
                  amountPaid={amountPaid}
                  setAmountPaid={setAmountPaid}
                  date={date}
                  setDate={setDate}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  paymentMethods={paymentMethods}
                  onSubmit={submitPayment}
                  onCancel={() => {
                    reset();
                    setShowAddPaymentModal(false);
                  }}
                />
              </div>
            </Modal>
          )} */}

          {/* ──────────────────────────── DELIVERY MODAL ──────────────────────────── */}
          {/* {showDeliveryModal && (
            <Modal
              isOpen={showDeliveryModal}
              onClose={() => setShowDeliveryModal(false)}
              title="Record Delivery"
              size="lg"
            >
              <div className="p-4">
                <DeliveryTransactionUI
                  transaction={transactionDetails}
                  onClose={() => setShowDeliveryModal(false)}
                  onSuccess={onDeliverySuccess}
                />
              </div>
            </Modal>
          )} */}
        </div>

        {toast.ToastComponent}
      </div>
    </Suspense>
  );
}