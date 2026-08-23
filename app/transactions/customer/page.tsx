"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, SetStateAction, Dispatch } from "react";
import { Wallet, Plus, User, Calendar, Trash2, List, Package, CreditCard, Truck, RotateCcw, DollarSign, Filter, Phone, PhoneCall } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import { handlePrint } from "@/lib/utils";
import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers } from "@/helpers/formatStrings";
import { Customer, Item, Transaction, TransactionItem, TransactionItemsDelivered } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
// import PaymentsFooter from '../paymentFooter';
import AddPayment from '../addPayments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import POSReceipt, {POSReceiptProps} from '@/components/util/POSReceipt';

// Dynamic imports
const Modal = dynamic(() => import('@/components/dashboard/modal').then(mod => mod.Modal), { ssr: false });
const TransactionUI = dynamic(() => import("@/components/util/TransactionUi"), {
  loading: () => <div className="w-full p-8 text-center animate-pulse">Loading form...</div>,
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
  const { toast } = useToast();
  const { selectedShop, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [sales, setsales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
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

  
  // Date filters
  const [paymentStartDate, setPaymentStartDate] = useState<string>("");
  const [paymentEndDate, setPaymentEndDate] = useState<string>("");
  const [deliveryStartDate, setDeliveryStartDate] = useState<string>("");
  const [deliveryEndDate, setDeliveryEndDate] = useState<string>("");

  const printContentRef = useRef(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    try {
      const sessionShop = sessionStorage.getItem("selectedShop");
      const data = await axiosInstance.get(`/Customers?companyId=${user.companyId || user}&locationId=${selectedShop || sessionShop}`);
      setCustomers(data?.data);
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

  // console.log(transactionDetails)
  // const handleDelete = (transaction: Transaction) => { };

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/Transactions/${transactionId}`);
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
        getCustomersales();

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

  const getCustomersales = async () => {
      const saless = await axiosInstance.get(`/sales?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&CustomerId=${selectedCustomer}&Type=Customer`);
      setsales(saless?.data);
  };

  useEffect(() => {
    loadData();
    getCustomersales();
  }, []);

  // useEffect(() => {
  //   getCustomersales();
  // }, [selectedCustomer]);

  //  console.log(customers)
  const columns = [
    {
      key: "CustomerName" as keyof Transaction,
      label: "Customer",
      sortable: true,
      render: (value: Transaction) => {
        // console.log(value)
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

  // Render items tab content
  const renderItemsTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-200">
                          <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item</th>
                          {/* <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th> */}
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Ordered</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">{selectedTransaction?.supplierId ? "Received" : "Delivered"}</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Reversed</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Price</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details?.items?.map((item: TransactionItem, index: number) => (
                          <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">{item.name || item.itemName}</td>
                            {/* <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{item.code}</td> */}
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{formatNumberWithCommas(item?.quantity?.toString() || '0')}</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{formatNumberWithCommas(item?.itemsDelivered.reduce((sum: number, el: TransactionItemsDelivered) => el?.quantity + sum, 0)?.toString())}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                            {formatNumberWithCommas(
                              item?.itemsDelivered.reduce((sum: number, el: TransactionItemsDelivered) => 
                                sum + el?.ItemReversals?.reduce((calc, reversal) => 
                                  calc + (reversal?.quantity || 0), 0
                                ), 0
                              )?.toString()
                            )}
                        </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right"> {formatNumberWithCommas(item.unitPrice?.toFixed(2) || '0.00')}</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold"> {formatNumberWithCommas((item.quantity * item.unitPrice)?.toFixed(2) || '0.00')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                          <td colSpan={4} className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm">Total</td>
                          <td className="p-2 sm:p-3 text-right font-bold text-primary text-xs sm:text-sm">
                            GHS {formatNumberWithCommas(details.totalAmount?.toFixed(2) || '0.00')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
        </div>
      </div>
    );
  };

  // Render payments tab content
  const renderPaymentsTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    const totalPaid = details?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    const remainingBalance = (details.totalAmount || 0) - totalPaid;

    
    const totalPayments = details?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    const totalDiscount = details?.payments?.reduce((sum: number, p: any) => sum + (p.coupon?.amount || 0), 0) || 0;

    // Filter payments by date
    const filteredPayments = details?.payments?.filter((payment: any) => {
      if (paymentStartDate || paymentEndDate) {
        const paymentDate = new Date(payment.paymentDate);
        const start = new Date(paymentStartDate);
        const end = new Date(paymentEndDate);
        if (paymentStartDate && !paymentEndDate)  return paymentDate >= start 
        if (paymentEndDate && !paymentStartDate)  return  paymentDate <= end 
        return paymentDate >= start && paymentDate <= end;
      }
      return true;
    }) || [];

    return (
       <div className="space-y-4">
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Amount</p>
            <p className="text-xs sm:text-sm font-bold text-primary">{formatNumberWithCommas(details.totalAmount?.toFixed(2) || '0.00')}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Payments</p>
            <p className="text-xs sm:text-sm font-bold text-green-600">{formatNumberWithCommas(totalPayments.toFixed(2))}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600"> Discount</p>
            <p className="text-xs sm:text-sm font-bold text-blue-600">{formatNumberWithCommas(totalDiscount.toFixed(2))}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
             {remainingBalance <= 0 ? <p className="text-xs sm:text-sm text-gray-600"> Balance</p> : <p className="text-xs sm:text-sm text-gray-600"> Debt</p>}
            {remainingBalance <= 0 ? <p className="text-xs sm:text-sm font-bold text-blue-600">{formatNumberWithCommas(remainingBalance.toFixed(2))}</p> : 
            <p className="text-xs sm:text-sm font-bold text-red-600">{formatNumberWithCommas(remainingBalance.toFixed(2))}</p> }
          </div>
        </div>

        {/* Date Filter - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-row sm:flex-row gap-2 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">From Date</Label>
              <Input
                type="date"
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                min={selectedTransaction?.transactionDate?.split('T')[0]}
                max={paymentEndDate}
              />
            </div>
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">To Date</Label>
              <Input
                type="date"
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
                min={paymentStartDate || selectedTransaction?.transactionDate?.split('T')[0]}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPaymentStartDate("");
              setPaymentEndDate("");
            }}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Clear Filter
          </Button>

          {(paymentEndDate || paymentStartDate )&& <div className="p-2 sm:p-3 text-right text-xs sm:text-sm">
                Filtered Total Payments  <span className='font-bold'> {formatNumberWithCommas(filteredPayments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2))}</span>
          </div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Payment Date</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Method</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Amount (GHS)</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Discount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.sort((a,b) => a.paymentDate?.localeCompare(b.paymentDate)).map((payment: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">{alphaNumericDate(payment.paymentDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">
                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {paymentMethods.find(x => x.id === payment.paymentMethod)?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold"> {formatNumberWithCommas(payment.amount.toFixed(2))}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold text-blue-600">
                     {formatNumberWithCommas(payment.coupon?.amount?.toFixed(2) || '0.00')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    );
  };

  // Render deliveries tab content
  const renderDeliveriesTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    // Collect all deliveries from items
    let allDeliveries: any[] = [];
    details?.items?.forEach((item: any) => {
      if (item.itemsDelivered && item.itemsDelivered.length > 0) {
        item.itemsDelivered.forEach((delivery: any) => {
          allDeliveries.push({
            itemName: item.name || item.itemName,
            itemCode: item.code,
            deliveryDate: delivery.deliveryDate,
            quantity: delivery.quantity,
            deliveredQuantity: delivery.quantity,
            deliveryId: delivery.deliveryId,
            reversals: delivery.itemReversals || []
          });
        });
      }
    });

    // Filter deliveries by date
    allDeliveries = allDeliveries.filter((delivery) => {
      if (deliveryStartDate || deliveryEndDate) {
        const deliveryDate = new Date(delivery.deliveryDate);
        const start = new Date(deliveryStartDate);
        const end = new Date(deliveryEndDate);
        if (deliveryStartDate && !deliveryEndDate)  return deliveryDate >= start 
        if (deliveryEndDate && !deliveryStartDate)  return  deliveryDate <= end 
        return deliveryDate >= start && deliveryDate <= end;
      }
      return true;
    });

    return (
      <div className="space-y-4">
        {/* Date Filter - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-row sm:flex-row gap-2 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">From Date</Label>
              <Input
                type="date"
                value={deliveryStartDate}
                onChange={(e) => setDeliveryStartDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm"
                min={selectedTransaction?.transactionDate?.split('T')[0]}
                max={deliveryEndDate}
              />
            </div>
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">To Date</Label>
              <Input
                type="date"
                value={deliveryEndDate}
                onChange={(e) => setDeliveryEndDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm"
                 min={deliveryStartDate || selectedTransaction?.transactionDate?.split('T')[0]}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDeliveryStartDate("");
              setDeliveryEndDate("");
            }}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Clear Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item Name</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">Delivery Date</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Qty</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">Reversals</th>
              </tr>
            </thead>
            <tbody>
              {allDeliveries?.sort((a,b) => a.deliveryDate?.localeCompare(b.deliveryDate)).map((delivery, index) => (
                <tr key={delivery.deliveryId || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{delivery.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{delivery.itemCode}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{alphaNumericDate(delivery.deliveryDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">{formatNumberWithCommas(delivery.quantity?.toString() || '0')}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                    {delivery.reversals && delivery.reversals.length > 0 ? (
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {delivery.reversals.length}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    );
  };

  // Render reversals tab content
  const renderReversalsTab = () => {
    const details = transactionDetails;
    if (!details) return null;

    // Collect all reversals from deliveries
    const allReversals: any[] = [];
    details?.items?.forEach((item: any) => {
      if (item.itemsDelivered && item.itemsDelivered.length > 0) {
        item.itemsDelivered.forEach((delivery: any) => {
          if (delivery.itemReversals && delivery.itemReversals.length > 0) {
            delivery.itemReversals.forEach((reversal: any) => {
              allReversals.push({
                itemName: item.name || item.itemName,
                itemCode: item.code,
                reversalDate: reversal.reversalDate,
                quantity: reversal.quantity,
                deliveryId: delivery.deliveryId,
                reversalId: reversal.reversalId
              });
            });
          }
        });
      }
    });

    if (allReversals.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <RotateCcw className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300" />
          <p className="text-gray-500 mt-2 text-sm sm:text-base">No reversals recorded for this transaction</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Reversals</p>
            <p className="text-base sm:text-xl font-bold">{allReversals.length}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Items Reversed</p>
            <p className="text-base sm:text-xl font-bold">
              {allReversals.reduce((sum, r) => sum + r.quantity, 0)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item Name</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">Reversal Date</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {allReversals.map((reversal, index) => (
                <tr key={reversal.reversalId || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{reversal.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{reversal.itemCode}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{alphaNumericDate(reversal.reversalDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold text-red-600">
                    {formatNumberWithCommas(reversal.quantity?.toString() || '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <LoadingOverlay />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Header
        title="Transactions to customers"
        // description="Sales & Deliveries to customers"
      />

      <div className="relative px-2 sm:px-4" >
        <div className="flex flex-row sm:flex-row justify-between gap-2 sm:gap-4" >
          <div className="space-y-2 w-full sm:w-[300px]">
            <Label htmlFor="item" className="text-foreground text-sm">Select Customer</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="bg-secondary border-border w-full">
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
            New
          </Button>}
        </div>

        <Card className="gap-0 mt-4 p-0">
          {!modalOpen &&
            <CardContent className="m-0 p-0 overflow-x-auto">
              <DataTable
                title="All sales"
                data={sales?.filter(x=> selectedCustomer ? x.customerId == selectedCustomer : true)}
                columns={columns}
                searchKey="transactionCode"
                addLabel="Add Sale"
                emptyMessage="No transaction found. Click on 'New' at the top left corner to get started."
                onRowClick={(row) => openTransactionDetails(row)}
              />
            </CardContent>}
        </Card>

        {/* Using your Modal component */}
        <div className="absolute top-0 w-full" style={{ textAlign: 'center' }}>
          {modalOpen &&
            <div className="w-full">
              <TransactionUI
                setOpen={setModalOpen}
                reloadSetterFunction={setsales}
                reloadUrl={`/sales?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&CustomerId=${selectedCustomer}`}
                submitUrl={`/sales/Customer/${selectedCustomer}`}
                businessPartnerLable="Sale to Customer"
                businessPartnerName={customers?.find(x => x.id === selectedCustomer)?.firstName + " " + customers?.find(x => x.id === selectedCustomer)?.lastName || ""}
                businessPartnerValue={selectedCustomer}
                transactionActionType="SALE"
              />
            </div>
          }
        </div>

        {/* Transaction Details Modal - 95vw width */}
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
          <div className="space-y-4 w-full px-2 sm:px-4">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex flex-col sm:flex-col lg:flex-row justify-between items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                 <div className='flex'>
                   <span className='text-sm  sm:text-xl font-bold text-gray-800 break-words'>Customer - </span> <span style={{visibility:'hidden'}}> - </span>
                  <h2 className="text-sm  sm:text-xl font-bold text-gray-800 break-words">
                     {selectedTransaction.customerName}
                  </h2>
                 </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    <span className="text-xs sm:text-sm text-gray-600">Transaction: <span className="font-semibold">{selectedTransaction.transactionCode}</span></span>
                    <span className="text-xs sm:text-sm text-gray-600">Date: <span className="font-semibold">{alphaNumericDate(selectedTransaction.transactionDate || "")}</span></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(printContentRef)}
                    className="flex-1 sm:flex-none bg-blue-500 text-white hover:bg-blue-600 text-xs sm:text-sm"
                  >
                    🖨️ Print
                  </Button> */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddPayment}
                    className="flex-1 sm:flex-none bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Payment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeliveryModal(true)}
                    className="flex-1 sm:flex-none bg-purple-500 text-white hover:bg-purple-600 text-xs sm:text-sm"
                  >
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Delivery
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="w-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 bg-emerald-200 overflow-x-auto">
                  <TabsTrigger value="items" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Items</span>
                    <span className="sm:hidden">Items</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Payments</span>
                    <span className="sm:hidden">Pay</span>
                  </TabsTrigger>
                  <TabsTrigger value="deliveries" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:block">Deliveries</span>
                    <span className="sm:hidden">Del</span>
                  </TabsTrigger>
                  <TabsTrigger value="reversals" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Reversals</span>
                    <span className="sm:hidden">Rev</span>
                  </TabsTrigger>
                </TabsList>

                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    <TabsContent value="items" className="mt-0">
                      {renderItemsTab()}
                    </TabsContent>
                    <TabsContent value="payments" className="mt-0">
                      {renderPaymentsTab()}
                    </TabsContent>
                    <TabsContent value="deliveries" className="mt-0">
                      {renderDeliveriesTab()}
                    </TabsContent>
                    <TabsContent value="reversals" className="mt-0">
                      {renderReversalsTab()}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          </div>
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
          title={`Delivery to  Customer - ${customers?.find(x => x.id === selectedTransaction?.customerId)?.firstName + " " + customers?.find(x => x.id === selectedTransaction?.customerId)?.lastName || ""} (Trans # - ${selectedTransaction.transactionCode})`}
          size='full'
        >
          <div className="w-full">
            <DeliveryTransactionUI
              setOpen={setShowDeliveryModal}
              selectedTransaction={transactionDetails}
              setTransactionDetails={setTransactionDetails}
              reloadUrl={`/sales?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&CustomerId=${selectedCustomer}`}
              reloadSetterFunction={setsales}
              submitUrl={`/Transactions/Delivery`}
              transactionActionType="SALE"
              heading='Customer Delivery'
              setReceiptData={setReceiptData}
            />
          </div>
        </Modal>

        
       {receiptData && <div className="absolute top-0 left-0 right-0 min-h-screen bg-gray-100 p-4 flex justify-center">
        <POSReceipt
          data={receiptData}
          setData={setReceiptData}
        />
      </div>}
      </div>
    </div>
  );
}