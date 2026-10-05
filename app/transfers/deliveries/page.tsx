"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from "react";
import { Plus, User, Package,Truck, RotateCcw } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers } from "@/helpers/formatStrings";
import { Shop,  Transaction, TransactionItem } from "@/lib/types";
import { DataTable } from '@/components/dashboard/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryTransactionUI from '@/components/util/DeliveryTransactionUI';
import  { LoadingOverlay } from '@/components/SkeletonLoading';
import StatusBadge from '@/components/ui/statusbadge'
import { useToaster } from '@/components/util/CustomToast';
import { config } from '@/components/util/AppConfig';
import { CustomSelect } from '@/components/util/CustomSelect';
// Dynamic imports
const Modal = dynamic(() => import('@/components/dashboard/modal').then(mod => mod.Modal), { ssr: false });
const SaleTransactionUi = dynamic(() => import("@/components/util/SaleTransactionUi"), {
  loading: () => <div className="w-full p-8 text-center animate-pulse"><LoadingOverlay/></div>,
  ssr: false
});


export default function PurcahsePage() {
   const sessionShop = sessionStorage.getItem("selectedShop");
  const  toast = useToaster();
  const { selectedShop, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [sales, setStockTransfers] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<Transaction>>({});
  const [transactionDetails, setTransactionDetails] = useState<Partial<Transaction>>({});
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
  const [filterItem, setFilterItem] = useState<string>("");
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

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await axiosInstance.get(`/Transactions/${transactionId}/location/${selectedShop || sessionShop}`);
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
      const stockTransfers = await axiosInstance.get(`/StockTransfer/Approved-For-Delivery?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}`)
      console.log(stockTransfers.data)
      setStockTransfers(stockTransfers?.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    getStockTransfers();
  }, [selectedShopForStockTrans]);


  // console.log(selectedTransaction?.supplierId  ===  (selectedShop || sessionShop))
  // console.log()
  // console.log((selectedTransaction?.supplierId) === (selectedShop || sessionShop) ? `Transfer to ${shops?.find(x=> x.id === transactionDetails?.locationId)?.name})}` :`Receival from ${shops?.find(x => x.id === (selectedShopForStockTrans || transactionDetails?.supplierId))?.name || ""} (Trans # - ${transactionDetails?.transactionCode})`)
  // console.log(shops)
  const columns = [
    {
      key: "customerName" as keyof Transaction,
      label: "Shop",
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
    // {
    //   key: "type" as keyof Transaction,
    //   label: "Type",
    //   sortable: true,
    //   render: (value: Transaction) => (
    //     <div className="flex items-center gap-2">
    //       {/* <User className="h-4 w-4 text-muted-foreground" /> */}
    //       <span className="font-medium">{value?.supplierId === (selectedShop || sessionShop) ? "OUT FLOW" : "MY REQUEST"}</span>
    //     </div>
    //   ),
    // },
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
      <div className="space-y-4" style={{height:"Calc(100vh - 400px)", overflow:"scroll"}}>
       
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Item Name</th>
                <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Code</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Order Qty</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Delivered</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Received</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Unit Price</th>
                <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {details?.items?.map((item: TransactionItem, index: number) => (
                <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">{item.name || item.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{item.code}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{formatNumberWithCommas(item.quantity?.toString() || '0')}</td>
                   <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{formatNumberWithCommas(item.itemsDelivered.reduce((sum, el) => el?.quantity + sum, 0)?.toString())}</td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{formatNumberWithCommas(item.itemsReceived?.reduce((sum, el) => el?.quantity + sum, 0)?.toString())}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right"> {formatNumberWithCommas(item.unitPrice?.toFixed(2) || '0.00')}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold"> {formatNumberWithCommas((item.quantity * item.unitPrice)?.toFixed(2) || '0.00')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="p-2 sm:p-3 text-right font-bold text-xs sm:text-sm">Total</td>
                <td className="p-2 sm:p-3 text-right font-bold text-primary text-xs sm:text-sm">
                  {config.currency} {formatNumberWithCommas(details.totalAmount?.toFixed(2) || '0.00')}
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
       (selectedTransaction?.supplierId === (selectedShop || sessionShop) ? item.itemsDelivered : item?.itemsReceived).forEach((delivery: any) => {
          allDeliveries.push({
            itemName: item.name || item.itemName,
            itemCode: item.code,
            deliveryDate: delivery.deliveryDate,
            quantity: delivery.quantity,
            deliveredQuantity: delivery.quantity,
            deliveryId: delivery.deliveryId,
            reversals: delivery.itemReversals || [],
            batchId: delivery?.batchId
          });
        });
      }
    });
    
    if (filterItem) allDeliveries = allDeliveries.filter(x=> x.itemCode === filterItem)

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

    return (
      <div className="space-y-2" >
        {/* Date Filter - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end bg-gray-50 p-3 rounded-lg border-1 border-gray-300">
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
           <div className="flex flex-row sm:flex-row gap-2 w-full sm:w-auto">
               <div className="space-y-2 w-full ">
            <Label htmlFor="item" className="text-foreground">Select Item</Label>

             <CustomSelect
                options={transactionDetails?.items?.map((x) => ({
                  value: x.id.toString(),
                  label: x.name
                  // discriptionLabel: `${config.currency} ${formatNumberWithCommas(x?.costPrice?.toString())}`
                })) || []}
                value={filterItem}
                onValueChange={setFilterItem}
                placeholder="Select Item"
                required={true}
                searchable={true}
                clearable={true}
                size="md"
              />
            {/* <Select value={filterItem} onValueChange={setFilterItem}>
              <SelectTrigger className="bg-white border-border w-full">
                <SelectValue placeholder="Select Item" />
              </SelectTrigger>
              <SelectContent>
                {transactionDetails?.items?.map((item : any)  => (
                  <SelectItem key={item?.itemId || item?.id} value={item.code}>
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item?.code  + ", " + (item?.code?.length > 20 ? (item?.code?.slice(0, 20) + "..."): item?.code)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
          </div>
             
          <div  className='flex h-10 relative top-6'>
            {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(printContentRef)}
                    className="flex-1 sm:flex-none bg-blue-500 text-white hover:bg-blue-600 text-xs sm:text-sm"
                  >
                    🖨️ 
                  </Button> */}
             <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeliveryStartDate("");
                  setDeliveryEndDate("");
                  setFilterItem("")
                }}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
              X Clear  
              </Button>
          </div>

           </div>
          
          
        </div>

        <div className="overflow-x-auto"style={{height:"Calc(100vh - 500px)", overflow:"scroll"}} >
           {allDeliveries.length === 0 &&<div className="text-center py-8 sm:py-12">
            <Truck className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300" />
            <p className="text-gray-500 mt-2 text-sm sm:text-base">No supplies recorded for this transaction</p>
          </div>}

          {allDeliveries.length > 0 &&<table className="w-full min-w-[600px]" >
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
              {allDeliveries.sort((a, b) => a?.deliveryDate?.localeCompare(b?.deliveryDate)).map((delivery, index) => (
                <tr key={delivery.deliveryId || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{delivery.itemName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">{delivery.itemCode}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{alphaNumericDate(delivery.deliveryDate)}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">{formatNumberWithCommas(delivery.quantity?.toString() || '0')}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
          <div className='flex justify-end '>
             <p>{selectedTransaction?.supplierId === (selectedShop || sessionShop) ? "Deliveries " : "Receivals"}: <span className='font-semibold'> {(new Set(allDeliveries.map(x=> x?.batchId))).size}</span></p>
             <span style={{visibility:'hidden'}}>----</span>  
             <p> Quantity {selectedTransaction?.supplierId === (selectedShop || sessionShop) ? "Delivered" : "Received"}: <span className='font-semibold'> {allDeliveries.reduce((sum, r) => sum + r.quantity, 0)}</span></p>
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
    <div className=" w-full overflow-x-hidden">
      <Header
        title="Transfer Deliveries"
        description=""
      />

      <div className="relative">
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4">
          {!modalOpen &&
           <div className="space-y-2 md:col-span-4">
              {/* <Label htmlFor="item" className="text-foreground">
                Select Shop <span className="text-destructive">*</span>
              </Label>
              <CustomSelect
                options={shops?.map((x) => ({
                  value: x.id.toString(),
                  label: x.name,
                }))}
                value={selectedShopForStockTrans}
                onValueChange={setselectedShopForStockTrans}
                placeholder="Select Shop"
                required={true}
                searchable={true}
                clearable={true}
                size="md"
                className='w-[300px]'
              /> */}
            </div>
          // <div className="space-y-2 w-full sm:w-[300px] m-2">
          //   <Label htmlFor="item" className="text-foreground">Select Shop</Label>
          //   <Select value={selectedShopForStockTrans} onValueChange={setselectedShopForStockTrans}>
          //     <SelectTrigger className="bg-white border-border w-full">
          //       <SelectValue placeholder="Select Shop to request from" />
          //     </SelectTrigger>
          //     <SelectContent>
          //       {shops.map(item => (
          //         <SelectItem key={item.id} value={item.id.toString()}>
          //           <div className="flex flex-col">
          //             <span>{item.name}</span>
          //             <span className="text-xs text-muted-foreground">{item?.phone  + ", " + (item?.address?.length > 20 ? (item?.address?.slice(0, 20) + "..."): item?.address)}</span>
          //           </div>
          //         </SelectItem>
          //       ))}
          //     </SelectContent>
          //   </Select>
          // </div>
          }

         {/* <div className='m-1 lg:m-2 flex justify-center items-center'>
           {!modalOpen && <Button className="w-[98%]  m-auto lg:m-0 relative bottom-2 lg:bottom-0 sm:w-full sm:w-auto" onClick={() => {
            if (!selectedShopForStockTrans) {
              toast.info({
                title: 'Select shops',
                description: 'Please select shops to add',
              });
              return;
            }
            setModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>}
         </div> */}
        </div>

          {!modalOpen &&
            <CardContent className="m-0 p-0 overflow-x-auto">
              <DataTable
                title="Approved Transfers"
                data={sales}
                columns={columns}
                searchKey="customerName"
                addLabel="Add Purchase"
                emptyMessage="No transaction found for the selected shop."
                onRowClick={(row) => openTransactionDetails(row)}
                height="h-[calc(100vh-315px)] sm:h-[calc(100vh-265px)] md:h-[calc(100vh-263px)]"
              />
            </CardContent>}

        {/* Using your Modal component */}
          {modalOpen &&
              <SaleTransactionUi
                setOpen={setModalOpen}
                reloadSetterFunction={setStockTransfers}
                reloadUrl={`/StockTransfer?LocationId=${selectedShop || sessionShop}`}
                submitUrl="/StockTransfer/Request"
                businessPartnerLable="Request From "
                businessPartnerName={`${shops?.find(x => x.id === selectedShopForStockTrans)?.name ||  ""}`}
                businessPartnerValue={selectedShopForStockTrans}
                transactionActionType="TRANS"
                instantSale={false}
              />
          }

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
          // className='h-[100%]'
        >
          <div className="space-y-4 w-full px-2 sm:px-4  min-h-[480px]">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4 ">
              <div className="flex flex-col sm:flex-col lg:flex-row justify-between items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                 <div className='flex'>
                   <span>Delivery to : </span> 
                   <h2 className="text-sm  sm:text-xl font-bold text-gray-800 break-words">
                    {shops?.find(x => x.id === selectedTransaction?.customerId)?.name || ""}
                  </h2>
                 </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    {/* <p>{}</p> */}
                    <span className="text-xs sm:text-sm text-gray-600">Transaction: <span className="font-semibold">{selectedTransaction.transactionCode}</span></span>
                    <span className="text-xs sm:text-sm text-gray-600">Date: <span className="font-semibold">{alphaNumericDate(selectedTransaction.transactionDate || "")}</span></span>
                    <span><StatusBadge status={selectedTransaction?.status} className=''/> </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">

                   <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeliveryModal(true)}
                    className="flex-1 sm:flex-none bg-red-500 text-white hover:bg-red-300 text-xs sm:text-sm"
                    disabled={selectedTransaction?.supplierId !== (selectedShop || sessionShop) || selectedTransaction?.status?.toLocaleLowerCase()!== "approved"}
                  >
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    DELIVER
                  </Button>
                 
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeliveryModal(true)}
                    className="flex-1 sm:flex-none bg-purple-500 text-white hover:bg-purple-600 text-xs sm:text-sm"
                    disabled={selectedTransaction?.supplierId === (selectedShop || sessionShop) || selectedTransaction?.status?.toLocaleLowerCase() !== "approved"}
                  >
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    RECEIVE
                  </Button> */}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="w-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" >
                <TabsList className="grid w-full grid-cols-4 mb-4  bg-emerald-200 overflow-x-auto">
                  <TabsTrigger value="items" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Items</span>
                    <span className="sm:hidden">Items</span>
                  </TabsTrigger>
                  
                  <TabsTrigger value="deliveries" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:block">{selectedTransaction?.supplierId === (selectedShop || sessionShop) ? "Supplies" : "Receivals"}</span>
                    <span className="sm:hidden">Sup</span>
                  </TabsTrigger>
                  <TabsTrigger value="reversals" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Reversals</span>
                    <span className="sm:hidden">Rev</span>
                  </TabsTrigger>
                </TabsList>

                {isLoadingDetails ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div>
                    <TabsContent value="items" className="mt-0">
                      {renderItemsTab()}
                    </TabsContent>
                    <TabsContent value="deliveries" className="mt-0">
                      {renderDeliveriesTab()}
                    </TabsContent>
                    <TabsContent value="reversals" className="mt-0">
                      {renderReversalsTab()}
                    </TabsContent>
                  </div>
                )}
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
          title={((selectedTransaction?.supplierId) === (selectedShop || sessionShop) ? `Stock Transfer to ${shops?.find(x=> x.id === selectedTransaction?.customerId)?.name}` :`Receival from ${shops?.find(x => x.id === (selectedShopForStockTrans || transactionDetails?.supplierId))?.name || ""} (Trans # - ${transactionDetails?.transactionCode}`)}
          size='full'
        >
          <div className="w-full">
            <DeliveryTransactionUI
              setOpen={setShowDeliveryModal}
              selectedTransaction={transactionDetails}
              setTransactionDetails={setTransactionDetails}
              reloadSetterFunction={setStockTransfers}
              reloadUrl={`/StockTransfer/Approved-For-Delivery?LocationId=${selectedShop || sessionShop}`}
              submitUrl={selectedTransaction?.supplierId === (selectedShop || sessionShop)  ? "/Transactions/Delivery" : "StockTransfer/Receival"}
              transactionActionType={"TRANS"}
              heading='Shops Delivery'
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}