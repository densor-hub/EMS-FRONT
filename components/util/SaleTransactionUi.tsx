"use client";

import { useState, useEffect, useRef, SetStateAction, Dispatch, useCallback, useMemo, memo, Component, ErrorInfo, ReactNode } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CheckoutCard from "./CheckoutCard";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X,
  AlertCircle
} from 'lucide-react';
import type { Item, Supplier, Transaction, IdAndName, ItemStockLevelDTO , CouponResponse} from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { currency, formatNumberWithCommas, removeCommasFromNumbers, toastErrors, toastSuccess } from "@/helpers/formatStrings";
import { useRouter } from 'next/navigation';
import POSReceipt, {POSReceiptProps} from "./POSReceipt";
import ItemSelection from "./ItemSelection";
import { CartItem } from "@/lib/types";
import ReusableCart, {CartColumn} from "./SaleCart";
import { config } from "./AppConfig";
import { useToaster } from "./CustomToast";
import { it } from "node:test";

// Types
interface TransactionUI {
  setOpen: (isOpen: boolean) => void;
  reloadUrl?: string;
  reloadSetterFunction?: Dispatch<SetStateAction<Transaction[]>>;
  submitUrl?: string;
  instantSale: boolean;
  businessPartnerLable? : string;
  transactionActionType? : string;
  businessPartnerValue?: string;
  businessPartnerName?: string;
}

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SaleTransactionUI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Constants
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

// Custom hook for cart mana// Custom hook for cart management
const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const addItem = useCallback((item: Item, quantity: number, remainingQuantity?: number, price?: number | null) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex((c) => c.id === item.id);
      
      // ✅ FIX: Use the passed price, or fallback to selling price
      // If price is explicitly passed (including 0), use it
      // Otherwise use the item's selling price
      const itemPrice = (price !== undefined && price !== null) 
        ? price 
        : item.sellingPrice;
      
      if (existingIndex >= 0) {
        // Update existing item
        const newCart = [...prevCart];
        const currentReceivingQty = newCart[existingIndex].receivingQuantity || 0;
        const newReceivingQty = currentReceivingQty + quantity;
        
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          price: itemPrice,
          quantity: newReceivingQty,
          receivingQuantity: newReceivingQty,
          remainingQuantity: remainingQuantity && remainingQuantity > 0 
            ? (remainingQuantity || 0) - newReceivingQty 
            : 0,
        };
        return newCart;
      } else {
        // Create new cart item
        const newCartItem: CartItem = {
          id: item.id,
          name: item.name || 'Unknown Item',
          code: item.code || '',
          price: itemPrice,
          quantity: quantity || 0,
          deliveredQuantity: 0,
          receivingQuantity: quantity,
          remainingQuantity: remainingQuantity && remainingQuantity > 0 
            ? (remainingQuantity || 0) - quantity 
            : 0,
        };
        return [...prevCart, newCartItem];
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
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const checkStock = useCallback(async (itemId: string) => {
    if (!itemId) {
      setStockLevel(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
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
        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
          console.log('Stock check cancelled');
          return;
        }
        
     //   console.error('Error checking stock level:', error);
        if (isMountedRef.current) {
          setStockLevel({
            name: '',
            code: '',
            reorderLevel: 0,
            availableQuantity: 0,
            actualQuantity: 0
          });
          if (error?.response) {
            toastErrors(toast, error);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setCheckingStock(false);
        }
      }
    }, 300);

  }, [selectedShop]);

  return { stockLevel, checkingStock, checkStock, setStockLevel };
};

const columns: CartColumn<CartItem>[] = [
  {
    key: 'name',
    header: 'Item',
    align: 'left',
    width: '40%',
  },
  {
    key: 'quantity',
    header: 'Qty',
    align: 'center',
    width: '15%',
    render: (item) => `${formatNumberWithCommas(item.quantity?.toString())}`,
  },
  {
    key: 'price',
    header: `Price (${config.currency?.toUpperCase()})`,
    align: 'right',
    width: '20%',
    render: (item) => `${currency(item.price.toFixed(2)?.toString())}`,
  },
  {
    key: 'total',
    header: `Total (${config.currency?.toUpperCase()})`,
    align: 'right',
    width: '25%',
    render: (item) => `${currency((item.quantity * item.price).toFixed(2).toString())}`,
  },
];

