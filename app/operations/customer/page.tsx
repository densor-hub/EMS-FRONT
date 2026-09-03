"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, } from "react";
import {  Plus, User, PhoneCall } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import {  CardContent } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import  { useToaster } from '@/components/util/CustomToast';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers, toastErrors } from "@/helpers/formatStrings";
import { Customer,  Transaction } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import AddPayment from '../addPayments';
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import POSReceipt, {POSReceiptProps} from '@/components/util/POSReceipt';
import TransactionDetailsTabs from '@/components/util/TransactionDetailsTabs';
import { config } from '@/components/util/AppConfig';

// Dynamic imports
const Modal = dynamic(() => import('@/components/dashboard/modal').then(mod => mod.Modal), { ssr: false });
const TransactionUI = dynamic(() => import("@/components/util/SaleTransactionUi"), {
  loading: () => <div className="w-full p-8 text-center animate-pulse"><LoadingOverlay/></div>,
  ssr: false
});


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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("items");
  const [receiptData, setReceiptData] = useState<POSReceiptProps | null>(null)
  const sessionShop = sessionStorage.getItem("selectedShop");

  // Date filters
  // const [paymentStartDate, setPaymentStartDate] = useState<string>("");
  // const [paymentEndDate, setPaymentEndDate] = useState<string>("");
  // const [deliveryStartDate, setDeliveryStartDate] = useState<string>("");
  // const [deliveryEndDate, setDeliveryEndDate] = useState<string>("");

  const isLoadingRef = useRef(false);

  // Load initial data on mount (only once)
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (): Promise<void> => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    try {
      // Load customers
      const customersResponse = await axiosInstance.get(`/Customers?companyId=${user.companyId || user}&locationId=${selectedShop || sessionShop}`);
      setCustomers(customersResponse?.data);

      // Load all sales
      const salesResponse = await axiosInstance.get(`/sales?LocationId=${selectedShop || sessionShop}&Type=Customer`);
      setsales(salesResponse?.data);
      
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
      const response = await axiosInstance.get(`/Transactions/${transactionId}`);
      setTransactionDetails(response?.data);
      return response?.data;
    } catch (error: any) {
      console.error("Error fetching transaction details:", error);
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
      toastErrors(toast, "Payments for this transaction has been completed")
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

        await axiosInstance.post("/Transactions/Payment", paymentObj);

        reset();
        setShowAddPaymentModal(false);
        
        // Refresh sales after payment
        const salesResponse = await axiosInstance.get(`/sales?LocationId=${selectedShop || sessionShop}&Type=Customer`);
        setsales(salesResponse?.data);

        // Refresh transaction details after payment
        if (selectedTransaction?.transactionId) {
          await fetchTransactionDetails(selectedTransaction.transactionId);
        }

        // Switch to payments tab
        setActiveTab("payments");

        toast.success({
          title: 'Submitted successfully',
          description: 'Payment saved successfully',
        });
      } catch (error: any) {
        console.error("Error creating deposit:", error);

        toast.warning({
          title: 'Failed to submit',
          description: error?.response?.data?.message || 'Please try again later',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const columns = [
    {
      key: "CustomerName" as keyof Transaction,
      label: "Customer",
      sortable: true,
      render: (value: Transaction) => {
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{`${customers?.find(x=> x.id == value.customerId)?.firstName} ${customers?.find(x=> x.id == value.customerId)?.lastName}`}</span>
          </div>
        )
      },
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

  if (loading) {
    return (
      <LoadingOverlay />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Header
        title="Transactions to customers"
      />

      <div className="relative" >
        <div className="flex flex-row sm:flex-row justify-between gap-2 sm:gap-4 mb-2" >
          <div className="mt-2 w-full sm:w-[300px] px-2"  >
            <Label htmlFor="item" className="text-foreground text-sm">Select Customer</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="bg-white border-border w-full">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(item => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    <div className="flex flex-row">
                      <span className="text-sm">{item.firstName + " " + item?.lastName} </span> <span><PhoneCall size={10} style={{margin:"5px"}}/></span> {item?.phone}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!modalOpen && <Button className="w-auto relative top-7" onClick={() => {
            if (!selectedCustomer) {
              toast.info({
                title: 'Select Customer',
                description: 'Please select Customer to add',
              });
              return;
            }
            setModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>}
        </div>

        {!modalOpen &&  !receiptData &&
          <CardContent className="m-0 p-0 overflow-x-auto">
            <DataTable
              title="All sales"
              data={selectedCustomer ? sales.filter(sale => sale.customerId === selectedCustomer) : sales}
              columns={columns}
              searchKey="transactionCode"
              addLabel="Add Sale"
              emptyMessage="No transaction found. Click on 'New' at the top left corner to get started."
              onRowClick={(row) => openTransactionDetails(row)}
            />
          </CardContent>}

        {/* Using your Modal component */}
        <div className="absolute top-0 w-full" style={{ textAlign: 'center' }}>
          {modalOpen &&
            <div className="w-full">
              <TransactionUI
                instantSale={false}
                setOpen={setModalOpen} 
                reloadSetterFunction={setsales} 
                reloadUrl={`/sales?LocationId=${selectedShop || sessionShop}&CustomerId=${selectedCustomer}&Type=Customer`}
                submitUrl={`/sales/Customer/${selectedCustomer}`}
                businessPartnerLable="Sale to Customer"
                businessPartnerName={customers?.find(x => x.id === selectedCustomer)?.firstName + " " + customers?.find(x => x.id === selectedCustomer)?.lastName || ""}
                businessPartnerValue={selectedCustomer}
                transactionActionType="SALE"
              />
            </div>
          }
        </div>

        {/* Transaction Details Modal */}
        <Modal
          isOpen={detailsModalOpen && !receiptData}
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
          <TransactionDetailsTabs
            transactionDetails={transactionDetails}
            selectedTransaction={selectedTransaction}
            transactionType="sale"
            businessPartnerName={selectedTransaction.customerName || "Customer"}
            paymentMethods={config.pampaymentMethods}
            onAddPayment={handleAddPayment}
            onAddDelivery={() => setShowDeliveryModal(true)}
            loading={loading}
            showItemsCode={false}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
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
          title={`Delivery to Customer - ${customers?.find(x => x.id === selectedTransaction?.customerId)?.firstName + " " + customers?.find(x => x.id === selectedTransaction?.customerId)?.lastName || ""} (Trans # - ${selectedTransaction.transactionCode})`}
          size='full'
        >
          <div className="w-full">
            <DeliveryTransactionUI
              setOpen={setShowDeliveryModal}
              selectedTransaction={transactionDetails}
              setTransactionDetails={setTransactionDetails}
              reloadUrl={`/sales?LocationId=${selectedShop || sessionShop}&Type=Customer`}
              reloadSetterFunction={setsales}
              submitUrl={`/Transactions/Delivery`}
              transactionActionType="SALE"
              heading='Customer Delivery'
              setReceiptData={setReceiptData}
            />
          </div>
        </Modal>

        {receiptData && <div className=" fixed inset-0 z-100 top-0 left-0 right-0 min-h-screen bg-gray-100 p-4 flex justify-center">
          <POSReceipt
            data={receiptData}
            setData={setReceiptData}
          />
        </div>}
      </div>

      {toast.ToastComponent}
    </div>
  );
}