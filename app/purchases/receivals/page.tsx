"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Plus, User } from "lucide-react";
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
} from "@/helpers/formatStrings";
import { Supplier, Transaction } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import TransactionDetailsTabs from '@/components/util/TransactionDetailsTabs';

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

const paymentMethods = [
  { name: "Mobile Money", id: 1 },
  { name: "Cash", id: 2 },
  { name: "Cheque", id: 3 },
  { name: "Bank Transfer", id: 4 },
  { name: "Other", id: 5 },
];

const DEFAULT_PAGE_SIZE = 25;

// ✅ Handles both the paginated { items, totalCount, ... } shape and legacy arrays.
function unwrapItems<T>(response: any): { items: T[]; total: number; pages: number } {
  const data = response?.data;
  if (Array.isArray(data)) {
    return { items: data, total: data.length, pages: 1 };
  }
  if (data && Array.isArray(data.items)) {
    return {
      items: data.items,
      total: data.totalCount ?? data.items.length,
      pages: data.totalPages ?? 1,
    };
  }
  return { items: [], total: 0, pages: 0 };
}

export default function PurcahsePage() {
  const toast = useToaster();
  const { selectedShop, user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [sales, setsales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<Transaction>>({});
  const [transactionDetails, setTransactionDetails] = useState<Partial<Transaction>>({});
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState('');
  const [suppliers, setsuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setselectedSupplier] = useState<string>();
  const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'deliveries' | 'reversals' | string>('items');

  // ✅ Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const isLoadingRef = useRef(false);

  // ────────────────────────────────────────────────
  // LOADERS
  // ────────────────────────────────────────────────
  const loadSuppliers = useCallback(async (): Promise<void> => {
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const locationId = selectedShop || sessionShop;
      const companyId = user?.companyId || (user as any)?.id || user;

      const suppliersResponse = await axiosInstance.get(
        `/Suppliers?companyId=${companyId}&locationId=${locationId}`
      );
      setsuppliers(suppliersResponse?.data ?? []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  }, [selectedShop, user]);

  const loadPurchases = useCallback(
    async (targetPage: number = page): Promise<void> => {
      try {
        setLoading(true);
        const sessionShop = sessionStore.get("selectedShop");
        const locationId = selectedShop || sessionShop;

        const params = new URLSearchParams({
          locationId: String(locationId ?? ''),
          generalStatus: '1',
          page: String(targetPage),
          pageSize: String(pageSize),
        });
        if (selectedSupplier) {
          params.set('supplierId', selectedSupplier);
        }

        const purchasesResponse = await axiosInstance.get(
          `/Purchases/Approved?${params.toString()}`
        );

        const { items, total, pages } = unwrapItems<Transaction>(purchasesResponse);
        setsales(items);
        setTotalCount(total);
        setTotalPages(pages);
      } catch (error) {
        console.error("Error loading purchases:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedShop, selectedSupplier, page, pageSize]
  );

  // Initial mount: suppliers only.
  useEffect(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    (async () => {
      await loadSuppliers();
      isLoadingRef.current = false;
    })();
  }, [loadSuppliers]);

  // Reload purchases on shop/supplier/page change.
  useEffect(() => {
    loadPurchases(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop, selectedSupplier, page]);

  // Reset page when the supplier filter changes.
  useEffect(() => {
    setPage(1);
  }, [selectedSupplier]);

  // ────────────────────────────────────────────────
  // DETAILS / PAYMENT / DELIVERY
  // ────────────────────────────────────────────────
  const reset = () => {
    setAmountPaid("");
    setDate("");
    setPaymentMethod("");
  };

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

  const submitPayment = async (): Promise<void> => {
    if (!amountPaid || !date || !paymentMethod) {
      toast.warning({ title: 'Enter all required fields', description: "" });
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

      setActiveTab("payments");
      reset();

      // ✅ Reload the current page (not a fresh full load)
      await loadPurchases(page);

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
            {suppliers?.find((x) => x.id == value.supplierId)?.supplierCompanyName}
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
          {formatNumberWithCommas((value.totalAmount ?? 0).toFixed(2))}
        </span>
      ),
    },
    {
      key: "paidAmount" as keyof Transaction,
      label: "Paid Amount",
      sortable: true,
      render: (value: Transaction) => (
        <span className="font-bold text-blue-500">
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
        const cls =
          debt > 0
            ? "font-bold text-red-500"
            : debt < 0
            ? "font-bold text-blue-500"
            : "";
        return (
          <span className={cls}>
            {formatNumberWithCommas(debt.toFixed(2))}
          </span>
        );
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

  // ✅ Pagination controls below the table
  const paginationControls = totalPages > 1 && (
    <div className="flex items-center justify-between gap-2 mt-3 px-2">
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {totalCount} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingOverlay />}>
      {loading && <LoadingOverlay />}
      <div className="min-h-screen w-full overflow-x-hidden">
        <Header title="Purchases from suppliers" />
        <div className="relative mt-2">
          {!modalOpen && (
            <CardContent className="m-0 p-0 overflow-x-auto">
              {/* ✅ DataTable now receives a real array */}
              <DataTable
                title="Approved Purchases"
                data={sales}
                columns={columns}
                searchKey="supplierName"
                addLabel="Add Purchase"
                emptyMessage=""
                onRowClick={(row) => openTransactionDetails(row)}
                height="h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]"
              />
              {paginationControls}
            </CardContent>
          )}

          <div className="absolute top-0 w-full" style={{ textAlign: 'center' }}>
            {modalOpen && (
              <div className="w-full">
                <TransactionUI
                  setOpen={setModalOpen}
                  reloadSetterFunction={setsales}
                  reloadUrl={`/Purchases/Approved?LocationId=${
                    selectedShop || sessionStore.get("selectedShop")
                  }&SuppliersId=${selectedSupplier}`}
                  submitUrl={`/Purchases`}
                  businessPartnerLable="Supplier"
                  businessPartnerName={`${
                    suppliers?.find((x) => x.id === selectedSupplier)?.supplierCompanyName || ""
                  } - ${
                    suppliers?.find((x) => x.id === selectedSupplier)?.firstName +
                      " " +
                      suppliers?.find((x) => x.id === selectedSupplier)?.lastName || ""
                  }`}
                  businessPartnerValue={selectedSupplier}
                  transactionActionType="PURCHASE"
                  instantSale={false}
                />
              </div>
            )}
          </div>

          <Modal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
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
              onAddDelivery={() => setShowDeliveryModal(true)}
              loading={loading}
              showItemsCode={false}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
          </Modal>

          <Modal
            isOpen={showDeliveryModal}
            onClose={() => setShowDeliveryModal(false)}
            title={`Receival from ${
              suppliers?.find((x) => x.id === selectedTransaction?.supplierId)
                ?.supplierCompanyName || ""
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
                reloadSetterFunction={setsales}
                submitUrl={`/Transactions/Delivery`}
                transactionActionType="PURCHASE"
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