"use client";

import { useState, useEffect, useRef, SetStateAction, Dispatch, useCallback, useMemo, memo } from "react";
import { Header } from '@/components/dashboard/header';
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
  AlertCircle,
  Ticket,
  Loader2,
  CheckCircle
} from 'lucide-react';
import type { Item, Supplier, Transaction, IdAndName, ItemStockLevelDTO , CouponResponse} from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { formatNumberWithCommas, removeCommasFromNumbers, alphaNumericDate, toastErrors } from "@/helpers/formatStrings";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import POSReceipt, {POSReceiptProps} from "./POSReceipt";
import StockLevelUi from "./StockLevelUi";

// Types
interface TransactionUI {
  setOpen: (isOpen: boolean) => void;
  reloadUrl?: string;
  reloadSetterFunction?: Dispatch<SetStateAction<Transaction[]>>;
  submitUrl?: string;
  instantSale: boolean;
}

interface CartItem {
  item: Item;
  quantity: number;
  price: number;
  deliveredQty?: number;
}

// Constants
const paymentMethods: IdAndName[] = [
  { name: "Mobile Money", id: 1 },
  { name: "Cash", id: 2 },
  { name: "Cheque", id: 3 },
  { name: "Bank Transfer", id: 4 },
  { name: "Other", id: 5 }
];

// Helper functions - memoized for performance
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

// Memoized Cart Item Component
const CartTableRow = memo(({ 
  cartItem, 
  index, 
  onRemove, 
  disabled 
}: { 
  cartItem: CartItem; 
  index: number; 
  onRemove: (index: number) => void; 
  disabled: boolean;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
      <td className="p-2">
        <div className="flex flex-col" style={{textAlign:"left"}}>
          <span className="font-medium">{cartItem.item.name}</span>
          <span className="text-xs text-muted-foreground">{cartItem.item.code}</span>
        </div>
      </td>
      <td className="text-center p-2">{formatNumberWithCommas(cartItem.quantity.toString())}</td>
      <td className="text-right p-2">{formatCurrency(cartItem.price)}</td>
      <td className="text-right p-2 font-medium">{formatCurrency(cartItem.quantity * cartItem.price)}</td>
      <td className="text-center p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={disabled}
          aria-label={`Remove ${cartItem.item.name} from cart`}
          className="hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
});

CartTableRow.displayName = 'CartTableRow';

// Memoized Item Select Option
const ItemSelectOption = memo(({ item }: { item: Item }) => (
  <div className="flex flex-col">
    <span>{item.name}</span>
    <span className="text-xs text-muted-foreground">
      Price: {formatCurrency(item.sellingPrice)}
    </span>
  </div>
));

ItemSelectOption.displayName = 'ItemSelectOption';

// Custom hook for cart management with performance optimization
const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const addItem = useCallback((item: Item, quantity: number, price: number) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex((c) => c.item.id === item.id);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: quantity,
          price: price
        };
        return newCart;
      } else {
        return [...prevCart, { 
          item, 
          quantity, 
          price,
          deliveredQty: 0
        }];
      }
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const total = useMemo(() => 
    cart.reduce((sum, c) => sum + c.quantity * c.price, 0),
    [cart]
  );

  const itemCount = useMemo(() => cart.length, [cart]);

  return { cart, setCart, addItem, removeItem, clearCart, total, itemCount };
};

// Custom hook for stock checking with debouncing
const useStockCheck = (selectedShop: string, toast: any) => {
  const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, []);

  const checkStock = useCallback(async (itemId: string) => {
    // Clear previous state if no item
    if (!itemId) {
      setStockLevel(null);
      return;
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
    }

    // Debounce the stock check
    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setCheckingStock(true);
      try {
        const sessionShop = sessionStorage.getItem("selectedShop");
        const locationId = selectedShop || sessionShop;
        
        if (!locationId) {
          console.warn('No location ID available for stock check');
          if (isMountedRef.current) {
            setCheckingStock(false);
          }
          return;
        }

        const response = await axiosInstance.get(`/Items/Stock-Level/${itemId}?locationId=${locationId}`, {
          signal: abortControllerRef.current?.signal
        });
        
        if (isMountedRef.current && response?.data) {
          setStockLevel(response.data);
          
          // Only show warnings if we have data and component is mounted
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
        // Ignore abort errors
        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
          console.log('Stock check cancelled');
          return;
        }
        
        console.error('Error checking stock level:', error);
        if (isMountedRef.current) {
          // Set stock level to 0 on error to prevent adding to cart
          setStockLevel({
            name: '',
            code: '',
            reorderLevel: 0,
            availableQuantity: 0,
            actualQuantity: 0
          });
          // Only show toast if there's an actual error (not abort)
          if (error?.response) {
            toastErrors(toast, error);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setCheckingStock(false);
        }
      }
    }, 300); // 300ms debounce

  }, [selectedShop, toast]);

  return { stockLevel, checkingStock, checkStock, setStockLevel };
};

