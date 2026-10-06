"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense} from "react";
import {  Plus, User} from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import {  CardContent } from "@/components/ui/card";
// import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToaster } from '@/components/util/CustomToast';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers, toastErrors } from "@/helpers/formatStrings";
import { Supplier, Transaction} from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import AddPayment from '@/app/purchases/addPayments';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import TransactionDetailsTabs from '@/components/util/TransactionDetailsTabs';
// import TransactionDetailsTabs from '@/components/util/TransactionItemSelectionUi';
// Dynamic imports
const Modal = dynamic(() => import('@/components/dashboard/modal').then(mod => mod.Modal), { ssr: false });
const TransactionUI = dynamic(() => import("@/components/util/SaleTransactionUi"), {
  loading: () => <div className="w-full p-8 text-center animate-pulse"><LoadingOverlay/></div>,
  ssr: false
});

const paymentMethods = [
  { name: "Mobile Money", id: 1 },
  { name: "Cash", id: 2 },
  { name: "Cheque", id: 3 },
  { name: "Bank Transfer", id: 4 },
  { name: "Other", id: 5 }
];

export default function PurcahsePage() {
  const toast = useToaster()
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
  const [activeTab, setActiveTab] = useState<'items'| 'payments' | 'deliveries' | 'reversals' | string>('items');
  
  // Date filters

  const isLoadingRef = useRef(false);

  // Load suppliers and all purchases on mount (only once)
  useEffect(() => {
    loadInitialData();
  }, []);


  const loadInitialData = async (): Promise<void> => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    try {
      const sessionShop = sessionStorage.getItem("selectedShop");
      
      // Load suppliers
      const suppliersResponse = await axiosInstance.get(`/Suppliers?companyId=${user.companyId || user}&locationId=${selectedShop || sessionShop}`);
      setsuppliers(suppliersResponse?.data);

      // Load all purchases
      const purchasesResponse = await axiosInstance.get(`/Purchases/Approved?locationId=${selectedShop || sessionShop}&generalStatus=1`);
      setsales(purchasesResponse?.data);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const reset = () => {
    setAmountPaid("");
    setDate("");
    setPaymentMethod("");
  };

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/Transactions/${transactionId}/location/${selectedShop || sessionStorage.getItem("selectedShop")}`);
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
    const details = await fetchTransactionDetails(transaction.transactionId || transaction.id || "");
    if (details) {
      setTransactionDetails(details);
      setDetailsModalOpen(true);
      setActiveTab("items");
    }
  };

  const handleAddPayment = () => {
    const totalPaid = transactionDetails?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
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
        description:""
      });
    } else {
      try {
        setLoading(true);

        const paymentObj = {
          transationId: selectedTransaction?.transactionId,
          amount: removeCommasFromNumbers(amountPaid),
          paymentDate: date,
          paymentMethod: Number(paymentMethod)
        };

        await axiosInstance.post("/Transactions/Payment", paymentObj).then( async() => {
            setActiveTab("payments");

            reset();
            setShowAddPaymentModal(false);
            
            // Refresh purchases after payment
            const sessionShop = sessionStorage.getItem("selectedShop");
            const purchasesResponse = await axiosInstance.get(`/Purchases/Approved?locationId=${selectedShop || sessionShop}&generalStatus=1`);
            setsales(purchasesResponse?.data);

            // Refresh transaction details after payment
            if (selectedTransaction?.transactionId) {
              await fetchTransactionDetails(selectedTransaction.transactionId);
            }

            toast.success({
              title: 'Submitted successfully',
              description: 'Payment saved successfully',
            });
        });

      } catch (error: any) {
        console.error("Error creating deposit:", error);

        toastErrors(toast, error)
      } finally {
        setLoading(false);
      }
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
          <span className="font-medium">{suppliers?.find(x=> x.id == value.supplierId)?.supplierCompanyName}</span>
        </div>
      ),
    },
    {
      key: "totalAmount" as keyof Transaction,
      label: "Total Amount",
      sortable: true,
      render: (value: Transaction) => (
        <span className="font-bold text-primary">{formatNumberWithCommas(value.totalAmount?.toFixed(2))}</span>
      ),
    },
    {
      key: "paidAmount" as keyof Transaction,
      label: "Paid Amount",
      sortable: true,
      render: (value: Transaction) => (
        <span className="font-bold text-blue-500">{formatNumberWithCommas(value.paidAmount?.toFixed(2))}</span>
      ),
    },
    {
      key: "debt" as keyof Transaction,
      label: "Debt",
      sortable: true,
      render: (value: Transaction) => (
        <span className={(value.totalAmount - value.paidAmount) > 0 ? `font-bold text-red-500` : (value.totalAmount - value.paidAmount) < 0 ?  `font-bold text-blue-500` : ""}>{ formatNumberWithCommas((value.totalAmount - value.paidAmount)?.toFixed(2))}</span>
      ),
    },
     {
      key: "transactionDate" as keyof Transaction,
      label: "Date",
      render: (value: Transaction) => alphaNumericDate(new Date(value.transactionDate).toLocaleDateString()),
    },
    {
      key: "transactionCode" as keyof Transaction,
      label: "Transaction Code",
      render: (value: Transaction) => (
        <span className="font-bold text-primary">{value.transactionCode}</span>
      ),
    }
   
  ];

  // if (loading) {
  //   return (
     
  //   );
  // }

  return (
    <Suspense fallback={<LoadingOverlay/>}>
       {loading && <LoadingOverlay />}
      <div className="min-h-screen w-full overflow-x-hidden">
      <Header
        title="Purchases from suppliers"
        // description="Suppliers Transactions"
      />
      <div className="relative" >
          {!modalOpen &&
            <CardContent className="m-0 p-0 overflow-x-auto">
              <DataTable
                title="Approved Purchases"
                data={selectedSupplier ? sales.filter(sale => sale.supplierId === selectedSupplier) : sales}
                columns={columns}
                searchKey="supplierName"
                addLabel="Add Purchase"
                emptyMessage="No transaction found for the selected supplier."
                onRowClick={(row) => openTransactionDetails(row)}
              />
            </CardContent>}

        {/* Using your Modal component */}
        <div className="absolute top-0 w-full" style={{ textAlign: 'center' }}>
          {modalOpen &&
            <div className="w-full">
              <TransactionUI
                setOpen={setModalOpen}
                reloadSetterFunction={setsales}
                reloadUrl={`/Purchases/Approved?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&SuppliersId=${selectedSupplier}`}
                submitUrl={`/Purchases`}
                businessPartnerLable="Supplier"
                businessPartnerName={`${suppliers?.find(x => x.id === selectedSupplier)?.supplierCompanyName ||  ""} - ${suppliers?.find(x => x.id === selectedSupplier)?.firstName + " " + suppliers?.find(x => x.id === selectedSupplier)?.lastName || ""}`}
                businessPartnerValue={selectedSupplier}
                transactionActionType="PURCHASE"
                instantSale={false}
              />
            </div>
          }
        </div>

        {/* Transaction Details Modal - 95vw width */}
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
          size='full'
          height='585px'
        >
            {/* Header */}
            <TransactionDetailsTabs
              transactionDetails={transactionDetails}
              selectedTransaction={selectedTransaction}
              transactionType="purchase"
              businessPartnerName={selectedTransaction.supplierName || "Supplier"}
              paymentMethods={paymentMethods}
              onAddPayment={handleAddPayment}
              // onAddDelivery={() => setShowDeliveryModal(true)}
              loading={loading}
              showItemsCode={false}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
        </Modal>

        {/* Add Payment Modal */}
        <Modal
          isOpen={showAddPaymentModal}
          onClose={() => {
            setShowAddPaymentModal(false);
            reset();
          }}
          title="Add Payment"
          // description={`Add payment `} //for transaction ${selectedTransaction.transactionCode}
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

        {/* Delivery Modal */}
        <Modal
          isOpen={showDeliveryModal}
          onClose={() => {
            setShowDeliveryModal(false);
          }}
          title={`Receival from ${suppliers?.find(x => x.id === selectedTransaction?.supplierId)?.supplierCompanyName || ""} (Trans # - ${selectedTransaction.transactionCode})`}
          size='full'
        >
          <div className="w-full">
            <DeliveryTransactionUI
              setOpen={setShowDeliveryModal}
              selectedTransaction={transactionDetails}
              setTransactionDetails={setTransactionDetails}
              reloadUrl={`/Purchases/Approved?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&SuppliersId=${selectedSupplier}`}
              reloadSetterFunction={setsales}
              submitUrl={`/Transactions/Delivery`}
              transactionActionType="PURCHASE"
              heading='Suppliers Delivery'
              setActiveTab = {setActiveTab}
            />
          </div>
        </Modal>
      </div>

      {toast.ToastComponent}
    </div>
    </Suspense>
    
  );
}