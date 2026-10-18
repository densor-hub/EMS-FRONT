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
import AddPayment from '@/app/purchases/addPayments';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import TransactionDetailsTabs from '@/components/util/TransactionDetailsTabs';
import { CustomSelect } from '@/components/util/CustomSelect';

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

// ✅ Shape of the paginated response from the backend.
interface PagedPurchasesResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

const DEFAULT_PAGE_SIZE = 25;

export default function PurcahseRequestPage() {
  const toast = useToaster();
  const { selectedShop, user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [sales, setsales] = useState<Transaction[]>([]);
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
  const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'deliveries' | 'reversals' | string>('items');

  // ✅ Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const isLoadingRef = useRef(false);

  // ✅ Normalizes a backend response (paginated OR plain array) into an array.
  const unwrapItems = <T,>(response: any): { items: T[]; total: number; pages: number } => {
    const data = response?.data;
    if (Array.isArray(data)) {
      // Legacy shape: plain array
      return { items: data, total: data.length, pages: 1 };
    }
    if (data && Array.isArray(data.items)) {
      // New paginated shape
      return {
        items: data.items,
        total: data.totalCount ?? data.items.length,
        pages: data.totalPages ?? 1,
      };
    }
    return { items: [], total: 0, pages: 0 };
  };

  const loadInitialData = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);

    try {
      const sessionShop = sessionStore.get("selectedShop");
      const shop = selectedShop || sessionShop;

      const suppliersResponse = await axiosInstance.get(
        `/Suppliers?companyId=${user?.companyId || user}&locationId=${shop}`
      );
      setsuppliers(suppliersResponse?.data ?? []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [selectedShop, user]);

  // ✅ Loads one page of purchases; used on mount, after filters, and after mutations.
  const loadPurchases = useCallback(async (targetPage: number = page): Promise<void> => {
    try {
      setLoading(true);
      const sessionShop = sessionStore.get("selectedShop");
      const shop = selectedShop || sessionShop;

      // Query string: all filters now live server-side.
      const params = new URLSearchParams({
        locationId: String(shop ?? ''),
        generalStatus: '1',
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (selectedSupplier) {
        params.set('supplierId', selectedSupplier);
      }

      const purchasesResponse = await axiosInstance.get(
        `/Purchases/Requests?${params.toString()}`
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
  }, [selectedShop, selectedSupplier, page, pageSize]);

  // Initial mount: suppliers only.
  // useEffect(() => {
    
  // }, [loadInitialData]);

  // Whenever supplier or page changes, reload the purchases page.
  useEffect(() => {
    loadPurchases(page).then((res) => {
      console.log(res)
      loadInitialData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop, selectedSupplier, page]);

  // Reset to page 1 whenever supplier changes.
  useEffect(() => {
    setPage(1);
  }, [selectedSupplier]);

  const reset = () => {
    setAmountPaid("");
    setDate("");
    setPaymentMethod("");
  };

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setLoading(true);
      const shop = selectedShop || sessionStorage?.getItem("selectedShop");
      const response = await axiosInstance.get(
        `/Transactions/${transactionId}/location/${shop}`
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

  const handleAddPayment = () => {
    const totalPaid =
      transactionDetails?.payments?.reduce(
        (sum: number, p: any) => sum + p.amount,
        0
      ) || 0;
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
        transationId: selectedTransaction?.transactionId,
        amount: removeCommasFromNumbers(amountPaid),
        paymentDate: date,
        paymentMethod: Number(paymentMethod),
      };

      await axiosInstance.post("/Transactions/Payment", paymentObj);

      setActiveTab("payments");
      reset();
      setShowAddPaymentModal(false);

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
      render: (value: Transaction) => (
        <span
          className={
            value.totalAmount - value.paidAmount > 0
              ? `font-bold text-red-500`
              : value.totalAmount - value.paidAmount < 0
              ? `font-bold text-blue-500`
              : ""
          }
        >
          {formatNumberWithCommas((value.totalAmount - value.paidAmount)?.toFixed(2))}
        </span>
      ),
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

  // Pagination footer (wire to DataTable if it supports it; else render below).
  const paginationControls = totalPages > 1 && (
    <div className="flex items-center justify-between gap-2 mt-2 px-1">
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
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4 mb-2">
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-[320px] p-1">
              <CustomSelect
                options={suppliers?.map((x) => ({
                  value: x.id.toString(),
                  label: x.supplierCompanyName,
                }))}
                value={selectedSupplier}
                onValueChange={setselectedSupplier}
                placeholder="Select Supplier"
                required={true}
                searchable={true}
                clearable={true}
                size="md"
              />
            </div>

            {!modalOpen && (
              <div>
                <Button
                  className="w-[95%] m-auto sm:w-auto relative right-2"
                  onClick={() => {
                    if (!selectedSupplier) {
                      toast.info({
                        title: 'Select Suppliers',
                        description: 'Please select Suppliers to add',
                      });
                      return;
                    }
                    setModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>
            )}
          </div>

          {!modalOpen && (
            <CardContent className="m-0 p-0 overflow-x-auto">
              {/* ✅ DataTable now receives a real array. */}
              <DataTable
                title="All Purchases"
                data={sales}
                columns={columns}
                searchKey="transactionCode"
                addLabel="Add Purchase"
                emptyMessage="No data found."
                onRowClick={(row) => openTransactionDetails(row)}
                height="h-[calc(100vh-350px)] sm:h-[calc(100vh-300px)]"
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
                  reloadUrl={`/Purchases/Requests?LocationId=${
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
              // onAddPayment={handleAddPayment}
              // onAddDelivery={() => setShowDeliveryModal(true)}
              loading={loading}
              showItemsCode={false}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
          </Modal>

          {/* <Modal
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
          </Modal> */}

          {/* <Modal
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
                reloadUrl={`/Purchases/Requests?LocationId=${
                  selectedShop || sessionStore.get("selectedShop")
                }&SuppliersId=${selectedSupplier}`}
                reloadSetterFunction={setsales}
                submitUrl={`/Transactions/Delivery`}
                transactionActionType="PURCHASE"
                heading="Suppliers Delivery"
                setActiveTab={setActiveTab}
              />
            </div>
          </Modal> */}
        </div>

        {toast.ToastComponent}
      </div>
    </Suspense>
  );
}