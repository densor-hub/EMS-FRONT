"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Trash2,
  Plus,
  X,
  Calendar,
  AlertCircle,
  Lock,
  Clock
} from 'lucide-react';
import type { Item, ItemStockLevelDTO } from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { formatNumberWithCommas, alphaNumericDate } from "@/helpers/formatStrings";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

// Types
interface StockLockDownItem {
  itemId: string;
  quantity: number;
  totalPieces: number;
  item?: Item;
  stockLevel?: ItemStockLevelDTO;
}

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

export default function StockLockDownUI({ setOpen, reloadUrl, reloadSetterFunction }: any) {
  const { toast } = useToast();
  const { user, selectedShop, company } = useAuth();
  const router = useRouter();
  
  // State
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stockLockItems, setStockLockItems] = useState<StockLockDownItem[]>([]);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [turnAroundDate, setTurnAroundDate] = useState("");
  const [turnAroundTime, setTurnAroundTime] = useState("00:00"); // Default time
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null);
  const [loadingStockLevel, setLoadingStockLevel] = useState(false);
  
  // Refs
  const dateRef = useRef<HTMLInputElement>(null);
  const turnAroundRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Get selected item details
  const selectedItemDetails = useMemo(() => {
    return items.find(i => i.id === selectedItem);
  }, [selectedItem, items]);

  // Memoized values
  const totalPieces = useMemo(() => 
    stockLockItems.reduce((sum, item) => sum + item.totalPieces, 0),
    [stockLockItems]
  );

  const totalQuantity = useMemo(() => 
    stockLockItems.reduce((sum, item) => sum + item.quantity, 0),
    [stockLockItems]
  );

  const isFormValid = useMemo(() => {
    const hasItems = stockLockItems.length > 0;
    const hasTransactionDate = !!transactionDate;
    const hasTurnAroundDate = !!turnAroundDate;
    const hasTurnAroundTime = !!turnAroundTime;
    
    return hasItems && hasTransactionDate && hasTurnAroundDate && hasTurnAroundTime;
  }, [stockLockItems.length, transactionDate, turnAroundDate, turnAroundTime]);

  // Load items
  const loadItems = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current || !isMountedRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const sessionShop = sessionStorage.getItem("selectedShop");
      
      if (!selectedShop && !sessionShop) {
        router.push('/dashboard/select-shop');
        return;
      }
      
      const response = await axiosInstance.get(`/Items?LocationId=${selectedShop || sessionShop}`);
      
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
  }, [selectedShop, toast, router]);

  // Fetch stock level when item is selected
  const fetchStockLevel = useCallback(async (itemId: string) => {
    if (!itemId) return;
    
    setLoadingStockLevel(true);
    try {
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
  }, []);

  // Effects
  useEffect(() => {
    isMountedRef.current = true;
    
    const sessionShop = sessionStorage.getItem("selectedShop");
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
      fetchStockLevel(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, fetchStockLevel]);

  // Set default turn around date (7 days from now) and time
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

  // Handlers
  const addItem = useCallback(() => {
    if (!validateAddItem()) return;

    const item = items.find(i => i.id === selectedItem);
    if (!item) {
      toast.error({
        title: 'Item not found',
        description: 'The selected item no longer exists',
      });
      return;
    }

    const qty = parseFormattedNumber(quantity);
    const piecesPerUnit = item.quanityInUnit || 1;
    const totalPieces = qty * piecesPerUnit;
    
    // Check if quantity exceeds available stock
    if (stockLevel && qty > stockLevel.availableQuantity) {
      toast.warning({
        title: 'Insufficient stock',
        description: `Only ${stockLevel.availableQuantity} ${item.unitOfMeasureName || 'units'} available`,
      });
      return;
    }
    
    setStockLockItems(prevItems => {
      const existingIndex = prevItems.findIndex((i) => i.itemId === selectedItem);
      
      const newItem: StockLockDownItem = {
        itemId: selectedItem,
        quantity: qty,
        totalPieces: totalPieces,
        item: item,
        stockLevel: stockLevel || undefined
      };
      
      if (existingIndex >= 0) {
        const newItems = [...prevItems];
        newItems[existingIndex] = newItem;
        return newItems;
      } else {
        return [...prevItems, newItem];
      }
    });

    // Reset form
    setSelectedItem("");
    setQuantity("");
    setStockLevel(null);
    setErrors(prev => ({ ...prev, selectedItem: '', quantity: '' }));
    
    toast.success({
      title: 'Item added',
      description: `${item.name} (${qty} ${item.unitOfMeasureName || 'units'}) added to lock down`,
    });
  }, [selectedItem, quantity, items, stockLevel, validateAddItem, toast]);

  const removeItem = useCallback((index: number) => {
    setStockLockItems(prev => prev.filter((_, i) => i !== index));
    toast.info({
      title: 'Item removed',
      description: 'Item has been removed from lock down',
    });
  }, [toast]);

  const clearItems = useCallback(() => {
    if (stockLockItems.length === 0) return;
    
    setStockLockItems([]);
    setErrors({});
    
    toast.info({
      title: 'Cleared',
      description: 'All items have been removed from lock down',
    });
  }, [stockLockItems.length, toast]);

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
      const sessionShop = sessionStorage.getItem("selectedShop");
      const locationId = selectedShop || sessionShop || '';
      
      // Combine date and time for turnAroundTime
      const turnAroundDateTime = new Date(`${turnAroundDate}T${turnAroundTime}:00`);
      
      const payload: StockLockDownPayload = {
        locationId: locationId,
        transactionDate: new Date(transactionDate).toISOString(),
        itemIds: stockLockItems.map(item => item.itemId),
        turnAroundTime: turnAroundDateTime.toISOString()
      };

      await axiosInstance.post("/StockLockDown", payload);

      toast.success({
        title: 'Stock locked down',
        description: `Successfully locked ${stockLockItems.length} items`,
      });

      // Reload data if callback provided
      if (reloadUrl && reloadSetterFunction) {
        const reloadResponse = await axiosInstance.get(reloadUrl);
        reloadSetterFunction(reloadResponse?.data);
      }

      loadItems();

      // Reset form
      setStockLockItems([]);
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setTurnAroundDate("")
      setTurnAroundTime("00:00")
      setErrors({});
      
      if (setOpen) {
        setOpen(false);
      }

    } catch (error: any) {
      console.error("Error locking items:", error);
      
      const errorMessage = typeof(error?.response?.data) === "string" ? error?.response?.data : error?.response?.data?.message || 'Failed to lock items. Please try again.';
      
      toast.error({
        title: 'Lock down failed',
        description: errorMessage,
      });
      
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setSubmitting(false);
    }
  }, [stockLockItems, transactionDate, turnAroundDate, turnAroundTime, selectedShop, setOpen, reloadUrl, reloadSetterFunction, validateSubmit, toast]);

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

  // If no shop selected, show nothing while redirecting
  const sessionShop = sessionStorage.getItem("selectedShop");
  if (!selectedShop && !sessionShop) {
    return null;
  }

  // Render loading state
  if (loading || submitting) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md p-0">
      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          {/* Left Column - Items Selection */}
          <div className="lg:col-span-3 space-y-2">
            {/* Items Selection Card */}
            <Card className="border-border">
              <CardContent className="">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  {/* Item Selection */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="item" className="text-foreground">
                      Select Item <span className="text-destructive">*</span>
                    </Label>
                    <Select value={selectedItem} onValueChange={setSelectedItem}>
                      <SelectTrigger className={`bg-secondary border-border ${errors.selectedItem ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Code: {item.code} - UOM: {item.unitOfMeasureName || 'N/A'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.selectedItem && (
                      <p className="text-sm text-destructive mt-1">{errors.selectedItem}</p>
                    )}
                  </div>

                  <div>
                    {/* Add Button */}
                    <div className="flex items-end h-15">
                      <Button 
                        onClick={addItem}
                        disabled={!selectedItem || submitting || loadingStockLevel}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="space-y-2">
                    {/* Stock Level Display */}
                    {selectedItem && (
                      <div className="flex items-center gap-2 text-sm mt-1">
                        {loadingStockLevel ? (
                          <span className="text-muted-foreground">Checking stock...</span>
                        ) : stockLevel ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground">Available:</span>
                            <span className={`font-bold ${
                              stockLevel.availableQuantity === 0 ? 'text-destructive' :
                              stockLevel.availableQuantity < 5 ? 'text-warning' :
                              'text-success'
                            }`}>
                              {stockLevel.availableQuantity} units
                            </span>
                            {stockLevel.availableQuantity === 0 && (
                              <span className="text-destructive text-xs bg-destructive/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Out of Stock!
                              </span>
                            )}
                            {stockLevel.availableQuantity > 0 && stockLevel.availableQuantity < 5 && (
                              <span className="text-warning text-xs bg-warning/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Low Stock!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Stock info unavailable</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Lock Items Table */}
            <Card className="border-border">
              <CardHeader className="border-b border-border m-0 p-0 h-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Lock className="w-5 h-5 text-primary mr-2" />
                    <CardTitle className="text-lg font-semibold">
                      {stockLockItems.length} {stockLockItems.length === 1 ? "item" : "items"} to be locked
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-4">
                    {stockLockItems.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearItems}
                        disabled={submitting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0" style={{ height: "calc(100vh - 350px)" }}>
                {stockLockItems.length === 0 ? (
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No items in lock down</p>
                    <p className="text-sm text-muted-foreground">Add items using the form above</p>
                  </div>
                ) : (
                  <div className="overflow-auto h-full">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-green-300 text-white">
                        <tr className="border-b border-border">
                          <th className="text-left p-2 text-sm font-medium text-muted-foreground">Item</th>
                          <th className="text-center p-2 text-sm font-medium text-muted-foreground">Code</th>
                          <th className="text-center p-2 text-sm font-medium text-muted-foreground">Unit Of Measure</th>
                          <th className="text-center p-2 text-sm font-medium text-muted-foreground">Available (Pieces)</th>
                          <th className="text-center p-2 text-sm font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockLockItems.map((stockItem, index) => (
                          <tr key={`${stockItem.itemId}-${index}`} className="border-b border-border hover:bg-secondary/50">
                            <td className="text-left pl-2">
                              <div className="flex flex-col">
                                <span className="">{stockItem.item?.name || 'Unknown Item'}</span>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="text-sm">{stockItem.item?.code || 'N/A'}</span>
                            </td>
                            <td className="text-center">
                              <span className="text-sm">{`${stockItem.item?.unitOfMeasureName}`} <i className="text-xs">{ (stockItem?.item?.quanityInUnit || 0) > 1 ? `(${stockItem.item?.quanityInUnit} pieces)` : `(${stockItem.item?.quanityInUnit} piece)`}</i></span> 
                            </td>
                            <td className="text-center">
                              <span className={`text-sm font-medium ${(stockItem.stockLevel?.availableQuantity || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stockItem.stockLevel?.availableQuantity || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                disabled={submitting}
                                aria-label={`Remove ${stockItem.item?.name} from lock down`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stock Lock Details */}
          <div className="space-y-2">
            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                {/* Transaction Date */}
                <div className="space-y-2">
                  <Label htmlFor="transactionDate" className="text-foreground">
                    Transaction Date <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="transactionDate"
                      readOnly={true}
                      value={alphaNumericDate(transactionDate)}
                      onClick={() => dateRef.current?.showPicker()}
                      className={`pl-10 bg-secondary border-border ${errors.transactionDate ? 'border-destructive' : ''}`}
                      aria-invalid={!!errors.transactionDate}
                    />
                    <Input
                      ref={dateRef}
                      style={{ height: "0px", width: "0px", padding: "0px", margin: "0px", position: "absolute" }}
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      aria-label="Select transaction date"
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
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative col-span-2">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="turnAroundDate"
                        readOnly={true}
                        value={alphaNumericDate(turnAroundDate)}
                        onClick={() => turnAroundRef.current?.showPicker()}
                        className={`pl-10 bg-secondary border-border ${errors.turnAroundDate ? 'border-destructive' : ''}`}
                        aria-invalid={!!errors.turnAroundDate}
                      />
                      <Input
                        ref={turnAroundRef}
                        style={{ height: "0px", width: "0px", padding: "0px", margin: "0px", position: "absolute" }}
                        type="date"
                        value={turnAroundDate}
                        onChange={(e) => setTurnAroundDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        aria-label="Select turn around date"
                      />
                    </div>
                    
                    {/* Time Input */}
                    <div className="relative">
                      <Input
                        id="turnAroundTime"
                        type="time"
                        value={turnAroundTime}
                        onChange={(e) => setTurnAroundTime(e.target.value)}
                        className={`bg-secondary border-border ${errors.turnAroundTime ? 'border-destructive' : ''}`}
                        aria-invalid={!!errors.turnAroundTime}
                        step="900" // 15-minute intervals
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
                      <span className="text-muted-foreground">Total UOM Quantity</span>
                      <span className="font-medium">{formatNumberWithCommas(totalQuantity.toString())}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Pieces</span>
                      <span className="font-medium text-primary">{formatNumberWithCommas(totalPieces.toString())}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transaction Date</span>
                      <span className="font-medium">{alphaNumericDate(transactionDate)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Turn Around</span>
                      <span className="font-medium">
                        {alphaNumericDate(turnAroundDate)} at {turnAroundTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white"
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
                    {submitting ? 'Submitting...' : 'Lock Items'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
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
      </div>
    </div>
  );
}