// app/dashboard/stock-lockdown/page.tsx or wherever you have this component
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar,
  Lock,
  Clock,
  Loader2,
  X
} from 'lucide-react';
import type { Item, ItemStockLevelDTO, CartItem } from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { formatNumberWithCommas, alphaNumericDate, removeCommasFromNumbers } from "@/helpers/formatStrings";
import { useToaster } from '@/components/util/CustomToast';
import { useRouter } from 'next/navigation';
import ItemSelection from "@/components/util/ItemSelection";
import { SaleCart, CartColumn } from "@/components/util/SaleCart";
import { toastErrors } from "@/helpers/formatStrings";
import { sessionStore } from '@/helpers/formatStrings';

// Types
interface StockLockDownPayload {
  locationId: string;
  transactionDate: string;
  itemIds: string[];
  turnAroundTime: string;
}

// Helper functions
const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

// Define columns OUTSIDE component to prevent recreation
const columns: CartColumn<CartItem>[] = [
  {
    key: 'name',
    header: 'Item',
    align: 'left',
    width: '40%',
  },
  {
    key: 'code',
    header: 'Code',
    align: 'center',
    width: '15%',
    render: (item) => item.code?.slice(0, 5) || 'N/A',
  },
  {
    key: 'unitOfMeasureName',
    header: 'Unit',
    align: 'center',
    width: '20%',
    render: (item) => item.unitOfMeasureName || item.unitOfMeasure || 'N/A',
  },
  {
    key: 'availableQuantity',
    header: 'Available',
    align: 'center',
    width: '20%',
    render: (item) => item.availableQuantity ?? item.stockLevel?.availableQuantity ?? 0,
  },
];