export default function SaleTransactionUI(prop: TransactionUI) {
  const { toast } = useToast();
  const { user, selectedShop, company } = useAuth();
  const router = useRouter();
  
  // State - ALL hooks must be declared before any conditional returns
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBusinessPartner, setBusinessPartner] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponResponse | null>(null);
  const [couponAmount, setCouponAmount] = useState(0);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [receiptData, setReceiptData] = useState<POSReceiptProps | null>(null);
  
  // Refs - ALL hooks must be declared before any conditional returns
  const printContentRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasLoadedDataRef = useRef(false);

  // Custom hooks - Must be called before any conditional returns
  const { cart, setCart, addItem, removeItem, clearCart, total: cartTotal, itemCount } = useCart();
  const { stockLevel, checkingStock, checkStock, setStockLevel } = useStockCheck(selectedShop || '', toast);

  // Memoized values - ALL useMemo/useCallback must be before any conditional returns
  const locationId = useMemo(() => {
    return selectedShop || sessionStorage.getItem("selectedShop") || "";
  }, [selectedShop]);

  const totalWithCoupon = useMemo(() => {
    return cartTotal - couponAmount;
  }, [cartTotal, couponAmount]);

  const balance = useMemo(() => {
    const paid = parseFormattedNumber(amountPaid);
    return totalWithCoupon - paid;
  }, [totalWithCoupon, amountPaid]);

  const isFormValid = useMemo(() => {
    const hasItems = cart.length > 0;
    const hasAmount = parseFormattedNumber(amountPaid) > 0;
    const hasPaymentMethod = !!selectedPaymentMethod;
    const hasCustomer = prop?.instantSale || !!selectedBusinessPartner;
    const hasDate = !!date;
    
    return hasItems && hasAmount && hasPaymentMethod && hasCustomer && hasDate;
  }, [cart.length, amountPaid, selectedPaymentMethod, selectedBusinessPartner, date, prop?.instantSale]);

  // Memoized item options for performance
  const itemOptions = useMemo(() => {
    return items.map((item) => (
      <SelectItem key={item.id} value={item.id}>
        <ItemSelectOption item={item} />
      </SelectItem>
    ));
  }, [items]);

  // Memoized customer options
  const customerOptions = useMemo(() => {
    return customers.map((customer) => (
      <SelectItem key={customer.id} value={customer.id}>
        <div className="flex flex-col">
          <span>{`${customer.firstName} ${customer.lastName}`}</span>
          <span className="text-xs text-muted-foreground">{customer.phone}</span>
        </div>
      </SelectItem>
    ));
  }, [customers]);

  // Memoized payment method options
  const paymentMethodOptions = useMemo(() => {
    return paymentMethods.map(method => (
      <SelectItem key={method.id} value={method.id.toString()}>
        {method.name}
      </SelectItem>
    ));
  }, []);

  // Enhanced validation for AddToCart
  const validateAddToCart = useCallback((): { isValid: boolean; error?: string } => {
    // Check if item is selected
    if (!selectedItem) {
      return { isValid: false, error: 'Please select an item' };
    }

    // Check if quantity is entered
    if (!quantity) {
      return { isValid: false, error: 'Please enter quantity' };
    }

    // Parse and validate quantity
    const qty = parseFormattedNumber(quantity);
    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, error: 'Quantity must be a positive number' };
    }

    // Check if quantity is an integer
    if (!Number.isInteger(qty)) {
      return { isValid: false, error: 'Quantity must be a whole number' };
    }

    // Find the selected item
    const item = items.find(i => i.id === selectedItem);
    if (!item) {
      return { isValid: false, error: 'Selected item no longer exists in inventory' };
    }

    // Check stock availability
    const availableQty = stockLevel?.availableQuantity ?? item.quanityInUnit ?? 0;
    if (qty > availableQty) {
      return { isValid: false, error: `Only ${availableQty} ${item.unitOfMeasure || 'unit(s)'} available in stock` };
    }

    // Check if price is valid
    const price = unitPrice ? parseFormattedNumber(unitPrice) : item.sellingPrice;
    if (!price || price <= 0) {
      return { isValid: false, error: 'Invalid price value' };
    }

    if (price < item.sellingPrice) {
      return { isValid: false, error: `Selling price cannot be less than cost price (${formatCurrency(item.sellingPrice)})` };
    }

    // Check for duplicate with different price
    const existingItem = cart.find(c => c.item.id === selectedItem);
    if (existingItem && existingItem.price !== price) {
      return { 
        isValid: false, 
        error: `Item already in cart with different price (${formatCurrency(existingItem.price)}). Please remove and re-add.` 
      };
    }

    // Check if total quantity in cart exceeds available stock (for existing items)
    if (existingItem) {
      const totalQuantityInCart = existingItem.quantity + qty;
      if (totalQuantityInCart > availableQty) {
        return { 
          isValid: false, 
          error: `Total quantity (${totalQuantityInCart}) exceeds available stock (${availableQty})` 
        };
      }
    }

    return { isValid: true };
  }, [selectedItem, quantity, unitPrice, items, stockLevel, cart]);

  // Optimized add to cart handler
  const handleAddToCart = useCallback(() => {
    const validation = validateAddToCart();
    
    if (!validation.isValid) {
      console.log("hererer")
      toast.warning({
        description: validation.error
      })
      //toastErrors(toast, validation.error || 'Invalid input', '', false);
      return;
    }

    const item = items.find(i => i.id === selectedItem);
    if (!item) return;

    const qty = parseFormattedNumber(quantity);
    const price = unitPrice ? parseFormattedNumber(unitPrice) : item.sellingPrice;

    // Add to cart using the custom hook
    addItem(item, qty, price);

    // Reset form fields
    setSelectedItem("");
    setQuantity("");
    setUnitPrice("");
    setStockLevel(null);
    setErrors(prev => ({ ...prev, selectedItem: '', quantity: '', unitPrice: '' }));
    
    toast.success({
      title: 'Item Added',
      description: `${item.name} (${qty} ${item.unitOfMeasure || 'units'}) added to cart`,
    });
  }, [selectedItem, quantity, unitPrice, items, validateAddToCart, addItem, setStockLevel, toast]);

  // Function to validate coupon
  const validateCoupon = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCouponData(null);
      setCouponAmount(0);
      setCouponError("");
      return;
    }

    // Check for invalid characters
    if (code.includes('/') || code.includes('\\')) {
      setCouponError("Coupon code cannot contain '/' or '\\' characters");
      setCouponData(null);
      setCouponAmount(0);
      toast.error({
        title: 'Invalid Coupon',
        description: 'Coupon code cannot contain "/" or "\\" characters',
      });
      return;
    }

    if (!locationId) {
      setCouponError("No shop selected");
      return;
    }

    setIsCheckingCoupon(true);
    setCouponError("");

    try {
      const response = await axiosInstance.get(`/Coupon/${code}?locationId=${locationId}`);
      
      if (response?.data) {
        const coupon: CouponResponse = response.data;
        
        // Check if coupon is used
        if (coupon.used) {
          setCouponError("This coupon has already been used");
          setCouponData(null);
          setCouponAmount(0);
          toast.error({
            title: 'Coupon Already Used',
            description: 'This coupon has already been redeemed',
          });
          return;
        }

        // Check if coupon is expired
        if (coupon.expiryDate) {
          const expiryDate = new Date(coupon.expiryDate);
          const today = new Date();
          
          if (expiryDate < today) {
            setCouponError("This coupon has expired");
            setCouponData(null);
            setCouponAmount(0);
            toast.error({
              title: 'Coupon Expired',
              description: `This coupon expired on ${new Date(coupon.expiryDate).toLocaleDateString()}`,
            });
            return;
          }
        }

        // Coupon is valid
        setCouponData(coupon);
        setCouponAmount(coupon.amount);
        setCouponError("");
        toast.success({
          title: 'Coupon Applied',
          description: `Coupon worth ${formatCurrency(coupon.amount)} applied successfully!`,
        });
      }
    } catch (error: any) {
      console.error("Error validating coupon:", error);
      setCouponData(null);
      setCouponAmount(0);
      
      const errorMessage = error?.response?.data?.message || 'Invalid coupon code';
      setCouponError(errorMessage);
      
      toast.error({
        title: 'Invalid Coupon',
        description: errorMessage,
      });
    } finally {
      setIsCheckingCoupon(false);
    }
  }, [locationId, toast]);

  // Load data - FIXED: No abort controller to prevent cancellations
  const loadData = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current || !isMountedRef.current) return;
    
    // Don't reload if we already have data
    if (hasLoadedDataRef.current && items.length > 0 && customers.length > 0) {
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const sessionShop = sessionStorage.getItem("selectedShop");
      
      if (!selectedShop && !sessionShop) {
        router.push('/dashboard/select-shop');
        return;
      }
      
      const locationId = selectedShop || sessionShop;
      
      const [itemsResponse, customersResponse] = await Promise.all([
        axiosInstance.get(`/Items?locationId=${locationId}`),
        axiosInstance.get(`/customers?companyId=${user.companyId || user}&locationId=${locationId}`)
      ]);
      
      if (isMountedRef.current) {
        setCustomers(customersResponse?.data || []);
        setItems(itemsResponse?.data || []);
        hasLoadedDataRef.current = true;
        setErrors(prev => ({ ...prev, loadData: '' }));
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      
      if (isMountedRef.current) {
        const errorMessage = error?.response?.data?.message || 'Failed to load data. Please refresh the page.';
        setErrors(prev => ({ ...prev, loadData: errorMessage }));
        
        toast.error({
          title: 'Failed to load data',
          description: errorMessage,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [user, selectedShop, router, toast, items.length, customers.length]);

  // Effects - ALL useEffect must be before any conditional returns
  useEffect(() => {
    isMountedRef.current = true;
    
    const sessionShop = sessionStorage.getItem("selectedShop");
    if (!selectedShop && !sessionShop) {
      router.push('/dashboard/select-shop');
      return;
    }
    
    // Load data only once on mount
    loadData();
    
    // Restore cart from session storage
    const savedCart = sessionStorage.getItem('saleCart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      } catch (e) {
        console.error('Failed to restore cart:', e);
      }
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData, selectedShop, router, setCart]);

  // Auto-set unit price when item is selected
  useEffect(() => {
    if (selectedItem) {
      const item = items.find(i => i.id === selectedItem);
      if (item) {
        setUnitPrice(item.sellingPrice.toString());
        setErrors(prev => ({ ...prev, unitPrice: '' }));
      }
    } else {
      setUnitPrice("");
    }
  }, [selectedItem, items]);

  // Check stock level when item is selected - using debounced hook
  useEffect(() => {
    if (selectedItem) {
      checkStock(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, checkStock, setStockLevel]);

  // Save cart to session storage with debouncing
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (cart.length > 0) {
        sessionStorage.setItem('saleCart', JSON.stringify(cart));
      } else {
        sessionStorage.removeItem('saleCart');
      }
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [cart]);

  // Reset coupon when cart changes
  useEffect(() => {
    if (cart.length === 0) {
      setCouponCode("");
      setCouponData(null);
      setCouponAmount(0);
      setCouponError("");
    }
  }, [cart.length]);

  useEffect(() => {
    if (!receiptData) {
      resetForm();
    }
  }, [receiptData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callbacks - ALL useCallback must be before any conditional returns
  const handleRemoveFromCart = useCallback((index: number) => {
    removeItem(index);
    toast.info({
      title: 'Item Removed',
      description: 'Item has been removed from cart',
    });
  }, [removeItem, toast]);

  const handleClearCart = useCallback(() => {
    if (cart.length === 0) return;
    
    clearCart();
    setAmountPaid("");
    setSelectedPaymentMethod("");
    setBusinessPartner("");
    setCouponCode("");
    setCouponData(null);
    setCouponAmount(0);
    setCouponError("");
    setErrors({});
    
    toast.info({
      title: 'Cart Cleared',
      description: 'All items have been removed from cart',
    });
  }, [cart.length, clearCart, toast]);

  const validateSubmit = useCallback((): boolean => {
    if (cart.length === 0) {
      toastErrors(toast, 'Please add at least one item to the cart', "", false);
      return false;
    }
    
    if (!prop?.instantSale && !selectedBusinessPartner) {
      toastErrors(toast, 'Please select a customer', "", false);
      return false;
    }
    
    const paid = parseFormattedNumber(amountPaid);
    if (!amountPaid || paid <= 0) {
      toastErrors(toast, 'Please enter a valid amount', "", false);
      return false;
    }
    
    if (paid < totalWithCoupon) {
      toastErrors(toast, `Amount paid (${formatCurrency(paid)}) cannot be less than total (${formatCurrency(totalWithCoupon)})`, "", false);
      return false;
    }
    
    if (!selectedPaymentMethod) {
      toastErrors(toast, 'Please select a payment method', "", false);
      return false;
    }
    
    if (!date) {
      toastErrors(toast, 'Please select a date', "", false);
      return false;
    }
    
    return true;
  }, [cart, totalWithCoupon, amountPaid, selectedPaymentMethod, selectedBusinessPartner, date, prop?.instantSale, toast]);

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
      const paidAmount = parseFormattedNumber(amountPaid);
      
      const saleItems = cart.map((c) => ({
        itemId: c.item.id,
        quantity: c.quantity,
        unitPrice: c.price,
        deliveredQuantity: c.quantity || 0
      }));

      const postData = {
        locationId: locationId,
        businessPartnerId: selectedBusinessPartner || null,
        transactionResultsType: 2,
        date: new Date(date).toISOString(),
        totalAmount: cartTotal,
        taxAmount: 0,
        discountAmount: couponAmount,
        amountPaid: paidAmount,
        paymentMethod: Number(selectedPaymentMethod),
        items: saleItems,
        transactionCode: "",
        couponCode: couponData?.code || "",
        currencyCode: "GHS",
        transactionType: 1,
        remarks: `Paid: ${formatCurrency(paidAmount)}${couponData ? `, Coupon: ${couponData.code} (${formatCurrency(couponAmount)})` : ''}`
      };

      const response = await axiosInstance.post('/Sales/General', postData);

      setReceiptData({
        qrCode: response?.data?.qrCode, 
        transactionNumber: response?.data?.transactionNumber, 
        amount: cartTotal, 
        showQRCode: true 
      });

      toast.success({
        title: 'Transaction Completed',
        description: `Submitted Successfully`,
      });

      clearCart();
      setAmountPaid("");
      setSelectedPaymentMethod("");
      setBusinessPartner("");
      setCouponCode("");
      setCouponData(null);
      setCouponAmount(0);
      setCouponError("");
      setErrors({});
      sessionStorage.removeItem('saleCart');

      if (prop?.reloadUrl && prop?.reloadSetterFunction) {
        const reloadResponse = await axiosInstance.get(prop.reloadUrl);
        prop.reloadSetterFunction(reloadResponse?.data);
      }

      if (!prop?.instantSale) {
        setTimeout(() => {
          prop.setOpen(false);
        }, 2000);
      }

    } catch (error: any) {
      toastErrors(toast, error, "", false);
      console.error("Error completing purchase:", error);
    } finally {
      setSubmitting(false);
    }
  }, [cart, cartTotal, amountPaid, selectedPaymentMethod, selectedBusinessPartner, date, selectedShop, couponData, couponAmount, prop, validateSubmit, clearCart, toast]);

  const resetForm = useCallback(() => {
    clearCart();
    setSelectedPaymentMethod("");
    setBusinessPartner("");
    setAmountPaid("");
    setDate(new Date().toISOString().split('T')[0]);
    setQuantity("");
    setUnitPrice("");
    setStockLevel(null);
    setCouponCode("");
    setCouponData(null);
    setCouponAmount(0);
    setCouponError("");
    setErrors({});
    sessionStorage.removeItem('saleCart');
  }, [clearCart]);

  // ============================================================
  // CONDITIONAL RETURNS GO HERE - AFTER ALL HOOKS ARE DECLARED
  // ============================================================
  
  // If no shop selected, show nothing while redirecting
  const sessionShop = sessionStorage.getItem("selectedShop");
  if (!selectedShop && !sessionShop) {
    return null;
  }

  // Render loading state
  if (loading || submitting) {
    return <Loading />;
  }

  // Main render - ALL inputs have autoComplete="off"
  return (
    <div className="bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md p-2 pt-0">
      {!prop?.instantSale && (
        <div className="flex justify-end p-4">
          <Button 
            className="w-30 bg-red-700 hover:bg-red-500" 
            onClick={() => prop.setOpen(false)}
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </div>
      )}
      
      <div className="p-0">
        <StockLevelUi 
          checkingStock={checkingStock}
          selectedItem={selectedItem}
          stockLevel={stockLevel}
          className="flex justify-start"
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          {/* Left Column - Items Selection and Cart */}
          <div className="lg:col-span-3 space-y-2">
            {/* Items Selection Card */}
            <Card className="border-border">
              <CardContent className="">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  {/* Item Selection */}
                  <div className="space-y-2 md:col-span-4 w-full">
                    <Label htmlFor="item" className="text-foreground">
                      Select Item <span className="text-destructive">*</span>
                    </Label>
                    <Select value={selectedItem} onValueChange={setSelectedItem}>
                      <SelectTrigger className={`w-full bg-secondary border-border ${errors.selectedItem ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemOptions}
                      </SelectContent>
                    </Select>
                    {errors.selectedItem && (
                      <p className="text-sm text-destructive mt-1">{errors.selectedItem}</p>
                    )}
                  </div>

                  <div className="flex justify-start space-x-2 lg:justify-between w-full md:col-span-2">
                    {/* Quantity Input */}
                    <div className="space-y-2 w-30">
                      <Label htmlFor="quantity" className="text-foreground">
                        Quantity <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="quantity"
                        autoComplete="off"
                        value={formatNumberWithCommas(quantity)}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Qty"
                        className={`bg-secondary border-border text-right ${errors.quantity ? 'border-destructive' : ''}`}
                        aria-invalid={!!errors.quantity}
                        disabled={!selectedItem || (stockLevel?.availableQuantity === 0)}
                      />
                      
                      {stockLevel?.availableQuantity === 0 && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          This item is out of stock
                        </p>
                      )}
                    </div>

                    {/* Unit Price Input - Readonly with highlight */}
                    <div className="space-y-2 w-30">
                      <Label htmlFor="unitPrice" className="text-foreground">Price (GHC)</Label>
                      <Input
                        id="unitPrice"
                        autoComplete="off"
                        value={formatNumberWithCommas(unitPrice)}
                        readOnly
                        className="bg-primary/10 border-primary/30 text-primary font-bold text-right cursor-not-allowed"
                        placeholder="Select an item to see price"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-end h-15">
                  <Button 
                    onClick={handleAddToCart}
                    disabled={!selectedItem || !quantity || submitting || stockLevel?.availableQuantity === 0}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cart Table */}
            <Card className="border-border m-0">
              <CardHeader className="border-b border-border h-10" style={{marginTop:"-10px"}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingCart className="w-5 h-5 text-primary mr-2" />
                    <CardTitle className="text-lg font-semibold">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </CardTitle>
                  </div>
                  {cart.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearCart}
                      disabled={submitting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 m-0 -mt-4" style={{ height: "calc(100vh - 368px)" }}>
                {cart.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No items in purchase order</p>
                    <p className="text-sm text-muted-foreground">Add items using the form above</p>
                  </div>
                ) : (
                  <div className="overflow-auto" style={{ marginTop:"-10px"}}>
                    <table className="w-full">
                      <thead className="sticky top-0 bg-secondary">
                        <tr className="border-b border-border">
                          <th className="text-left p-2 text-sm font-medium text-muted-foreground">Item</th>
                          <th className="text-center p-2 text-sm font-medium text-muted-foreground">Qty</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Price</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Total</th>
                          <th className="text-center p-2 text-sm font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((cartItem, index) => (
                          <CartTableRow
                            key={`${cartItem.item.id}-${index}`}
                            cartItem={cartItem}
                            index={index}
                            onRemove={handleRemoveFromCart}
                            disabled={submitting}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Checkout */}
          <div className="space-y-2" style={{height:"Calc(100vh - 105px)"}}>
            <Card className="border-border h-full">
              <CardContent className="p-4 space-y-4">
                {/* Customer Selection */}
                {!prop?.instantSale && (
                  <div className="space-y-2">
                    <Label className="text-foreground">
                      Select Customer <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={selectedBusinessPartner} 
                      onValueChange={setBusinessPartner}
                    >
                      <SelectTrigger className={`bg-secondary border-border ${errors.customer ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customerOptions}
                      </SelectContent>
                    </Select>
                    {errors.customer && (
                      <p className="text-sm text-destructive mt-1">{errors.customer}</p>
                    )}
                  </div>
                )}

                {/* Amount Paid */}
                <div className="space-y-2">
                  <Label htmlFor="amountPaid" className="text-foreground">
                    Amount Paid <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amountPaid"
                    autoComplete="off"
                    value={formatNumberWithCommas(amountPaid)}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className={`bg-secondary border-border text-right ${errors.amountPaid ? 'border-destructive' : ''}`}
                    aria-invalid={!!errors.amountPaid}
                    disabled={submitting}
                  />
                  {errors.amountPaid && (
                    <p className="text-sm text-destructive mt-1">{errors.amountPaid}</p>
                  )}
                </div>

                {/* Coupon Input */}
                <div className="space-y-2">
                  <Label htmlFor="coupon" className="text-foreground flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Coupon Code
                  </Label>
                  <div className="relative">
                    <Input
                      id="coupon"
                      autoComplete="off"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          validateCoupon(e.target.value.trim());
                        }
                      }}
                      placeholder="Enter coupon code"
                      className={`bg-secondary border-border uppercase ${couponError ? 'border-destructive' : couponData ? 'border-green-500' : ''}`}
                      disabled={submitting || cart.length === 0}
                    />
                    {isCheckingCoupon && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {couponData && !couponError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  {couponError && (
                    <p className="text-sm text-destructive mt-1">{couponError}</p>
                  )}
                  {couponData && !couponError && (
                    <p className="text-sm text-green-600 mt-1">
                      Coupon applied: {formatCurrency(couponData.amount)} discount
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-foreground">
                    Payment Method <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={selectedPaymentMethod} 
                    onValueChange={setSelectedPaymentMethod}
                  >
                    <SelectTrigger className={`w-full bg-secondary border-border ${errors.paymentMethod ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions}
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && (
                    <p className="text-sm text-destructive mt-1">{errors.paymentMethod}</p>
                  )}
                </div>

                <hr className="my-2" />

                {/* Summary */}
                <div className="space-y-2">
                  <div className="bg-secondary rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    
                    {couponData && !couponError && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="text-muted-foreground">Discount</span>
                        <span>-{formatCurrency(couponAmount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span>{amountPaid ? formatCurrency(parseFormattedNumber(amountPaid)) : formatCurrency(0)}</span>
                    </div>
                    
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between text-md font-bold">
                        <span>Balance:</span>
                        <span className={balance > 0 ? 'text-destructive' : 'text-green-600'}>
                          {formatCurrency(Math.abs(balance))} {balance > 0 ? '(Due)' : '(Change)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSubmit}
                    disabled={!isFormValid || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4 mr-2" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                    onClick={handleClearCart}
                    disabled={cart.length === 0 || submitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Cart
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

      {receiptData && (
        <div className="absolute top-0 left-0 right-0 min-h-screen bg-gray-100 p-4 flex justify-center">
          <POSReceipt
            data={receiptData}
            setData={setReceiptData}
          />
        </div>
      )}
    </div>
  );
}