function SaleTransactionUIComponent(prop: TransactionUI) {
  const toast  = useToaster();
  const { user, selectedShop, company } = useAuth();
  const router = useRouter();
  
  // State
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBusinessPartner, setBusinessPartner] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
   const [price, setPrice] = useState("");
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
  
  // Refs
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasLoadedDataRef = useRef(false);

  const isPurchase = prop.transactionActionType?.toUpperCase().trim() === "PURCHASE";
  const isSale = prop.transactionActionType?.toUpperCase().trim() === "SALE";
  const isStock = prop.transactionActionType?.toUpperCase().trim() === "STOCK";
  const isTrans = prop.transactionActionType?.toUpperCase().trim() === "TRANS";

  // Custom hooks
  const { cart, setCart, addItem, removeItem, clearCart, total: cartTotal } = useCart();
  const { stockLevel, checkingStock, checkStock, setStockLevel } = useStockCheck(selectedShop || '', toast);

  // Set business partner from props if provided
  useEffect(() => {
    if (prop?.businessPartnerValue && !selectedBusinessPartner) {
      setBusinessPartner(prop.businessPartnerValue);
    }
  }, [prop?.businessPartnerValue, selectedBusinessPartner]);

  // Memoized values
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

  const isBusinessPartnerValid = useMemo(() => {
   return  (prop?.instantSale) || (!!prop?.businessPartnerValue && !!prop?.businessPartnerName)
  }, [prop?.instantSale, prop?.businessPartnerValue, prop?.businessPartnerName])
  

  // console.log( (prop?.instantSale && !!selectedPaymentMethod) || isTrans || (!!prop?.businessPartnerValue && !!prop?.businessPartnerName && !!selectedPaymentMethod) )
  const isCheckOutValid = useMemo(() => {
    const hasItems = cart.length > 0;

    const hasAmount = (prop.instantSale && amountPaid && balance <=0) ||
                      ((!!prop?.businessPartnerValue && !!prop?.businessPartnerName) && ((isSale && Number(removeCommasFromNumbers(amountPaid)) >= 0) || (isPurchase || isStock || isTrans)))
    
    const hasPaymentMethod =  (prop?.instantSale && !!selectedPaymentMethod) || isTrans || (!!prop?.businessPartnerValue && !!prop?.businessPartnerName && !!selectedPaymentMethod) 

    const hasDate = !!date;

   
    return hasItems && hasAmount && hasPaymentMethod && isBusinessPartnerValid && hasDate;
  }, [cart.length, prop.instantSale , balance, prop?.businessPartnerValue , prop?.businessPartnerName, amountPaid, isBusinessPartnerValid, selectedPaymentMethod,  date]);


 // Add item to cart - this is called by ItemSelection
