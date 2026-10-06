"use client";

import { useState, useCallback, useEffect, useRef, SetStateAction, Dispatch, useMemo } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { TruckIcon, X } from 'lucide-react';
import type { Transaction, CartItem, ItemStockLevelDTO } from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { formatNumberWithCommas, removeCommasFromNumbers, getDeliveredQuantity, getOriginalRemainingQuantity, getRemainingQuantity, toastErrors } from "@/helpers/formatStrings";
import { useToaster } from '@/components/util/CustomToast';
import StockLevelUi from "./StockLevelUi";
import TransactionItemSelection from "./TransactionItemSelectionUi";
import CartUi from "./DeliveryCart";
import { POSReceiptProps } from "./POSReceipt";
import { sessionStore } from "@/helpers/formatStrings";

interface TransactionUI {
  setOpen: (isOpen: boolean) => void;
  reloadUrl?: string;
  reloadSetterFunction?: Dispatch<SetStateAction<Transaction[]>>;
  setTransactionDetails?: Dispatch<SetStateAction<any>>;
  selectedTransaction: Partial<Transaction>;
  submitUrl?: string;
  actionType?: string; 
  transactionActionType?: string;
  heading: string;
  setReceiptData?: Dispatch<SetStateAction<POSReceiptProps | null>>
  setActiveTab? : Dispatch<SetStateAction<'items'| 'payments' | 'deliveries' | 'reversals' | string>>
}

export default function DeliveryTransactionUI(prop: TransactionUI) {
  const toast = useToaster()
  const { user, selectedShop } = useAuth();
  
  // ==================== ALL useState HOOKS FIRST ====================
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState('');
  const [cart, setCart] = useState<Array<CartItem>>([]);
    const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null)
    const [checkingStock, setCheckingStock] = useState<boolean>(false)

  // ==================== ALL useRef HOOKS SECOND ====================
  const isMountedRef = useRef(true);

  // ==================== ALL useMemo HOOKS THIRD ====================
  const isStockTransfer = useMemo(() => 
    prop?.transactionActionType?.toLowerCase() === "TRANS",
    [prop?.transactionActionType]
  );

  const selectedTransaction = useMemo(() => prop?.selectedTransaction, [prop?.selectedTransaction]);


  const reset = useCallback(() => {
    setAmountPaid("");
    setDate("");
    prop.setOpen(false);
  }, [prop]);

     
