"use client";

import {
  useState,
  useEffect,
  useRef,
  SetStateAction,
  Dispatch,
  useCallback,
  useMemo,
  memo,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { X } from 'lucide-react';
import type {
  Item,
  Supplier,
  Transaction,
  ItemStockLevelDTO,
  CouponResponse,
} from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import {
  currency,
  formatNumberWithCommas,
  removeCommasFromNumbers,
  toastErrors,
  toastSuccess,
  sessionStore,
} from "@/helpers/formatStrings";
import { useRouter } from 'next/navigation';
import POSReceipt, { POSReceiptProps } from "./POSReceipt";
import ItemSelection from "./ItemSelection";
import { CartItem } from "@/lib/types";
import ReusableCart, { CartColumn } from "./SaleCart";
import { config, paymentMethods, settings } from "./AppConfig";
import { useToaster } from "./CustomToast";
import CheckoutCard from "./CheckoutCard";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface TransactionUI {
  setOpen: (isOpen: boolean) => void;
  reloadUrl?: string;
  reloadSetterFunction?: Dispatch<SetStateAction<Transaction[]>>;
  submitUrl?: string;
  instantSale: boolean;
  businessPartnerLable?: string;
  transactionActionType?: string;
  businessPartnerValue?: string;
  businessPartnerName?: string;
  allowItemSelection?: boolean;
  items?: Item[];
  cartItems?: CartItem[];
  transactionNumber?: string;
  onSubmitted?: (result: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
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
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
// const formatCurrency = (amount: number): string =>
//   new Intl.NumberFormat('en-US', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(amount);

const parseFormattedNumber = (value: string): number =>
  parseFloat(value.replace(/,/g, '')) || 0;

// ─────────────────────────────────────────────────────────────────────────────
// useCart
// ─────────────────────────────────────────────────────────────────────────────
const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (item: Item, quantity: number, remainingQuantity?: number, price?: number | null) => {
      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex((c) => c.id === item.id);

        const itemPrice =
          price !== undefined && price !== null ? price : item.sellingPrice;

        if (existingIndex >= 0) {
          const newCart = [...prevCart];
          const currentReceivingQty = newCart[existingIndex].receivingQuantity || 0;
          const newReceivingQty = currentReceivingQty + quantity;

          newCart[existingIndex] = {
            ...newCart[existingIndex],
            price: itemPrice,
            quantity: newReceivingQty,
            receivingQuantity: newReceivingQty,
            remainingQuantity:
              remainingQuantity && remainingQuantity > 0
                ? (remainingQuantity || 0) - newReceivingQty
                : 0,
          };
          return newCart;
        }

        const newCartItem: CartItem = {
          id: item.id,
          name: item.name || 'Unknown Item',
          code: item.code || '',
          price: itemPrice,
          quantity: quantity || 0,
          deliveredQuantity: 0,
          receivingQuantity: quantity,
          remainingQuantity:
            remainingQuantity && remainingQuantity > 0
              ? (remainingQuantity || 0) - quantity
              : 0,
        };
        return [...prevCart, newCartItem];
      });
    },
    []
  );

  const removeItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  return { cart, setCart, addItem, removeItem, clearCart };
};

