"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, SetStateAction, Dispatch } from "react";
import { Wallet, Plus, User, Calendar, Trash2, List, Package, CreditCard, Truck, RotateCcw, DollarSign, Filter } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToaster } from '@/components/util/CustomToast';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import { handlePrint } from "@/lib/utils";
import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers, toastErrors } from "@/helpers/formatStrings";
import {Item, Shop, Supplier, Transaction } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import PaymentsFooter from '../../operations/paymentFooter';
import AddPayment from '../../operations/addPayments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import SkeletonLoading, { LoadingOverlay } from '@/components/SkeletonLoading';
import StatusBadge from '@/components/ui/statusbadge'
import { Textarea } from '@/components/ui/textarea';

// Dynamic imports
const Modal = dynamic(() => import('@/components/dashboard/modal').then(mod => mod.Modal), { ssr: false });
const TransactionUI = dynamic(() => import("@/components/util/SaleTransactionUi"), {
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
   const sessionShop = sessionStorage.getItem("selectedShop");
  const toast  = useToaster();
  const { selectedShop, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [sales, setStockTransfers] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<Transaction>>({});
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState('');
  const [shops, setshops] = useState<Shop[]>([]);
  const [selectedShopForStockTrans, setselectedShopForStockTrans] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("items");
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  
  // Date filters
  const [deliveryStartDate, setDeliveryStartDate] = useState<string>("");
  const [deliveryEndDate, setDeliveryEndDate] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const printContentRef = useRef(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    try {
     
      const data = await axiosInstance.get(`/Locations?companyId=${user.companyId || user}&LocationId=${selectedShop || sessionShop}`);
      setshops(data?.data);
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

  const submitResponse = async (response : number) => {
    try {
          setLoading(true);

        var postObj = {
          stockTransferId : selectedTransaction?.id,
          comment : remarks,
          stage: response
        }

        if (response == 2 && !remarks) {
          toast.warning({
            title: 'Please enter reason for declining',
            description:""
            // description: error?.response?.data?.message || 'Please try again later',
          });

          return setLoading(false)
        }
        await axiosInstance.put('/StockTransfer/approval', postObj)
    } catch(error: any) {
      console.log(error?.message)
      toastErrors(toast, error);
      setLoading(false)

    } finally{
      setLoading(false)
    }

  }
  // const handleDelete = (transaction: Transaction) => { };

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await axiosInstance.get(`/Transactions/${transactionId}`);
      setTransactionDetails(response?.data);
      return response?.data;
    } catch (error: any) {
      console.error("Error fetching transaction details:", error);
      toast.warning({
        title: 'Failed to load details',
        description: error?.response?.data?.message || 'Please try again later',
      });
      return null;
    } finally {
      setIsLoadingDetails(false);
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

  const  getStockTransfers =  async () => {
      const stockTransfers = await axiosInstance.get(`/StockTransfer?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&Approval=${true}`)
      console.log(stockTransfers.data)
      setStockTransfers(stockTransfers?.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    getStockTransfers();
  }, [selectedShopForStockTrans]);

  const columns = [
     {
      key: "shopsName" as keyof Transaction,
      label: "Shop Name",
      sortable: true,
      render: (value: Transaction) => {
        const supId =  value?.supplierId;
        const cusId = value?.customerId;

        let nameToDisplay = "";
        if (supId !== (selectedShop || sessionShop)) nameToDisplay = value?.supplierName || "";
        if (cusId !== (selectedShop || sessionShop)) nameToDisplay = value?.customerName || "";
        
       return <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{nameToDisplay}</span>
        </div>
      },
    },
    {
      key: "type" as keyof Transaction,
      label: "Type",
      sortable: true,
      render: (value: Transaction) => (
        <div className="flex items-center gap-2">
          {/* <User className="h-4 w-4 text-muted-foreground" /> */}
          <span className="font-medium">{value?.supplierId === (selectedShop || sessionShop) ? "OUT FLOW" : "MY REQUEST"}</span>
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
      key: "transactionDate" as keyof Transaction,
      label: "Date",
      render: (value: Transaction) => alphaNumericDate(new Date(value.transactionDate).toLocaleDateString()),
    },
    {
      key: "status" as keyof Transaction,
      label: "Status",
      sortable: true,
      render: (value: Transaction) => (
        <div className="flex items-center gap-2">
          {/* <User className="h-4 w-4 text-muted-foreground" /> */}
          <span className="font-medium">{ <StatusBadge status={value?.status} className='h-7  text-xs' heartbeat={value?.status?.toLocaleLowerCase() === "approved" || value?.status?.toLocaleLowerCase() === "declined" }/> }</span>
        </div>
      ),
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
          <table className="w-full h-[Calc(100vh-100px)]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item Name</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Qty</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Unit Price</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {details?.items?.map((item: any, index: number) => (
                <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">{item.name || item.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{item.code}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{formatNumberWithCommas(item.quantity?.toString() || '0')}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">GHS {formatNumberWithCommas(item.unitPrice?.toFixed(2) || '0.00')}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">GHS {formatNumberWithCommas((item.quantity * item.unitPrice)?.toFixed(2) || '0.00')}</td>
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
      if (deliveryStartDate && deliveryEndDate) {
        const deliveryDate = new Date(delivery.deliveryDate);
        const start = new Date(deliveryStartDate);
        const end = new Date(deliveryEndDate);
        return deliveryDate >= start && deliveryDate <= end;
      }
      return true;
    });

    if (allDeliveries.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <Truck className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300" />
          <p className="text-gray-500 mt-2 text-sm sm:text-base">No deliveries recorded for this transaction</p>
        </div>
      );
    }

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
                className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
              />
            </div>
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">To Date</Label>
              <Input
                type="date"
                value={deliveryEndDate}
                onChange={(e) => setDeliveryEndDate(e.target.value)}
                className="w-full sm:w-40 text-xs sm:text-sm bg-white border-gray-300"
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
                {/* <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold hidden sm:table-cell">Reversals</th> */}
              </tr>
            </thead>
            <tbody>
              {allDeliveries.map((delivery, index) => (
                <tr key={delivery.deliveryId || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{delivery.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{delivery.itemCode}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{alphaNumericDate(delivery.deliveryDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">{formatNumberWithCommas(delivery.quantity?.toString() || '0')}</td>
                  {/* <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                    {delivery.reversals && delivery.reversals.length > 0 ? (
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {delivery.reversals.length}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td> */}
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
    <div className="w-full overflow-x-hidden">
      <Header
        title="Transfers Approvals"
        description="shops Transactions"
      />

      <div className="relative">
        <div className="flex flex-col sm:flex-row justify-between ">
          <div className="space-y-2 w-full sm:w-[300px] p-2">
            <Label htmlFor="item" className="text-foreground">Select Shop</Label>
            <Select value={selectedShopForStockTrans} onValueChange={setselectedShopForStockTrans}>
              <SelectTrigger className="bg-white border-border w-full">
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent>
                {shops.map(item => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item?.phone  + ", " + (item?.address?.length > 20 ? (item?.address?.slice(0, 20) + "..."): item?.address)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      {!modalOpen &&
        <CardContent className="m-0 p-0 overflow-x-auto">
          <DataTable
            title="All Transfers"
            data={sales}
            columns={columns}
            searchKey="transactionCode"
            addLabel="Add Purchase"
            emptyMessage="No transaction found for the selected shop."
            onRowClick={(row) => openTransactionDetails(row)}
          />
        </CardContent>}

        {/* Using your Modal component */}
        <div className="absolute top-0 w-full" style={{ textAlign: 'center' }}>
          {modalOpen &&
            <div className="w-full">
              <TransactionUI
                setOpen={setModalOpen}
                reloadSetterFunction={setStockTransfers}
                reloadUrl={`/StockTransfer?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&From=${true}`}
                submitUrl="/StockTransfer/Request"
                businessPartnerLable="Shop"
                businessPartnerName={`${shops?.find(x => x.id === selectedShopForStockTrans)?.name ||  ""} - ${shops?.find(x => x.id === selectedShopForStockTrans)?.name || ""}`}
                businessPartnerValue={selectedShopForStockTrans}
                transactionActionType="TRAN"
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
            setTransactionDetails(null);
          }}
          title=""
          size='full'
        >
          <div className="space-y-4 w-full px-2 sm:px-4">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex flex-col sm:flex-col lg:flex-row justify-between items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                  <h2 className="text-sm  sm:text-xl font-bold text-gray-800 break-words">
                    {shops?.find(x => x.id === selectedShopForStockTrans)?.name || ""}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    <span className="text-xs sm:text-sm text-gray-600">Transaction: <span className="font-semibold">{selectedTransaction.transactionCode}</span></span>
                    <span className="text-xs sm:text-sm text-gray-600">Date: <span className="font-semibold">{alphaNumericDate(selectedTransaction.transactionDate || "")}</span></span>
                    <span><StatusBadge status={selectedTransaction?.status?.toLocaleLowerCase()}/> </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="w-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                
                {isLoadingDetails ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    <TabsContent value="items" className="mt-0">
                      {renderItemsTab()}
                    </TabsContent>
                    {/* <TabsContent value="payments" className="mt-0">
                      {renderPaymentsTab()}
                    </TabsContent> */}
                    <TabsContent value="deliveries" className="mt-0">
                      {renderDeliveriesTab()}
                    </TabsContent>
                    <TabsContent value="reversals" className="mt-0">
                      {renderReversalsTab()}
                    </TabsContent>
                  </>
                )}

                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-end gap-2 sm:gap-4 bg-gray-50 p-3 rounded-lg">
                {/* Remarks section */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-1">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 self-start sm:self-center">
                    Remarks
                  </Label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="text-xs sm:text-sm bg-white border-gray-300 h-[50px] w-full resize-none"
                    placeholder="Add remarks..."
                  />
                </div>

                {/* Buttons section */}
                <div className="flex flex-col xs:flex-row sm:flex-col lg:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => submitResponse(1)}
                    className="flex-1 sm:flex-none bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm px-4 py-2"
                    disabled={selectedTransaction?.status?.toLocaleLowerCase() !== "pending"}
                  >
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    APPROVE
                  </Button>
                
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => submitResponse(2)}
                    className="flex-1 sm:flex-none bg-red-500 text-white hover:bg-red-600 text-xs sm:text-sm px-4 py-2"
                    disabled={selectedTransaction?.status?.toLocaleLowerCase() !== "pending"}
                  >
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    DECLINE
                  </Button>
                </div>
              </div>

              </Tabs>
            </div>
          </div>
        </Modal>


        {/* Delivery Modal */}
        <Modal
          isOpen={showDeliveryModal}
          onClose={() => {
            setShowDeliveryModal(false);
          }}
           title={((selectedTransaction?.supplierId) === (selectedShop || sessionShop) ? `Stock Transfer to ${shops?.find(x=> x.id === transactionDetails?.locationId)?.name}` :`Receival from ${shops?.find(x => x.id === (selectedShopForStockTrans || transactionDetails?.supplierId))?.name || ""} (Trans # - ${transactionDetails?.transactionCode}`)}
          size='full'
        >
          <div className="w-full">
            <DeliveryTransactionUI
              setOpen={setShowDeliveryModal}
              selectedTransaction={transactionDetails}
              setTransactionDetails={setTransactionDetails}
              reloadSetterFunction={setStockTransfers}
              reloadUrl={`/StockTransfer?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}&From=${true}`}
              submitUrl="/StockTransfer/Request"
              transactionActionType="SALE"
              heading='Shops Delivery'
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}