const checkStock = async (itemId: string) => {
    if (!itemId) {
      setStockLevel(null);
      return;
    }

    // if (debounceTimerRef.current) {
    //   clearTimeout(debounceTimerRef.current);
    // }

    // if (abortControllerRef.current) {
    //   abortControllerRef.current.abort();
    // }

    // debounceTimerRef.current = setTimeout(async () => {
    //   if (!isMountedRef.current) return;
      
    //   abortControllerRef.current = new AbortController();
      
      setCheckingStock(true);
      try {
        const sessionShop = sessionStore.get("selectedShop");
        const locationId = selectedShop || sessionShop;
        
        if (!locationId) {
            setCheckingStock(false);
          return;
        }

        const response = await axiosInstance.get(`/Items/Stock-Level/${itemId}?locationId=${locationId}`);
        
        if ( response?.data) { //isMountedRef.current &&
          setStockLevel(response.data);
          
          if (response.data.availableQuantity < 5 && response.data.availableQuantity > 0) {
            toast.warning?.({
              title: 'Low Stock Warning',
              description: `Only ${response.data.availableQuantity} units left in stock for ${response.data.name}`,
            });
          }
          
          if (response.data.availableQuantity === 0) {
            toast.warning?.({
              title: 'Out of Stock',
              description: `${response.data.name} is currently out of stock`,
            });
          }
        }
      } catch (error: any) {
        toastErrors(toast, error)
        
       console.error('Error checking stock level:', error);
    //     if (isMountedRef.current) {
          setStockLevel({
            name: '',
            code: '',
            reorderLevel: 0,
            availableQuantity: 0,
            actualQuantity: 0
          });
        
      } finally {
        // if (isMountedRef.current) {
          setCheckingStock(false);
        // }
      }
    }

    useEffect(() => {
        checkStock(selectedItem)
    }, [selectedItem])

  const handleSubmit = useCallback(async () => {
    // console.log("HERERERER")
    if (cart.length === 0 || !date) {
      toast.info({
        title: 'Enter all required fields',
        description: isStockTransfer ? 'Please add items and select a date' : 'Please add items, enter transportation cost, and select a date',
      });
      return;
    }

    if (!isStockTransfer && !amountPaid && selectedTransaction?.supplierName) {
      toast.info({
        title: 'Transportation cost required',
        description: 'Please enter transportation cost',
      });
      return;
    }

    setLoading(true);
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const transaction = {
        locationId: sessionShop || selectedShop,
        transactionId: selectedTransaction.id || selectedTransaction.transactionId,
        date,
        transportation: 0,
        items: cart.map((c) => ({
          itemId: c.id,
          quantity: removeCommasFromNumbers((c?.receivingQuantity || 0).toString()),
          //batchId : 
        })),
      };

      const url = prop.submitUrl || "";
      const response = await axiosInstance.post(url, transaction);

      toast.success({
        title: 'Submitted successfully',
        description: 'Delivery saved successfully',
      });

      if (prop?.transactionActionType?.toLowerCase().trim() == "sale") {
        prop?.setReceiptData && prop?.setReceiptData({
          qrCode: response?.data?.qrCode, 
          transactionNumber: selectedTransaction?.transactionCode || "", 
          uniqueCount: response?.data?.count,
          showQRCode: true 
        });
      }

      if (prop.reloadUrl && prop?.reloadSetterFunction) {
        await axiosInstance.get(prop.reloadUrl).then((res) => {
          prop?.reloadSetterFunction?.(res?.data);
        });
      }

      if (prop.setTransactionDetails && selectedTransaction.id) {
        await axiosInstance.get(`Transactions/${selectedTransaction.id}/location/${selectedShop || sessionShop}`).then(res => {
          prop.setTransactionDetails?.(res?.data);
        });
      }

      setCart([]);
      reset();
      prop?.setActiveTab && prop?.setActiveTab('deliveries')

    } catch (error: any) {
      console.error("Error completing delivery:", error);
      toastErrors(toast, error, "", false)
    } finally {
      setLoading(false);
    }
  }, [cart, date, amountPaid, isStockTransfer, selectedTransaction, prop, toast, reset, selectedShop]);

  // ==================== ALL useEffect HOOKS FIFTH ====================
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // useEffect(() => {
  //   console.log(`[DeliveryTransactionUI] selectedTransaction changed:`, selectedTransaction);
  // }, [selectedTransaction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==================== CONDITIONAL RETURN AFTER ALL HOOKS ====================
  if (loading) {
    return <Loading />;
  }

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md w-full overflow-x-hidden">
      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Left Column - Items Selection and Cart */}
          <div className="lg:col-span-3 space-y-2 sm:space-y-3">
            {/* Items Selection Card */}
            <Card className="border-border">
              <CardContent className="">
                <StockLevelUi 
                  itemId={selectedItem}
                  stockLevel={stockLevel}
                  loading={checkingStock}
                />

                <TransactionItemSelection
                  cart={cart}
                  isStockTransfer={isStockTransfer}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  selectedTransaction={selectedTransaction}
                  transactionActionType={prop.transactionActionType}
                  setCart={setCart}
                 // stockLevel={stockLevel}
                />
              </CardContent>
            </Card>

            {/* Purchase Order Table */}
           <CartUi
              dataSource={cart}
              setDataSource={setCart}
              headers={['name', 'quantity', 'receivingQuantity', 'remainingQuantity']}
              columnLabels={ {
                          name: 'Product',
                          quantity: 'Ordered',
                          receivingQuantity: 'Receiving',
                          remainingQuantity: 'Remaining'
                      }
              }
           />
          </div>

          {/* Right Column - Supplier and Purchase Actions */}
          <div className="space-y-0">
            <Card className="border-border p-2">
              <CardContent className="p-0 space-y-2">
                {/* Transportation Cost - Hidden for Stock Transfer */}
                {!isStockTransfer && selectedTransaction?.supplierName && (
                  <div className="space-y-1">
                    <Label htmlFor="transport" className="text-xs sm:text-sm text-foreground">Transportation Cost</Label>
                    <Input
                      id="transport"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(formatNumberWithCommas(e.target.value))}
                      className="bg-white border-border text-xs sm:text-sm"
                      style={{ textAlign: "right" }}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* Date */}
                <div className="space-y-1">
                  <Label htmlFor="hireDate" className="text-xs sm:text-sm text-foreground">Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="pl-7 sm:pl-10 bg-white border-border text-xs sm:text-sm"
                      max={new Date().toISOString().split('T')[0]}
                      min={selectedTransaction?.transactionDate?.split('T')[0]}
                    />
                  </div>
                </div>

                <hr className="my-2" />

                {/* Action Buttons */}
                <div className="space-y-2 flex justify-center sm:block">
                  <Button
                    className="m-1 sm:w-full bg-success hover:bg-success/90 text-xs sm:text-sm"
                    onClick={handleSubmit}
                    disabled={cart.length === 0 || !date || (!isStockTransfer && !amountPaid && !!selectedTransaction?.supplierName)}
                  >

                    {/* isStockTransfer && selectedTransaction?.supplierId !== (selectedShop || sessionStore.get("selectedShop")) 
                    || (!isStockTransfer && (selectedTransaction?.transactionCode?.toUpperCase()?.startsWith("PUR") || selectedTransaction.supplierId) ) */}
                    <TruckIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {"Deliver"}
                  </Button>

                  <Button
                    className="m-1 sm:w-full bg-warning hover:bg-warning/90 text-warning-foreground text-xs sm:text-sm"
                    onClick={() => {
                      setCart([]);
                      setSelectedItem("");
                      setQuantity("");
                      setAmountPaid("");
                      setDate("");
                    }}
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {toast.ToastComponent}
    </div>
  );
}