// ─────────────────────────────────────────────────────────────────────────────
// useStockCheck
// ─────────────────────────────────────────────────────────────────────────────
const useStockCheck = (selectedShop: string, toast: any) => {
  const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable ref to toast so the checkStock callback identity doesn't flip
  // when useToaster() returns a new object each render.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const checkStock = useCallback(
    async (itemId: string) => {
      if (!itemId) {
        setStockLevel(null);
        return;
      }

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();

      debounceTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;

        abortControllerRef.current = new AbortController();
        setCheckingStock(true);

        try {
          const sessionShop = sessionStore.get("selectedShop");
          const locationId = selectedShop || sessionShop;

          if (!locationId) {
            console.warn('No location ID available for stock check');
            if (isMountedRef.current) setCheckingStock(false);
            return;
          }

          const response = await axiosInstance.get(
            `/Items/Stock-Level/${itemId}?locationId=${locationId}`,
            { signal: abortControllerRef.current?.signal }
          );

          if (isMountedRef.current && response?.data) {
            setStockLevel(response.data);

            if (response.data.availableQuantity < 5 && response.data.availableQuantity > 0) {
              toastRef.current.warning?.({
                title: 'Low Stock Warning',
                description: `Only ${response.data.availableQuantity} units left in stock for ${response.data.name}`,
              });
            }

            if (response.data.availableQuantity === 0) {
              toastRef.current.warning?.({
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

          if (isMountedRef.current) {
            setStockLevel({
              name: '',
              code: '',
              reorderLevel: 0,
              availableQuantity: 0,
              actualQuantity: 0,
            });
            if (error?.response) toastErrors(toastRef.current, error);
          }
        } finally {
          if (isMountedRef.current) setCheckingStock(false);
        }
      }, 300);
    },
    [selectedShop]
  );

  return { stockLevel, checkingStock, checkStock, setStockLevel };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cart columns
// ─────────────────────────────────────────────────────────────────────────────
const columns: CartColumn<CartItem>[] = [
  { key: 'name', header: 'Item', align: 'left', width: '40%' },
  {
    key: 'quantity',
    header: 'Qty',
    align: 'center',
    width: '15%',
    render: (item) => `${formatNumberWithCommas(item.quantity?.toString())}`,
  },
  {
    key: 'price',
    header: `Price (${settings?.currency?.toUpperCase()})`,
    align: 'right',
    width: '20%',
    render: (item) => `${currency(item.price.toFixed(2)?.toString())}`,
  },
  {
    key: 'total',
    header: `Total (${settings?.currency?.toUpperCase()})`,
    align: 'right',
    width: '25%',
    render: (item) => `${currency((item.quantity * item.price).toFixed(2).toString())}`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
function SaleTransactionUIComponent(prop: TransactionUI) {
  const toast = useToaster();
  const { user, selectedShop } = useAuth();
  const router = useRouter();

  // ✅ Stable ref to toast so callbacks depending on toast don't re-create
  // every render when useToaster returns a fresh object.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

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

  const isPurchase = prop.transactionActionType?.toUpperCase().trim() === config.transactionTypes.PURC;
  const isSale = prop.transactionActionType?.toUpperCase().trim() === config.transactionTypes.SALE;
  const isStock = prop.transactionActionType?.toUpperCase().trim() === config.transactionTypes.STCK;
  const isTrans = prop.transactionActionType?.toUpperCase().trim() ===  config.transactionTypes.TRAN;

  const isInstantSale =  isSale && prop.instantSale;
  const isInstantSaleDelivery = isSale && prop.instantSale && ((prop.cartItems?.length || 0 )> 0)
  const isCustomerSale = isSale && !!prop.businessPartnerValue && !!prop?.businessPartnerName
  const isCustomerDelivery = isSale && !prop.instantSale && !!prop.businessPartnerValue && !!prop?.businessPartnerName && ((prop.cartItems?.length || 0) > 0)

  // ───────────────────────────────────────────────────────────────────────────
  // Effective cart — derived during render, stable across renders when parent
  // doesn't supply cartItems.
  // ───────────────────────────────────────────────────────────────────────────
  const { cart: internalCart, setCart, addItem, removeItem, clearCart } = useCart();
  const cart: CartItem[] = useMemo(
    () => prop?.cartItems ?? internalCart,
    [prop?.cartItems, internalCart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity * c.price, 0),
    [cart]
  );

  const { stockLevel, checkingStock, checkStock, setStockLevel } = useStockCheck(
    selectedShop || '',
    toast
  );

  // Set business partner from props if provided
  useEffect(() => {
    if (prop?.businessPartnerValue && !selectedBusinessPartner) {
      setBusinessPartner(prop.businessPartnerValue);
    }
  }, [prop?.businessPartnerValue, selectedBusinessPartner]);

  // Memoized values
  const locationId = useMemo(
    () => selectedShop || sessionStore.get("selectedShop") || "",
    [selectedShop]
  );

  const totalWithCoupon = useMemo(
    () => cartTotal - couponAmount,
    [cartTotal, couponAmount]
  );

  const balance = useMemo(
    () => totalWithCoupon - parseFormattedNumber(amountPaid),
    [totalWithCoupon, amountPaid]
  );

  const isBusinessPartnerValid = useMemo(
    () =>
      isSale && prop?.instantSale //instant sale
    || isSale && !prop.instantSale && ((prop?.cartItems?.length || 0) > 0) //instant sale delivery
    || isSale &&  !prop?.instantSale && !!prop?.businessPartnerValue && !!prop?.businessPartnerName // customer sale
    || isPurchase //&& !!prop?.businessPartnerValue && !!prop?.businessPartnerName
    || isTrans && !!prop?.businessPartnerValue && !!prop?.businessPartnerName
    , // intant sale delivery
    [prop?.instantSale, prop?.businessPartnerValue, prop?.businessPartnerName]
  );

  const isCheckOutValid = useMemo(() => {
    const hasItems = cart.length > 0 || (prop?.cartItems || [])?.length > 0;

  //  console.log({businessP : prop?.businessPartnerValue})


    //  console.log({hasItems})

    const hasAmount = isTrans || isPurchase  
                      || (isInstantSale && settings?.saleToDeliveryMode === true && !isInstantSaleDelivery) 
                      || (isInstantSale && settings?.saleToDeliveryMode === false &&  (Number(removeCommasFromNumbers(amountPaid)) >= totalWithCoupon)) 
                      || (isInstantSaleDelivery && settings?.saleToDeliveryMode ===  true && (Number(removeCommasFromNumbers(amountPaid)) >= totalWithCoupon))
                      || (isCustomerSale && ((settings?.minimumSalePaymentPercentage || 0) > 0) && Number(removeCommasFromNumbers(amountPaid)) >= (((settings?.minimumSalePaymentPercentage || 0)/100) * totalWithCoupon))
                      || (isCustomerSale && ((settings?.minimumSalePaymentPercentage === 0) &&  (Number(removeCommasFromNumbers(amountPaid)) >= totalWithCoupon)))

    //  isSale ? 
    //   (
    //    (prop.instantSale && (Number(removeCommasFromNumbers(amountPaid)) >= totalWithCoupon))  || //sale that requires only one person
    //    (Number(removeCommasFromNumbers(amountPaid)) >= totalWithCoupon && isSale)  || // sale that requires 2 persons, sesnond person that generates receipt for taking out items
    //    (!!prop?.businessPartnerValue && !!prop?.businessPartnerName && isSale && Number(removeCommasFromNumbers(amountPaid)) >= (((settings?.minimumSalePaymentPercentage || 0)/100) * totalWithCoupon))) // customer sale
    //   : !isSale


    //  console.log({hasAmount})
 
    const hasPaymentMethod =  ((isPurchase && !!selectedPaymentMethod) || (isTrans && !selectedPaymentMethod) ||
                 (isInstantSale && !isInstantSaleDelivery && settings?.saleToDeliveryMode === true && !selectedPaymentMethod) ||
                 (isInstantSale && settings?.saleToDeliveryMode === false && !!selectedPaymentMethod) ||
                 (isInstantSaleDelivery && settings?.saleToDeliveryMode === true && !!selectedPaymentMethod) ||
                  (isCustomerSale  &&  !!selectedPaymentMethod)|| isCustomerDelivery ) //&& !!selectedPaymentMethod;
      
    
              // console.log({hasPaymentMethod})

      const hasDate =   (isInstantSale && !isInstantSaleDelivery  && settings?.saleToDeliveryMode === true) || !!date
      //isSale || !!date;
    // console.log({hasDate})

    // console.log({isBusinessPartnerValid})
  
    return hasItems && hasAmount && hasPaymentMethod && isBusinessPartnerValid && hasDate;
  }, [
    cart.length,
    prop.instantSale,
    prop?.businessPartnerValue,
    prop?.businessPartnerName,
    prop?.cartItems,
    prop.allowItemSelection,
    amountPaid,
    isBusinessPartnerValid,
    selectedPaymentMethod,
    date,
    isSale,
    isPurchase,
    isStock,
    isTrans,
    totalWithCoupon,
  ]);

  // console.log(checkVa)
  // ───────────────────────────────────────────────────────────────────────────
  // Add item to cart
  // ───────────────────────────────────────────────────────────────────────────
  const handleAddItem = useCallback(() => {
    if (!selectedItem || !quantity) {
      toastRef.current.warning({
        title: 'Missing Information',
        description: 'Please select an item and enter quantity',
      });
      return;
    }

    const item = items.find((i) => i.id === selectedItem);
    if (!item) {
      toastRef.current.error({
        title: 'Item Not Found',
        description: 'Selected item no longer available',
      });
      return;
    }

    const qty = parseFloat(removeCommasFromNumbers(quantity)?.toString());
    if (isNaN(qty) || qty <= 0) {
      toastRef.current.warning({
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity',
      });
      return;
    }

    if (!isPurchase && !isStock && !isTrans && stockLevel && stockLevel.availableQuantity < qty) {
      toastRef.current.warning({
        title: 'Insufficient Stock',
        description: `Only ${stockLevel.availableQuantity} units available`,
      });
      return;
    }

    let itemPrice: number;

    if (isPurchase) {
      const enteredPrice = parseFloat(removeCommasFromNumbers(price)?.toString());
      if (!enteredPrice || enteredPrice <= 0) {
        toastRef.current.warning({
          title: 'Invalid Price',
          description: 'Please enter a valid purchase price',
        });
        return;
      }
      itemPrice = enteredPrice;
    } else {
      itemPrice = item.sellingPrice || 0;
      if (itemPrice <= 0) {
        toastRef.current.warning({
          title: 'Invalid Price',
          description: 'Item has no selling price set',
        });
        return;
      }
    }

    addItem(item, qty, stockLevel?.availableQuantity, itemPrice);

    setSelectedItem("");
    setQuantity("");
    setPrice("");
    setStockLevel(null);
  }, [
    selectedItem,
    quantity,
    price,
    items,
    stockLevel,
    addItem,
    setStockLevel,
    isPurchase,
    isStock,
    isTrans,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Coupon validation
  // ───────────────────────────────────────────────────────────────────────────
  const validateCoupon = useCallback(
    async (code: string) => {
      const t = toastRef.current;

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
        t.warning({
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
        const response = await axiosInstance.get(
          `/Coupon/${code}?locationId=${locationId}`
        );

        if (response?.data) {
          const coupon: CouponResponse = response.data;

          if (coupon.used) {
            setCouponError("This coupon has already been used");
            setCouponData(null);
            setCouponAmount(0);
            t.warning({
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
              t.warning({
                title: 'Coupon Expired',
                description: `This coupon expired on ${new Date(
                  coupon.expiryDate
                ).toLocaleDateString()}`,
              });
              return;
            }
          }

          setCouponData(coupon);
          setCouponAmount(coupon.amount);
          setCouponError("");
          t.success({
            title: 'Coupon Applied',
            description: `Coupon worth ${currency(
              coupon.amount?.toString()
            )} applied successfully!`,
          });
        }
      } catch (error: any) {
        console.error("Error validating coupon:", error);
        setCouponData(null);
        setCouponAmount(0);

        const errorMessage =
          error?.response?.data?.message || 'Invalid coupon code';
        setCouponError(errorMessage);

        t.warning({
          title: 'Invalid Coupon',
          description: errorMessage,
        });
      } finally {
        setIsCheckingCoupon(false);
      }
    },
    [locationId]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Load data
  // ───────────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current || !isMountedRef.current) return;

    if (hasLoadedDataRef.current && items.length > 0 && customers.length > 0) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);

    try {
      const sessionShop = sessionStore.get("selectedShop");

      if (!selectedShop && !sessionShop) {
        router.push('/select-shop');
        return;
      }

      const locId = selectedShop || sessionShop;
      const [itemsResponse, customersResponse] = await Promise.all([
        axiosInstance.get(
          isSale
            ? `/Items/Sale?locationId=${locId}`
            : `/Items/Stocking?locationId=${locId}`
        ),
        axiosInstance.get(
          `/customers?companyId=${user.companyId || user}&locationId=${locId}`
        ),
      ]);

      if (isMountedRef.current) {
        setCustomers(customersResponse?.data || []);
        setItems(itemsResponse?.data || []);
        hasLoadedDataRef.current = true;
        setErrors((prev) => ({ ...prev, loadData: '' }));
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      if (isMountedRef.current) {
        const errorMessage =
          error?.response?.data?.message ||
          'Failed to load data. Please refresh the page.';
        setErrors((prev) => ({ ...prev, loadData: errorMessage }));
        toastRef.current.error({
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
  }, [user, selectedShop, router, isSale, items.length, customers.length]);

  useEffect(() => {
    isMountedRef.current = true;

    const sessionShop = sessionStore.get("selectedShop");
    if (!selectedShop && !sessionShop) {
      router.push('/select-shop');
      return;
    }

    loadData();

    if (!prop.cartItems || prop.cartItems.length === 0) {
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
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData, selectedShop, router, setCart, prop.cartItems]);

  // Check stock level when item is selected
  useEffect(() => {
    if (selectedItem) {
      checkStock(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, checkStock, setStockLevel]);

  // Persist internal cart to session storage — only when parent isn't controlling it.
  useEffect(() => {
    if (prop.cartItems && prop.cartItems.length > 0) return;

    const saveTimer = setTimeout(() => {
      if (internalCart.length > 0) {
        sessionStorage.setItem('saleCart', JSON.stringify(internalCart));
      } else {
        sessionStorage.removeItem('saleCart');
      }
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [internalCart, prop.cartItems]);

  // Reset coupon when cart is emptied
  useEffect(() => {
    if (cart.length === 0) {
      setCouponCode("");
      setCouponData(null);
      setCouponAmount(0);
      setCouponError("");
    }
  }, [cart.length]);

  // ───────────────────────────────────────────────────────────────────────────
  // Cart handlers
  // ───────────────────────────────────────────────────────────────────────────
  const handleRemoveFromCart = useCallback(
    (index: number) => {
      if (prop.cartItems && prop.cartItems.length > 0) return;
      removeItem(index);
    },
    [removeItem, prop.cartItems]
  );

  const handleClearCart = useCallback(() => {
    if (cart.length === 0) return;

    if (prop?.cartItems && prop.cartItems.length > 0) {
      setCart([]);
      return;
    }

    clearCart();
    sessionStorage.removeItem('saleCart');
    setAmountPaid("");
    setSelectedPaymentMethod("");
    setBusinessPartner("");
    setCouponCode("");
    setCouponData(null);
    setCouponAmount(0);
    setCouponError("");
    setErrors({});
  }, [cart.length, clearCart, prop?.cartItems, setCart]);

  // ───────────────────────────────────────────────────────────────────────────
  // Validation + submit
  // ───────────────────────────────────────────────────────────────────────────
 
  // console.log(prop.allowItemSelection === true)

  const handleSubmit = useCallback(async () => {
    const t = toastRef.current;

    if (!isCheckOutValid) {
      return t.warning({
        description: "",
        title: "Validations failed !",
      });
    }

    setSubmitting(true);

    try {
      const sessionShop = sessionStore.get("selectedShop");
      const locId = selectedShop || sessionShop || '';
      const paidAmount = parseFormattedNumber(amountPaid);

      const saleItems = cart.map((c) => ({
        itemId: c.id,
        quantity: c.quantity,
        unitPrice: c.price,
        deliveredQuantity: prop.instantSale ? c.quantity : 0,
      }));

      const postData =  isInstantSaleDelivery && settings?.saleToDeliveryMode === true ?
         {
            transactionId: prop?.transactionNumber,
            amount: totalWithCoupon,
            paymentDate: new Date().toISOString() || new Date(date).toISOString(),
            paymentMethod: Number(selectedPaymentMethod),
            remarks: "",
            couponCode: couponCode,
            currencyCode: settings?.currency,
          }
          : {
            locationId: locId,
            businessPartnerId: prop.businessPartnerValue || null,
            transactionResultsType: 2,
            date: new Date().toISOString() || new Date(date).toISOString(),
            totalAmount: cartTotal,
            taxAmount: 0,
            discountAmount: couponAmount,
            amountPaid: paidAmount,
            paymentMethod: Number(selectedPaymentMethod),
            items: saleItems,
            transactionCode: "",
            couponCode: couponData?.code || "",
            currencyCode: settings?.currency,
            transactionType: 1,
          }
        ;

      const response = await axiosInstance.post(prop.submitUrl || "", postData);

      // Reset form state
      clearCart();
      setAmountPaid("");
      setSelectedPaymentMethod("");
      setBusinessPartner("");
      setCouponCode("");
      setCouponData(null);
      setCouponAmount(0);
      setCouponError("");
      setErrors({});
      setPrice("");
      sessionStorage.removeItem('saleCart');

      // Optional reload
      if (prop?.reloadUrl && prop?.reloadSetterFunction) {
        try {
          const reloadResponse = await axiosInstance.get(prop.reloadUrl);
          prop.reloadSetterFunction(reloadResponse?.data);
        } catch (e) {
          console.warn('Post-submit reload failed', e);
        }
      }

      toastSuccess(t, "", "Submitted successfully");

      if (prop.onSubmitted) {
        prop.onSubmitted(response?.data);
      } else {
        if (isSale) {
          setReceiptData({
            qrCode: response?.data?.qrCode,
            transactionNumber: response?.data?.transactionNumber,
            uniqueCount: response?.data?.count,
            showQRCode: true,
          });
        }
        if (!prop?.instantSale) {
          setTimeout(() => prop.setOpen(false), 2000);
        }
      }
    } catch (error: any) {
      toastErrors(t, error, "Technical challenge", true);
      console.error("Error completing purchase:", error);
    } finally {
      setSubmitting(false);
    }
  }, [
    cart,
    cartTotal,
    amountPaid,
    selectedPaymentMethod,
    selectedBusinessPartner,
    date,
    selectedShop,
    couponData,
    couponAmount,
    couponCode,
    prop,
    clearCart,
    isSale,
    isCheckOutValid,
    totalWithCoupon,
  ]);

  // console.log({businessPartnerName : prop?.businessPartnerName})
  // ───────────────────────────────────────────────────────────────────────────
  // Guard
  // ───────────────────────────────────────────────────────────────────────────
  if (!selectedShop && !sessionStore.get("selectedShop")) {
    return null;
  }

  if (loading || submitting) {
    return <Loading />;
  }

  const isControlledCart = !!(prop.cartItems && prop.cartItems.length > 0);

  return (
    <div className="bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md px-2 pt-0">
      <div className="m-1">
        {!prop?.instantSale && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm sm:text-base mx-1 sm:mx-2">
                <>
                  {prop?.businessPartnerLable}: <b>{prop?.businessPartnerName || 'Not Selected'}</b>
                </>
            </div>
            <Button
              className="w-full sm:w-auto bg-red-700 hover:bg-red-500"
              onClick={() => {prop.setOpen(false); handleClearCart()}}
            >
              <X className="" /> Close
            </Button>
          </div>
        )}
      </div>

      <div className="p-0 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          <div className="lg:col-span-3 space-y-2">
            <ItemSelection
              items={items}
              quantity={quantity}
              selectedItem={selectedItem}
              setQuantity={setQuantity}
              setSelectedItem={setSelectedItem}
              stockLevel={stockLevel}
              isStockLevelLoading={checkingStock}
              disableCartAdition={submitting || isControlledCart}
              key="ItemSelection"
              onAddItem={handleAddItem}
              transactionActionType={prop?.transactionActionType}
              setPrice={setPrice}
              price={price}
              allowSelection={
                (isTrans 
                || isPurchase 
                || isInstantSale
                || isCustomerSale)
                && !isInstantSaleDelivery && !isCustomerDelivery
              }
            />

            <ReusableCart
              dataSource={cart}
              columns={columns}
              onRemove={(item, index) => handleRemoveFromCart(index)}
              onClear={handleClearCart}
              loading={submitting}
              emptyMessage="No data found."
              emptySubMessage="Add items using the form above"
              className={
                prop?.instantSale
                  ? "h-fit max-h-[calc(100vh-430px)] lg:h-[calc(100vh-238px)] lg:max-h-[calc(100vh-238px)]"
                  : "h-fit max-h-[calc(100vh-430px)] lg:h-[calc(100vh-276px)] lg:max-h-[calc(100vh-276px)]"
              }
              allowEdits={!isControlledCart}
            />
          </div>

          <div className="space-y-2">
            <CheckoutCard
              date={date}
              onDateChange={setDate}
              showDate = {
                isPurchase || isTrans ||   (isInstantSale && settings?.saleToDeliveryMode === false) || isInstantSaleDelivery || isCustomerSale
              }
              dateError={errors.date}
              datePlaceholder="Select date"
              cartTotal={cartTotal}
              amountPaid={amountPaid}
              onAmountPaidChange={setAmountPaid}
              amountPaidError={errors.amountPaid}
              showMinPaymentThreshold={
                (isCustomerSale || isCustomerDelivery) && ((settings?.minimumSalePaymentPercentage || 0)> 0)
              }
              showPayment={
                isPurchase ||
                 (isInstantSale && settings?.saleToDeliveryMode === false) ||
                 (isInstantSaleDelivery && settings?.saleToDeliveryMode === true) ||
                  isCustomerSale || isCustomerDelivery 
              }
              showCoupon={
                 (isInstantSale && settings?.saleToDeliveryMode === false)  || isCustomerSale
                // (  isSale && prop.instantSale ||
                // !!prop.businessPartnerValue && !!prop?.businessPartnerName) // purchase, stock adjustment, sale and business partners 
                // || (!prop.instantSale && !prop?.businessPartnerName && !prop?.businessPartnerValue)
              
              }
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
              className={
                prop?.instantSale
                  ? "h-fit sm:h-[calc(100vh-110px)]"
                  : "h-fit sm:h-[calc(100vh-118px)]"
              }
            />
          </div>
        </div>
      </div>

      {receiptData && (
        <div className="fixed inset-0 z-100 top-0 left-0 right-0 min-h-screen bg-gray-100 p-4 flex justify-center">
          <POSReceipt data={receiptData} setData={setReceiptData} />
        </div>
      )}

      {toast.ToastComponent}
    </div>
  );
}

const SaleTransactionUI = memo(SaleTransactionUIComponent);
SaleTransactionUI.displayName = 'SaleTransactionUI';

export default function SaleTransactionUIWithErrorBoundary(prop: TransactionUI) {
  return (
    <ErrorBoundary>
      <SaleTransactionUI {...prop} />
    </ErrorBoundary>
  );
}