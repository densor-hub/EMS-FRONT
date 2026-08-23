"use client";

import { useState, useCallback, useEffect, useRef, SetStateAction, Dispatch } from "react";
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  ShoppingCart,
  Trash2,
  TruckIcon,
  CreditCard, 
  Banknote,
  Plus,
  X,
  ArrowBigLeft,
  Calendar,
  Loader2,
  AlertCircle
  
} from 'lucide-react';
import type { Item, Supplier, Transaction, TransactionItem, ItemStockLevelDTO, CartItem } from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { formatNumberWithCommas, removeCommasFromNumbers, getDeliveredQuantity, getOriginalRemainingQuantity, getRemainingQuantity, toastErrors } from "@/helpers/formatStrings";
import { useToast } from "@/hooks/use-toast";
import StockLevelUi from "./StockLevelUi";
import TransactionItemSelection from "./TransactionItemSelectionUi";
import CartUi from "./Cart";
import POSReceipt, { POSReceiptProps } from "./POSReceipt";

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
  //receiptData? : POSReceiptProps | null,
  setReceiptData?: Dispatch<SetStateAction<POSReceiptProps | null>>
}

export default function DeliveryTransactionUI(prop: TransactionUI) {
  const { toast } = useToast();
  const { user, selectedShop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBusinessPartner, setBusinessPartner] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState('');
  const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const isMountedRef = useRef(true);
  const dateRef = useRef<HTMLInputElement>(null);

  // Check if transaction type is stock transfer
  const isStockTransfer = prop?.transactionActionType?.toLowerCase() === "stock transfer";

  // Cart items with proper typing
  const [cart, setCart] = useState<Array<CartItem>>([]);

  const getLocationId = useCallback(() => {
    return selectedShop || sessionStorage.getItem("selectedShop") || "";
  }, [selectedShop]);

  // FIX: Move the addToCart logic into a useCallback function
  const addToCart = useCallback(() => {
    const item = prop?.selectedTransaction?.items?.find(i => i.itemId === selectedItem || i.id === selectedItem);
    
    if (!item) {
      toast.warning({
        title: 'Item not found',
        description: 'Selected item could not be found',
      });
      return;
    }

    const remainingQty = getRemainingQuantity(item, isStockTransfer, prop?.selectedTransaction?.supplierId || "", cart);
    const qtyToDeliver = parseFloat(removeCommasFromNumbers(quantity)?.toString());
    
    if (qtyToDeliver > remainingQty) {
      toast.warning({
        title: 'Quantity exceeds remaining',
        description: `Quantity ${qtyToDeliver} exceeds remaining quantity (${remainingQty})`,
      });
      return;
    }

    if (qtyToDeliver <= 0) {
      toast.warning({
        title: 'Invalid quantity',
        description: 'Quantity must be greater than 0',
      });
      return;
    }

    const existingIndex = cart.findIndex((c) => c.id === item.id || c.id === item.itemId);

    if (existingIndex >= 0) {
      // Update existing cart item
      const newCart = [...cart];
      const totalDelivering = newCart[existingIndex].receivingQuantity + qtyToDeliver;
      
      if (totalDelivering > getOriginalRemainingQuantity(item, isStockTransfer, prop?.selectedTransaction?.supplierId || "")) {
        toast.warning({
          title: 'Exceeds remaining quantity',
          description: `Total delivering (${totalDelivering}) exceeds remaining quantity (${getOriginalRemainingQuantity(item, isStockTransfer, prop?.selectedTransaction?.supplierId || "")})`,
        });
        return;
      }
      
      newCart[existingIndex].receivingQuantity = totalDelivering;
      newCart[existingIndex].remainingQuantity = getOriginalRemainingQuantity(item, isStockTransfer, prop?.selectedTransaction?.supplierId || "") - totalDelivering;
      setCart(newCart);
    } else {
      // Add new item to cart
      setCart([...cart, {
        id: item.itemId || item.id,
        name: item.name || item.itemName,
        code: item.code || '',
        costPrice: item.costPrice || 0,
        price: item.unitPrice || 0,
        quantity: item.quantity || 0,
        deliveredQuantity: getDeliveredQuantity(item, isStockTransfer, prop?.selectedTransaction?.supplierId || ""),
        receivingQuantity: qtyToDeliver,
        remainingQuantity: getOriginalRemainingQuantity(item, isStockTransfer, prop?.selectedTransaction?.supplierId || "") - qtyToDeliver,
      }]);
    }

    // Reset form
    setSelectedItem("");
    setQuantity("");
  }, [selectedItem, quantity, cart, prop?.selectedTransaction, isStockTransfer, toast]);


  const reset = useCallback(() => {
    setAmountPaid("");
    setDate("");
    setModalOpen(false);
    prop.setOpen(false);
  }, [prop]);

  const checkStockLevel = useCallback(async (itemId: string) => {
    if (!itemId) {
      setStockLevel(null);
      return;
    }

    setCheckingStock(true);
    try {
      const response = await axiosInstance.get(`/Items/Stock-Level/${itemId}?locationId=${getLocationId()}`);
      
      if (isMountedRef.current) {
        setStockLevel(response?.data);
        
        if (response?.data?.availableQuantity < 5 && response?.data?.availableQuantity > 0) {
          toast.warning({
            title: 'Low Stock Warning',
            description: `Only ${response.data.availableQuantity} units left in stock for ${response.data.name}`,
          });
        }
        
        if (response?.data?.availableQuantity === 0) {
          toast.warning({
            title: 'Out of Stock',
            description: `${response.data.name} is currently out of stock`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking stock level:', error);
      setStockLevel({
        name: '',
        code: '',
        reorderLevel: 0,
        availableQuantity: 0,
        actualQuantity: 0
      });
      toast.warning({
        title: 'Technical Challenge',
        description: 'Failed to check stock level',
      });
    } finally {
      if (isMountedRef.current) {
        setCheckingStock(false);
      }
    }
  }, [getLocationId, toast]);

  // Watch for selectedItem changes and check stock
  useEffect(() => {
    if (selectedItem) {
      checkStockLevel(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, checkStockLevel]);

  const handleSubmit = useCallback(async () => {
    // Modified validation: For stock transfer, only require cart items and date
    if (cart.length === 0 || !date) {
      toast.info({
        title: 'Enter all required fields',
        description: isStockTransfer ? 'Please add items and select a date' : 'Please add items, enter transportation cost, and select a date',
      });
      return;
    }

    // For non-stock transfer, require amount paid
    if (!isStockTransfer && !amountPaid && prop?.selectedTransaction?.supplierName) {
      toast.info({
        title: 'Transportation cost required',
        description: 'Please enter transportation cost',
      });
      return;
    }

    setLoading(true);
    try {
      const sessionShop = sessionStorage.getItem("selectedShop");
      const transaction = {
        locationId: sessionShop || selectedShop,
        transactionId: prop?.selectedTransaction.id || prop?.selectedTransaction.transactionId,
        date,
        transportation: 0,
        items: cart.map((c) => ({
          itemId: c.id,
          quantity: removeCommasFromNumbers(c.receivingQuantity.toString()),
        })),
      };

      const url = prop.submitUrl || "";
     const response = await axiosInstance.post(url, transaction);

      toast.success({
        title: 'Submitted successfully',
        description: 'Delivery saved successfully',
      });

      if (prop?.transactionActionType?.toLowerCase().trim() == "sale") {
        prop?.setReceiptData && prop?.setReceiptData({qrCode : response?.data?.qrCode, transactionNumber : prop?.selectedTransaction.transactionCode || "", showQRCode: true });
      }

      if (prop.reloadUrl && prop?.reloadSetterFunction) {
        await axiosInstance.get(prop.reloadUrl).then((res) => {
          prop?.reloadSetterFunction?.(res?.data);
        });
      }

      if (prop.setTransactionDetails && prop.selectedTransaction.id) {
        await axiosInstance.get(`Transactions/${prop.selectedTransaction.id}`).then(res => {
          prop.setTransactionDetails?.(res?.data);
        });
      }

      setCart([]);
      setBusinessPartner("");
      setModalOpen(false);
      reset();

    } catch (error: any) {
      console.error("Error completing delivery:", error);
      toastErrors(toast, error, "", false)
    } finally {
      setLoading(false);
    }
  }, [cart, date, amountPaid, isStockTransfer, prop, toast, reset, selectedShop]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);


  if (loading) {
    return <Loading />;
  }

  // console.log(receiptData)
  // Calculate total quantity being delivered (safe to do during render)
 

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
                  checkingStock={checkingStock}
                  selectedItem={selectedItem}
                  stockLevel={stockLevel}
                />

                <TransactionItemSelection
                  cart={cart}
                  isStockTransfer={isStockTransfer}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  selectedTransaction={prop.selectedTransaction}
                  transactionActionType={prop.transactionActionType}
                  setCart={setCart}
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
                {!isStockTransfer && prop?.selectedTransaction?.supplierName && (
                  <div className="space-y-1">
                    <Label htmlFor="transport" className="text-xs sm:text-sm text-foreground">Transportation Cost</Label>
                    <Input
                      id="transport"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(formatNumberWithCommas(e.target.value))}
                      className="bg-secondary border-border text-xs sm:text-sm"
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
                      className="pl-7 sm:pl-10 bg-secondary border-border text-xs sm:text-sm"
                      max={new Date().toISOString().split('T')[0]}
                      min={prop?.selectedTransaction?.transactionDate?.split('T')[0]}
                    />
                  </div>
                </div>

                <hr className="my-2" />

                {/* Action Buttons */}
                <div className="space-y-2 flex justify-center sm:block">
                  <Button
                    className="m-1 sm:w-full bg-success hover:bg-success/90 text-xs sm:text-sm"
                    onClick={() => {
                      if (cart.length === 0 || !date) {
                        toast.info({
                          title: 'Enter all required fields',
                          description: isStockTransfer ? 'Please add items and select a date' : 'Please add items, enter transportation cost, and select a date',
                        });
                        return;
                      }
                      
                      if (!isStockTransfer && !amountPaid && prop?.selectedTransaction?.supplierName) {
                        toast.info({
                          title: 'Transportation cost required',
                          description: 'Please enter transportation cost',
                        });
                        return;
                      }
                      
                      handleSubmit();
                    }}
                    disabled={cart.length === 0 || !date || (!isStockTransfer && !amountPaid && !!prop?.selectedTransaction?.supplierName)}
                  >
                    <TruckIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isStockTransfer && prop.selectedTransaction?.supplierId !== (selectedShop || sessionStorage.getItem("selectedShop")) ? "Receive" : "Deliver"}
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

      {/* Purchase Confirmation Modal */}
      
    </div>
  );
}