const handleAddItem = useCallback(() => {
  if (!selectedItem || !quantity) {
    toast.warning({
      title: 'Missing Information',
      description: 'Please select an item and enter quantity',
    });
    return;
  }
  
  const item = items.find(i => i.id === selectedItem);
  if (!item) {
    toast.error({
      title: 'Item Not Found',
      description: 'Selected item no longer available',
    });
    return;
  }

  const qty = parseFloat(removeCommasFromNumbers(quantity)?.toString());
  if (isNaN(qty) || qty <= 0) {
    toast.warning({
      title: 'Invalid Quantity',
      description: 'Please enter a valid quantity',
    });
    return;
  }

  // Check stock availability for sales only
  if (!isPurchase && !isStock && !isTrans && stockLevel && stockLevel.availableQuantity < qty) {
    toast.warning({
      title: 'Insufficient Stock',
      description: `Only ${stockLevel.availableQuantity} units available`,
    });
    return;
  }

  // ✅ Determine the price based on transaction type
  let itemPrice: number;
  
  if (isPurchase) {
    // For purchases: use the entered price
    const enteredPrice = parseFloat(removeCommasFromNumbers(price)?.toString());
    
    if (!enteredPrice || enteredPrice <= 0) {
      toast.warning({
        title: 'Invalid Price',
        description: 'Please enter a valid purchase price',
      });
      return;
    }
    
    itemPrice = enteredPrice;
  } else {
    // For sales: use the item's selling price
    itemPrice = item.sellingPrice || 0;
    
    if (itemPrice <= 0) {
      toast.warning({
        title: 'Invalid Price',
        description: 'Item has no selling price set',
      });
      return;
    }
  }

  // ✅ Add item to cart with the correct price
  addItem(item, qty, stockLevel?.availableQuantity, itemPrice);
  
  // ✅ Reset form
  setSelectedItem("");
  setQuantity("");
  setPrice("");  // ← Clear the price state
  setStockLevel(null);
  
  // toast.success({
  //   title: 'Item Added',
  //   description: `${item.name} added to cart${isPurchase ? ` at ${formatCurrency(itemPrice)}` : ''}`,
  // });

}, [selectedItem, quantity, price, items, stockLevel, addItem, setStockLevel, isPurchase, isStock]);
  // Validate coupon
  const validateCoupon = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCouponData(null);
      setCouponAmount(0);
      setCouponError("");
      return;
    }

    if (code.includes('/') || code.includes('\\')) {
      setCouponError("Coupon code cannot contain '/' or '\\' characters");
      setCouponData(null);
      setCouponAmount(0);
      toast.warning({
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
        
        if (coupon.used) {
          setCouponError("This coupon has already been used");
          setCouponData(null);
          setCouponAmount(0);
          toast.warning({
            title: 'Coupon Already Used',
            description: 'This coupon has already been redeemed',
          });
          return;
        }

        if (coupon.expiryDate) {
          const expiryDate = new Date(coupon.expiryDate);
          const today = new Date();
          
          if (expiryDate < today) {
            setCouponError("This coupon has expired");
            setCouponData(null);
            setCouponAmount(0);
            toast.warning({
              title: 'Coupon Expired',
              description: `This coupon expired on ${new Date(coupon.expiryDate).toLocaleDateString()}`,
            });
            return;
          }
        }

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
      
      toast.warning({
        title: 'Invalid Coupon',
        description: errorMessage,
      });
    } finally {
      setIsCheckingCoupon(false);
    }
  }, [locationId]);

  // Load data
  const loadData = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current || !isMountedRef.current) return;
    
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
        axiosInstance.get(isSale ?  `/Items/Sale?locationId=${locationId}` :  `/Items/Stocking?locationId=${locationId}`),
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
  }, [user, selectedShop, router,  items.length, customers.length]);

  // Effects
  useEffect(() => {
    isMountedRef.current = true;
    
    const sessionShop = sessionStorage.getItem("selectedShop");
    if (!selectedShop && !sessionShop) {
      router.push('/dashboard/select-shop');
      return;
    }
    
    loadData();
    
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

  // Check stock level when item is selected
  useEffect(() => {
    if (selectedItem) {
      checkStock(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, checkStock, setStockLevel]);

  // Save cart to session storage
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

  const resetForm = useCallback(() => {
    clearCart();
    setSelectedPaymentMethod("");
    setBusinessPartner("");
    setAmountPaid("");
    setDate(prop?.instantSale ? new Date().toISOString().split('T')[0] : "");
    setQuantity("");
    setSelectedItem("");
    setStockLevel(null);
    setCouponCode("");
    setCouponData(null);
    setCouponAmount(0);
    setCouponError("");
    setErrors({});
    sessionStorage.removeItem('saleCart');
  }, [clearCart, prop?.instantSale, setStockLevel]);

  useEffect(() => {
    if (!receiptData) {
      resetForm();
    }
  }, [receiptData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callbacks
  const handleRemoveFromCart = useCallback((index: number) => {
    removeItem(index);
    // toast.info({
    //   title: 'Item Removed',
    //   description: 'Item has been removed from cart',
    // });
  }, [removeItem]);

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
    
    // toast.info({
    //   title: 'Cart Cleared',
    //   description: 'All items have been removed from cart',
    // });
  }, [cart.length, clearCart]);

  const validateSubmit = useCallback((): boolean => {
    if (cart.length === 0) {
      // toastErrors(toast, 'Please add at least one item to the cart', "", false);
      return false;
    }
    
    if (!isBusinessPartnerValid) {
      // toastErrors(toast, 'Please select a customer', "", false);
      return false;
    }
    
    const paid = parseFormattedNumber(amountPaid);
    if (!amountPaid || paid <= 0) {
      // toastErrors(toast, 'Please enter a valid amount', "", false);
      return false;
    }
    
    if (paid < totalWithCoupon) {
      // toastErrors(toast, `Amount paid (${formatCurrency(paid)}) cannot be less than total (${formatCurrency(totalWithCoupon)})`, "", false);
      return false;
    }
    
    if (!selectedPaymentMethod) {
      // toastErrors(toast, 'Please select a payment method', "", false);
      return false;
    }
    
    if (!date) {
      // toastErrors(toast, 'Please select a date', "", false);
      return false;
    }
    
    return true;
  }, [cart, totalWithCoupon, amountPaid, selectedPaymentMethod, isBusinessPartnerValid, date]);

  const handleSubmit = useCallback(async () => {
    if (!validateSubmit()) {
      // toast.warning({
      //   title: 'Validation Error',
      //   description: 'Please fix all errors before submitting',
      // });
      // return;
    }

    setSubmitting(true);
    
    try {
      const sessionShop = sessionStorage.getItem("selectedShop");
      const locationId = selectedShop || sessionShop || '';
      const paidAmount = parseFormattedNumber(amountPaid);
      
      const saleItems = cart.map((c) => ({
        itemId: c.id,
        quantity: c.quantity,
        unitPrice: c.price,
        deliveredQuantity: prop.instantSale? c.quantity : 0
      }));

      const postData = {
        locationId: locationId,
        businessPartnerId: prop.businessPartnerValue || null,
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
        transactionType: 1
        // remarks: `Paid: ${formatCurrency(paidAmount)}${couponData ? `, Coupon: ${couponData.code} (${formatCurrency(couponAmount)})` : ''}`
      };

     await axiosInstance.post(prop.submitUrl || "", postData).then(async (response) => {
        if (isSale) {
          setReceiptData({
            qrCode: response?.data?.qrCode, 
            transactionNumber: response?.data?.transactionNumber, 
            uniqueCount: response?.data?.count, 
            showQRCode: true 
          });
        }
       
        clearCart();
        setAmountPaid("");
        setSelectedPaymentMethod("");
        setBusinessPartner("");
        setCouponCode("");
        setCouponData(null);
        setCouponAmount(0);
        setCouponError("");
        setErrors({});
        setPrice("")
        sessionStorage.removeItem('saleCart');

        if (prop?.reloadUrl && prop?.reloadSetterFunction) {
          const reloadResponse = await axiosInstance.get(prop.reloadUrl);
          prop.reloadSetterFunction(reloadResponse?.data);
        }

        toastSuccess(toast, "", "Submitted successfully")
        if (!prop?.instantSale) {
          setTimeout(() => {
            prop.setOpen(false);
          }, 2000);
        }
        });

    } catch (error: any) {
       toastErrors(toast, error, "Technical challenge", true);
      console.error("Error completing purchase:", error);
    } finally {
      setSubmitting(false);
    }
  }, [cart, cartTotal, amountPaid, selectedPaymentMethod, selectedBusinessPartner, date, selectedShop, couponData, couponAmount, prop, validateSubmit, clearCart]);


  // Conditional returns after all hooks
  const sessionShop = sessionStorage.getItem("selectedShop");
  if (!selectedShop && !sessionShop) {
    return null;
  }

  if (loading || submitting) {
    return <Loading />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md px-2 pt-0">
     <div className="m-1" >
       {!prop?.instantSale && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ">
          <div className="text-sm sm:text-base mx-1 sm:mx-2">
            {prop?.businessPartnerLable}: <b>{prop?.businessPartnerName || 'Not Selected'}</b>
          </div>
          <Button className="w-full sm:w-auto bg-red-700 hover:bg-red-500" onClick={() => prop.setOpen(false)}>
            <X className="" /> Close
          </Button>
        </div>
      )}
     </div>
      
      <div className="p-0 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          {/* Left Column - Items Selection and Cart */}
          <div className="lg:col-span-3 space-y-2 ">
            {/* Items Selection Card */}
            <ItemSelection
              items={items}
              quantity={quantity}
              selectedItem={selectedItem}
              setQuantity={setQuantity}
              setSelectedItem={setSelectedItem}
              // setStockLevel={setStockLevel}
              stockLevel={stockLevel}
              isStockLevelLoading={checkingStock}
              disableCartAdition={submitting}
              key={"ItemSelection"}
              onAddItem={handleAddItem}
              transactionActionType={prop?.transactionActionType}
              setPrice={setPrice}
              price={price}
            />

            <ReusableCart
              dataSource={cart}
              columns={columns}
              onRemove={(item, index) => handleRemoveFromCart(index)}
              onClear={handleClearCart}
              loading={submitting}
              emptyMessage="No items in cart"
              emptySubMessage="Add items using the form above"
              className={prop?.instantSale ? "h-fit max-h-[calc(100vh-430px)] lg:h-[calc(100vh-238px)] lg:max-h-[calc(100vh-238px)]" : "h-fit max-h-[calc(100vh-430px)] lg:h-[calc(100vh-276px)] lg:max-h-[calc(100vh-276px)]"}
              
            />
          </div>

          {/* Right Column - Customer Selection and Checkout */}
          <div className="space-y-2">
            {/* {customerSelection} */}
            
            <CheckoutCard
              date={date}
              onDateChange={setDate}
              dateError={errors.date}
              datePlaceholder="Select date"
              cartTotal={cartTotal}
              amountPaid={amountPaid}
              onAmountPaidChange={setAmountPaid}
              amountPaidError={errors.amountPaid}
              showCoupon={true}
              couponCode={couponCode}
              onCouponChange={setCouponCode}
              onCouponBlur={validateCoupon}
              couponError={couponError}
              couponData={couponData}
              isCheckingCoupon={isCheckingCoupon}
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodChange={setSelectedPaymentMethod}
              paymentMethodError={errors.paymentMethod}
              couponAmount={couponAmount}
              balance={balance}
              onSubmit={handleSubmit}
              onCancel={handleClearCart}
              isSubmitting={submitting}
              isCheckOutValid={isCheckOutValid}
              cartEmpty={cart.length === 0}
              instantSale={prop.instantSale}
              transactionType={prop?.transactionActionType}
              // height={prop.instantSale ? "calc(100vh - 75px)" : "calc(100vh - 365px)"}
               className={prop?.instantSale ? "h-fit sm:h-[calc(100vh-79px)]" : "h-fit sm:h-[calc(100vh-118px)]"}
            />
          </div>
        </div>
      </div>

      {receiptData && (
        <div className=" fixed inset-0 z-100 top-0 left-0 right-0 min-h-screen bg-gray-100 p-4 flex justify-center">
          <POSReceipt
            data={receiptData}
            setData={setReceiptData}
          />
        </div>
      )}

      {toast.ToastComponent}
    </div>
  );
}

// Wrap with Error Boundary and memo
const SaleTransactionUI = memo(SaleTransactionUIComponent);
SaleTransactionUI.displayName = 'SaleTransactionUI';

export default function SaleTransactionUIWithErrorBoundary(prop: TransactionUI) {
  return (
    <ErrorBoundary>
      <SaleTransactionUI {...prop} />
    </ErrorBoundary>
  );
}