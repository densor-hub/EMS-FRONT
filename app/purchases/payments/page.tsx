"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { User } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { useToaster } from '@/components/util/CustomToast';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import {
  alphaNumericDate,
  formatNumberWithCommas,
  removeCommasFromNumbers,
  toastErrors,
  sessionStore,
  unwrapItems,
  readCachedSettings,
} from "@/helpers/formatStrings";
import { Supplier, Transaction } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import AddPayment from '@/app/purchases/addPayments';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import TransactionDetailsTabs from '@/components/util/TransactionDetailsTabs';
import { config, settings } from '@/components/util/AppConfig';

const Modal = dynamic(
  () => import('@/components/dashboard/modal').then(mod => mod.Modal),
  { ssr: false }
);
const TransactionUI = dynamic(
  () => import("@/components/util/SaleTransactionUi"),
  {
    loading: () => (
      <div className="w-full p-8 text-center animate-pulse">
        <LoadingOverlay />
      </div>
    ),
    ssr: false,
  }
);

const paymentMethods = config.paymentMethods;

export default function PurchasePage() {
  const toast = useToaster();
  const { selectedShop, user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [sales, setSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<Transaction>>({});
  const [transactionDetails, setTransactionDetails] = useState<Partial<Transaction>>({});
  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState('');
  const [suppliers, setsuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setselectedSupplier] = useState<string>();

  // ── Backend pagination state ──
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(readCachedSettings()?.defaultPageSize || 10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'deliveries' | 'reversals' | string>('items');

  const isLoadingRef = useRef(false);
  const pageRef = useRef(page);
  const supplierRef = useRef(selectedSupplier);
  const searchRef = useRef(searchTerm);
  const initializedRef = useRef(false);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { supplierRef.current = selectedSupplier; }, [selectedSupplier]);
  useEffect(() => { searchRef.current = searchTerm; }, [searchTerm]);

  // ────────────────────────────────────────────────
  // LOADERS
  // ────────────────────────────────────────────────
  const loadSuppliers = useCallback(async (): Promise<void> => {
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const locationId = selectedShop || sessionShop;
      const companyId = user?.companyId || (user as any)?.id || user;

      const res = await axiosInstance.get(
        `/Suppliers?companyId=${companyId}&locationId=${locationId}`
      );
      const { items } = unwrapItems<Supplier>(res);
      setsuppliers(items);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  }, [selectedShop, user]);

  const loadPendingPayments = useCallback(
    async (targetPage?: number): Promise<void> => {
      try {
        setLoading(true);
        const sessionShop = sessionStore.get("selectedShop");
        const locationId = selectedShop || sessionShop;
        const wantedPage = targetPage ?? pageRef.current;

        const params = new URLSearchParams({
          locationId: String(locationId ?? ""),
          page: String(wantedPage),
          pageSize: String(pageSize),
        });
        if (supplierRef.current) params.set("supplierId", supplierRef.current);
        if (searchRef.current.trim()) params.set("search", searchRef.current.trim());

        const res = await axiosInstance.get(
          `/Purchases/PendingPayments?${params.toString()}`
        );

        const { items, total, pages } = unwrapItems<Transaction>(res);
        setSales(items);
        setTotalCount(total);
        setTotalPages(pages);

        // If we've overshot (e.g. after a filter change), snap back.
        if (pages > 0 && wantedPage > pages) {
          setPage(pages);
        }
      } catch (error) {
        console.error("Error loading pending payments:", error);
        setSales([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [selectedShop, pageSize]
  );

  // Mount: suppliers + first page of pending payments.
  useEffect(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    (async () => {
      try {
        await Promise.all([loadSuppliers(), loadPendingPayments(1)]);
      } finally {
        initializedRef.current = true;
        isLoadingRef.current = false;
        setLoading(false);
      }
    })();
  }, [loadSuppliers, loadPendingPayments]);

  // Refetch when page / supplier / shop / search term changes.
  useEffect(() => {
    if (!initializedRef.current) return; // mount effect already fetched page 1
    void loadPendingPayments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedShop, selectedSupplier, searchTerm]);

  // Reset to page 1 when the supplier filter changes.
  useEffect(() => {
    if (!initializedRef.current) return;
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplier]);

  // ────────────────────────────────────────────────
  // RESET / REFETCH
  // ────────────────────────────────────────────────
  const reset = () => {
    setAmountPaid("");
    setDate("");
    setPaymentMethod("");
  };

  const refreshPending = useCallback(async () => {
    await loadPendingPayments(pageRef.current);
  }, [loadPendingPayments]);

  // ────────────────────────────────────────────────
  // TRANSACTION DETAILS
  // ────────────────────────────────────────────────
  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/Transactions/${transactionId}/location/${
          selectedShop || sessionStore.get("selectedShop")
        }`
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
    }
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
      toast.warning({ title: 'Enter all required fields', description: "" });
      return;
    }

    try {
      setLoading(true);

      const paymentObj = {
        transactionId: selectedTransaction?.transactionId,
        amount: removeCommasFromNumbers(amountPaid),
        paymentDate: date,
        paymentMethod: Number(paymentMethod),
      };

      await axiosInstance.post("/Transactions/Payment", paymentObj);

      setActiveTab("payments");
      reset();
      setShowAddPaymentModal(false);

      // Refresh the list on the SAME page the user was on.
      await refreshPending();

      if (selectedTransaction?.transactionId) {
        await fetchTransactionDetails(selectedTransaction.transactionId);
      }

      toast.success({
        title: 'Submitted successfully',
        description: 'Payment saved successfully',
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toastErrors(toast, error);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // COLUMNS
  // ────────────────────────────────────────────────
  const columns = [
    {
      key: "SuppliersName" as keyof Transaction,
      label: "Suppliers",
      sortable: true,
      render: (value: Transaction) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
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
        <span className="font-bold text-primary">
          {formatNumberWithCommas(value.totalAmount?.toFixed(2))}
        </span>
      ),
    },
    {
      key: "paidAmount" as keyof Transaction,
      label: "Paid Amount",
      sortable: true,
      render: (value: Transaction) => (
        <span className="font-bold text-blue-500">
          {formatNumberWithCommas(value.paidAmount?.toFixed(2))}
        </span>
      ),
    },
    {
      key: "debt" as keyof Transaction,
      label: "Debt",
      sortable: true,
      render: (value: Transaction) => {
        const debt = (value.totalAmount ?? 0) - (value.paidAmount ?? 0);
        const cls =
          debt > 0 ? "font-bold text-red-500"
          : debt < 0 ? "font-bold text-blue-500"
          : "";
        return <span className={cls}>{formatNumberWithCommas(debt.toFixed(2))}</span>;
      },
    },
    {
      key: "transactionDate" as keyof Transaction,
      label: "Date",
      render: (value: Transaction) =>
        alphaNumericDate(new Date(value.transactionDate).toLocaleDateString()),
    },
    {
      key: "transactionCode" as keyof Transaction,
      label: "Transaction Code",
      render: (value: Transaction) => (
        <span className="font-bold text-primary">{value.transactionCode}</span>
      ),
    },
  ];

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────
  return (
    <Suspense fallback={<LoadingOverlay />}>
      {loading && <LoadingOverlay />}
      <div className=" w-full overflow-x-hidden">
        <Header title="Purchases from suppliers" />
        <div className="relative mt-2">
          {!modalOpen && (
            <CardContent className="m-0 p-0 overflow-x-auto">
              <DataTable
                title="Approved Purchases"
                data={sales}
                columns={columns}
                searchKey="supplierName"
                addLabel="Add Purchase"
                emptyMessage="No data found."
                onRowClick={(row) => openTransactionDetails(row)}
                height="h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]"
                paginationMode="backend"
                serverPagination={{
                  page,
                  totalPages,
                  totalCount,
                  onPageChange: (p) => setPage(p),
                  onSearchChange: (term) => {
                    setSearchTerm(term);
                    setPage(1);
                  },
                }}
              />
            </CardContent>
          )}

          <Modal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setShowAddPaymentModal(false);
              setShowDeliveryModal(false);
              reset();
              setTransactionDetails({});
            }}
            title=""
            size="full"
            height="585px"
          >
            
            <TransactionDetailsTabs
              transactionDetails={transactionDetails}
              selectedTransaction={selectedTransaction}
              transactionType="purchase"
              businessPartnerName={selectedTransaction.supplierName || "Supplier"}
              paymentMethods={paymentMethods}
              onAddPayment={handleAddPayment}
              loading={loading}
              showItemsCode={false}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
          </Modal>

          <Modal
            isOpen={showAddPaymentModal}
            onClose={() => {
              setShowAddPaymentModal(false);
              reset();
            }}
            title="Add Payment"
            size="md"
          >
            <div className="space-y-4">
              <AddPayment
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                date={date}
                setDate={setDate}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                minDate={selectedTransaction?.transactionDate?.split("T")[0] || ""}
              />
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddPaymentModal(false);
                    reset();
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitPayment}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Payment'}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={showDeliveryModal}
            onClose={() => setShowDeliveryModal(false)}
            title={`Receival from ${
              suppliers?.find(x => x.id === selectedTransaction?.supplierId)?.supplierCompanyName || ""
            } (Trans # - ${selectedTransaction.transactionCode})`}
            size="full"
          >
            <div className="w-full">
              <DeliveryTransactionUI
                setOpen={setShowDeliveryModal}
                selectedTransaction={transactionDetails}
                setTransactionDetails={setTransactionDetails}
                reloadUrl={`/Purchases/Approved?LocationId=${
                  selectedShop || sessionStore.get("selectedShop")
                }&SuppliersId=${selectedSupplier}`}
                reloadSetterFunction={() => { void refreshPending(); }}
                submitUrl={`/Transactions/Delivery`}
                transactionActionType={config.transactionTypes.PURC}
                heading="Suppliers Delivery"
                setActiveTab={setActiveTab}
              />
            </div>
          </Modal>
        </div>

        {toast.ToastComponent}
      </div>
    </Suspense>
  );
}