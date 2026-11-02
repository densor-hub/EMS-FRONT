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
  unwrapItems,
  readCachedSettings,
} from "@/helpers/formatStrings";
import { Supplier, Transaction } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import AddPayment from '@/app/purchases/addPayments';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import TransactionDetailsTabs from '@/components/util/TransactionDetailsTabs';
import { CustomSelect } from '@/components/util/CustomSelect';
import { config, settings } from '@/components/util/AppConfig';
import SweetAlert from '@/components/util/SweetAlert';

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

const DEFAULT_PAGE_SIZE = readCachedSettings()?.defaultPageSize;


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
  const [showAlert, setShowAlert] = useState(false)
  const [suppliers, setsuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setselectedSupplier] = useState<string>();
  const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'deliveries' | 'reversals' | string>('items');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE || 10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Refs to keep callbacks stable & avoid stale-closure bugs
  const isLoadingRef = useRef(false);
  const pageRef = useRef(page);
  const supplierRef = useRef(selectedSupplier);
  const shopRef = useRef<string | undefined>(selectedShop || undefined);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { supplierRef.current = selectedSupplier; }, [selectedSupplier]);
  useEffect(() => { shopRef.current = selectedShop || undefined; }, [selectedShop]);

  // -------------------- Loaders --------------------

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const shop = shopRef.current || sessionShop;

      const suppliersResponse = await axiosInstance.get(
        `/Suppliers?companyId=${user?.companyId || user}&locationId=${shop}`
      );
      setsuppliers(Array.isArray(suppliersResponse?.data) ? suppliersResponse.data : []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  }, [user]);

  const loadPurchases = useCallback(
    async (targetPage?: number): Promise<void> => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setLoading(true);

      try {
        const sessionShop = sessionStore.get("selectedShop");
        const shop = shopRef.current || sessionShop;
        const supplier = supplierRef.current;
        const wantedPage = targetPage ?? pageRef.current;

        const params = new URLSearchParams({
          locationId: String(shop ?? ""),
          generalStatus: "1",
          page: String(wantedPage),
          pageSize: String(pageSize),
        });
        if (supplier !== undefined && supplier !== null && supplier !== "") {
          params.set("supplierId", supplier);
        }

        const purchasesResponse = await axiosInstance.get(
          `/Purchases/Requests?${params.toString()}`
        );

        const { items, total, pages } = unwrapItems<Transaction>(purchasesResponse);
        setsales(items);
        setTotalCount(total);
        setTotalPages(pages);

        // If the requested page overshoots (e.g. after a delete), snap back.
        if (pages > 0 && wantedPage > pages) {
          setPage(pages);
        }
      } catch (error) {
        console.error("Error loading purchases:", error);
        setsales([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [pageSize]
  );

  // Mount: fetch suppliers once.
  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // Refetch purchases whenever shop / supplier / page changes.
  useEffect(() => {
    void loadPurchases(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop, selectedSupplier, page]);

  // Reset to page 1 whenever supplier changes (so page + supplier update together).
  useEffect(() => {
    setPage(1);
  }, [selectedSupplier]);

  // -------------------- Payment flow --------------------

  const reset = () => {
    setAmountPaid("");
    setDate("");
    setPaymentMethod("");
  };

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setLoading(true);
      const shop = shopRef.current || sessionStorage?.getItem("selectedShop");
      const response = await axiosInstance.get(
        `/Transactions/${transactionId}/location/${shop}`
      );
      setTransactionDetails(response?.data);
      return response?.data;
    } catch (error: any) {
      console.error("Error fetching transaction details:", error);
      toast.error({
        title: "Failed to load details",
        description: error?.response?.data?.message || "Please try again later",
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

 const handleContinueWithoutSupplier = () => {
    setModalOpen(true);
    setShowAlert(false);
   
 }
  // -------------------- Columns --------------------

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
      key: "Status" as keyof Transaction,
      label: "status",
      render: (value: Transaction) =>
        <p>{value.status}</p>,
    },
    {
      key: "transactionDate" as keyof Transaction,
      label: "Trans Date",
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

  // -------------------- Render --------------------

  return (
    <Suspense fallback={<LoadingOverlay />}>
      {loading && <LoadingOverlay />}
      <div className={!modalOpen ? " w-full overflow-x-hidden" : "min-h-screen w-full overflow-x-hidden"}>
        <Header title="Purchases from suppliers" />
        <div className="relative">
          <div className="flex flex-row items-center justify-between gap-2 sm:items-end sm:justify-between sm:gap-4 mb-2  p-1.5">
            <div className="basis-[85%] sm:basis-auto sm:flex-1 sm:max-w-[320px]">
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
              <div className="basis-[15%] sm:basis-auto">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (!selectedSupplier) {
                     return  setShowAlert(true);
                    } else{
                      handleContinueWithoutSupplier()
                    }
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
              <DataTable
                title="All Purchases"
                data={sales}
                columns={columns}
                searchKey="transactionCode"
                addLabel="Add Purchase"
                emptyMessage="No data found."
                onRowClick={(row) => openTransactionDetails(row)}
                height="h-[calc(100vh-350px)] sm:h-[calc(100vh-300px)]"
                paginationMode="backend"
                serverPagination={{
                  page,
                  totalPages,
                  totalCount,
                  onPageChange: (p) => setPage(p),
                  onSearchChange: (term) => {
                    // setSearchTerm(term);
                    setPage(1);
                  },
                }}
              />
              {paginationControls}
            </CardContent>
          )}

          <div className="absolute top-0 w-full" style={{ textAlign: "center" }}>
            {modalOpen && (
              <div className="w-full">
                <TransactionUI
                  setOpen={setModalOpen}
                  // KEY FIX: don't pass the raw setter. Route the reload through
                  // our pagination-aware loader so the paginated response is
                  // parsed into an array before hitting <DataTable/>.
                  reloadSetterFunction={() => { void loadPurchases(pageRef.current); }}
                  reloadUrl={`/Purchases/Requests?LocationId=${
                    shopRef.current || sessionStore.get("selectedShop")
                  }&SuppliersId=${supplierRef.current}`}
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
                  transactionActionType={config.transactionTypes.PURC}
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
              transactionType={config.transactionTypes.PURC}
              businessPartnerName={selectedTransaction.supplierName || "Supplier"}
              paymentMethods={paymentMethods}
              loading={loading}
              showItemsCode={false}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
          </Modal>
        </div>

         <SweetAlert
            isOpen={showAlert}
            onClose={() => setShowAlert(false)}
            onConfirm={handleContinueWithoutSupplier}     // ← Action on confirm
            onCancel={() => setShowAlert(false)}       // ← Action on cancel
            type="question"
            title="No Supplier Selected"
            message="Do you want to continue without a supplier ?"
            confirmText="Yes, Continue"
            showCancelButton={true}
            showCloseButton={false}
          />
        {toast.ToastComponent}
      </div>
    </Suspense>
  );
}