export default function StockLockDownUI({ setOpen, reloadUrl, reloadSetterFunction }: any) {
  const toast = useToaster()
  const { selectedShop } = useAuth();
  const router = useRouter();
  
  // State
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stockLockItems, setStockLockItems] = useState<CartItem[]>([]);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [turnAroundDate, setTurnAroundDate] = useState("");
  const [turnAroundTime, setTurnAroundTime] = useState("00:00");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null);
  const [loadingStockLevel, setLoadingStockLevel] = useState(false);
  
  // Refs
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);

  
  const isFormValid = useMemo(() => {
    const hasItems = stockLockItems.length > 0;
    const hasTransactionDate = !!transactionDate;
    const hasTurnAroundDate = !!turnAroundDate;
    const hasTurnAroundTime = !!turnAroundTime;
    
    return hasItems && hasTransactionDate && hasTurnAroundDate && hasTurnAroundTime;
  }, [stockLockItems.length, transactionDate, turnAroundDate, turnAroundTime]);

  // Load items
  const loadItems = useCallback(async () => {
    if (isLoadingRef.current || !isMountedRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const sessionShop = sessionStore.get("selectedShop");
      
      if (!selectedShop && !sessionShop) {
        router.push('/select-shop');
        return;
      }
      
      const response = await axiosInstance.get(`/Items/Stocking?LocationId=${selectedShop || sessionShop}`);
      
      if (isMountedRef.current) {
        setItems(response?.data || []);
        setErrors(prev => ({ ...prev, loadData: '' }));
      }
    } catch (error: any) {
      console.error("Error loading items:", error);
      
      if (isMountedRef.current) {
        const errorMessage = error?.response?.data?.message || 'Failed to load items. Please refresh the page.';
        setErrors(prev => ({ ...prev, loadData: errorMessage }));
        
        toast.error({
          title: 'Failed to load items',
          description: errorMessage,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [selectedShop, router]);

  // Fetch stock level
  const fetchStockLevel = useCallback(async (itemId: string) => {
    if (!itemId) {
      setStockLevel(null);
      return;
    }
    
    setLoadingStockLevel(true);
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const response = await axiosInstance.get(`/Items/Stock-Level/${itemId}?locationId=${sessionShop || selectedShop}`);
      if (isMountedRef.current) {
        setStockLevel(response?.data);
      }
    } catch (error) {
      console.error("Error fetching stock level:", error);
      setStockLevel(null);
    } finally {
      if (isMountedRef.current) {
        setLoadingStockLevel(false);
      }
    }
  }, [selectedShop]);

  // Effects
  useEffect(() => {
    isMountedRef.current = true;
    
    const sessionShop = sessionStore.get("selectedShop");
    if (!selectedShop && !sessionShop) {
      router.push('/select-shop');
      return;
    }
    
    loadItems();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadItems, selectedShop, router]);

  // Fetch stock level when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setStockLevel(null);
      fetchStockLevel(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, fetchStockLevel]);

  // Set default turn around date
  useEffect(() => {
    const defaultTurnAround = new Date();
    defaultTurnAround.setDate(defaultTurnAround.getDate() + 7);
    setTurnAroundDate(defaultTurnAround.toISOString().split('T')[0]);
    setTurnAroundTime("00:00");
  }, []);

  // Validation
  const validateAddItem = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedItem) {
      newErrors.selectedItem = 'Please select an item';
    }
    
    // if ((!quantity || parseFormattedNumber(quantity) <= 0) && !i) {
    //   newErrors.quantity = 'Please enter a valid quantity';
    // }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedItem, quantity]);

  const validateSubmit = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (stockLockItems.length === 0) {
      newErrors.items = 'Please add at least one item to lock';
    }
    
    if (!transactionDate) {
      newErrors.transactionDate = 'Please select a transaction date';
    }
    
    if (!turnAroundDate) {
      newErrors.turnAroundDate = 'Please select a turn around date';
    }
    
    if (!turnAroundTime) {
      newErrors.turnAroundTime = 'Please select a turn around time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [stockLockItems.length, transactionDate, turnAroundDate, turnAroundTime]);

  // From your SaleTransactionUI component - EXACT method

  // From your SaleTransactionUI component
const addToCart = useCallback(() => {
  validateAddItem()

  const item = items.find(i => i.id === selectedItem);
  if (!item) {
    toastErrors(toast, 'The selected item no longer exists',"", false)
    return;
  }


  const qty = parseFormattedNumber(quantity);
  
  const availableQty = stockLevel?.availableQuantity ?? item.quanityInUnit ?? 0;
  if (qty > availableQty) {
    toastErrors(toast, `Only ${availableQty} units available. Please reduce the quantity.`,'Insufficient Stock', false)
    return;
  }
  
  setStockLockItems(prevCart => {
    const existingIndex = prevCart.findIndex((c) => c.id === selectedItem);
    
    if (existingIndex >= 0) {
      const newCart = [...prevCart];
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        quantity: qty,
        price: items?.find(x=> x.id  === selectedItem)?.sellingPrice || 0,
        availableQuantity: stockLevel?.availableQuantity,
        unitOfMeasure: item.unitOfMeasure,

      };
      return newCart;
    } else {
      return [...prevCart, { 
        item, 
        quantity: qty, 
        price: items?.find(x=> x.id  === selectedItem)?.sellingPrice || 0,
        deliveredQty: 0,
         id: item.id,
        name: item.name,
        code: item.code,
        availableQuantity: stockLevel?.availableQuantity,
        unitOfMeasure: item.unitOfMeasure,
      }];
    }
  });

  setSelectedItem("");
  setQuantity("");
  // setUnitPrice("");
  setStockLevel(null);
  setErrors(prev => ({ ...prev, selectedItem: '', quantity: '', unitPrice: '' }));
  
  toast.success({
    title: 'Item added',
    description: `${item.name} (${qty} units) added to cart`,
  });
}, [selectedItem, quantity, items, stockLevel, validateAddItem]);
  const removeItem = useCallback((item: CartItem, index: number) => {
    setStockLockItems(prev => prev.filter((_, i) => i !== index));
    toast.info({
      title: 'Item removed',
      description: `${item.name} has been removed from lock down`,
    });
  }, []);

  const clearItems = useCallback(() => {
    if (stockLockItems.length === 0) return;
    
    setStockLockItems([]);
    setErrors({});
    
    toast.info({
      title: 'Cleared',
      description: 'All items have been removed from lock down',
    });
  }, [stockLockItems.length]);

  const resetForm = useCallback(() => {
    setStockLockItems([]);
    setQuantity("");
    setSelectedItem("");
    setStockLevel(null);
    setTransactionDate(new Date().toISOString().split('T')[0]);
    const defaultTurnAround = new Date();
    defaultTurnAround.setDate(defaultTurnAround.getDate() + 7);
    setTurnAroundDate(defaultTurnAround.toISOString().split('T')[0]);
    setTurnAroundTime("00:00");
    setErrors({});
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateSubmit()) {
      toast.warning({
        title: 'Validation Error',
        description: 'Please fix all errors before submitting',
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const sessionShop = sessionStore.get("selectedShop");
      const locationId = selectedShop || sessionShop || '';
      
      const turnAroundDateTime = new Date(`${turnAroundDate}T${turnAroundTime}:00`);
      
      const payload: StockLockDownPayload = {
        locationId: locationId,
        transactionDate: new Date(transactionDate).toISOString(),
        itemIds: stockLockItems.map(item => item.id),
        turnAroundTime: turnAroundDateTime.toISOString()
      };

      await axiosInstance.post("/StockLockDown", payload);

      toast.success({
        title: 'Stock locked down',
        description: `Successfully locked ${stockLockItems.length} items`,
      });

      if (reloadUrl && reloadSetterFunction) {
        const reloadResponse = await axiosInstance.get(reloadUrl);
        reloadSetterFunction(reloadResponse?.data);
      }

      loadItems();
      resetForm();
      
      if (setOpen) {
        setOpen(false);
      }

    } catch (error: any) {
      console.error("Error locking items:", error);
      
      const errorMessage = typeof(error?.response?.data) === "string" 
        ? error?.response?.data 
        : error?.response?.data?.message || 'Failed to lock items. Please try again.';
      
      toast.error({
        title: 'Lock down failed',
        description: errorMessage,
      });
      
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setSubmitting(false);
    }
  }, [stockLockItems, transactionDate, turnAroundDate, turnAroundTime, selectedShop, setOpen, reloadUrl, reloadSetterFunction, validateSubmit, loadItems, resetForm]);

  // Key extractor for cart items
  const keyExtractor = useCallback((item: CartItem) => item.id, []);

  // If no shop selected
  const sessionShop = sessionStore.get("selectedShop");
  if (!selectedShop && !sessionShop) {
    return null;
  }

  // Render loading state
  if (loading || submitting) {
    return <Loading />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md p-0">
      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* Left Column - Items Selection */}
        <div className="lg:col-span-3 space-y-2 mb-0 m-2 ">
          <ItemSelection
            items={items}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            quantity={quantity}
            setQuantity={setQuantity}
            stockLevel={stockLevel}
            // setStockLevel={setStockLevel}
            isStockLevelLoading={loadingStockLevel}
            disableCartAdition={submitting}
            errors={errors}
            onAddItem={addToCart}
            transactionActionType={"STOCK"}
            // price={}
          />

          {/* Stock Lock Items Table */}
          <SaleCart
            dataSource={stockLockItems}
            columns={columns}
            onRemove={removeItem}
            onClear={clearItems}
            loading={submitting}
            emptyMessage="No items in lock down"
            emptySubMessage="Add items using the form above"
            height="h-fit lg:h-[calc(100vh-340px)]"
            keyExtractor={keyExtractor}
          />
        </div>

        {/* Right Column - Stock Lock Details */}
        <div className="space-y-2 mt-2 mr-2">
          <Card className="border-border h-full p-3"  >
            <CardContent className=" space-y-4 px-0" >
              {/* Transaction Date */}
              <div className="space-y-2">
                <Label htmlFor="transactionDate" className="text-foreground">
                  Transaction Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  {/* <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> */}
                  <Input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full  text-xs sm:text-sm bg-white border-border"
                    readOnly={true}
                    disabled={true}
                  />

                </div>
                {errors.transactionDate && (
                  <p className="text-sm text-destructive mt-1">{errors.transactionDate}</p>
                )}
              </div>

              {/* Turn Around Date & Time */}
              <div className="space-y-2">
                <Label htmlFor="turnAroundDate" className="text-foreground">
                  Turn Around Date & Time <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="relative col-span-2">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={turnAroundDate}
                      onChange={(e) => setTurnAroundDate(e.target.value)}
                      className="w-full  text-xs sm:text-sm bg-white border-border"
                      min={transactionDate?.split("T")[0]}
                    />
                  </div>
                  
                  {/* Time Input */}
                  <div className="relative col-span-2">
                    <Input
                      id="turnAroundTime"
                      type="time"
                      value={turnAroundTime}
                      onChange={(e) => setTurnAroundTime(e.target.value)}
                      className={`bg-white border-border ${errors.turnAroundTime ? 'border-destructive' : ''}`}
                      aria-invalid={!!errors.turnAroundTime}
                      step="900"
                    />
                  </div>
                </div>
                {errors.turnAroundDate && (
                  <p className="text-sm text-destructive mt-1">{errors.turnAroundDate}</p>
                )}
                {errors.turnAroundTime && (
                  <p className="text-sm text-destructive mt-1">{errors.turnAroundTime}</p>
                )}
              </div>

              <hr className="my-2" />

              {/* Summary */}
              <div className="space-y-2">
                <div className="bg-secondary rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{stockLockItems.length}</span>
                  </div>
                 
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction Date</span>
                    <span className="font-medium">{alphaNumericDate(transactionDate)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Turn Around Date</span>
                    <span className="font-medium">
                      {alphaNumericDate(turnAroundDate)} 
                    </span>

                  </div>

                  <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Turn Around Time</span>
                        <span className="font-medium">
                          {turnAroundTime}
                        </span>
                      </div>
                  </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 flex lg:flex-col gap-2 justify-center">
                <Button
                  className="w-fit lg:w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    if (!isFormValid) {
                      validateSubmit();
                      toast.warning({
                        title: 'Incomplete form',
                        description: 'Please fill in all required fields',
                      });
                      return;
                    }
                    handleSubmit();
                  }}
                  disabled={!isFormValid || submitting}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Lock Items'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-fit lg:w-full"
                  onClick={resetForm}
                  disabled={stockLockItems.length === 0 || submitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset Form
                </Button>
              </div>

              {errors.submit && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
                  <p className="text-sm">{errors.submit}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {toast.ToastComponent}
    </div>
  );
}