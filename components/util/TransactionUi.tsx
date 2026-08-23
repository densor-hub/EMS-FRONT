"use client";

import { useState, useEffect, useRef, SetStateAction, Dispatch, useCallback } from "react";
import { Header } from '@/components/dashboard/header';
// import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toastErrors } from "@/helpers/formatStrings";
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
  CheckCircle,
  Loader2,
  Ticket
} from 'lucide-react';
// import { apiService } from "@/lib/api-service";
import type { Item, Supplier, Transaction, ItemStockLevelDTO, CouponResponse } from "@/lib/types";
import Loading from "@/app/dashboard/loading";
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { formatNumberWithCommas, removeCommasFromNumbers, alphaNumericDate, currency } from "@/helpers/formatStrings";
import { useToast } from "@/hooks/use-toast";
import StockLevelUi from "./StockLevelUi";


interface TransactionUI {
  setOpen: (isOpen: boolean) => void;
  reloadUrl?: string;  // Made optional with ?
  reloadSetterFunction?: Dispatch<SetStateAction<Transaction[]>>;  // Fixed syntax
  submitUrl? : string;
  businessPartnerName : string;
  businessPartnerValue : string;
  businessPartnerLable : string;
  transactionActionType : string;
}

const paymentMethods  =  [
  {name :"Mobile Money" , id : 1}, 
  {name :"Cash", id :2}, 
  {name :"Cheque" , id : 3}, 
  {name :"Bank Transfer " , id : 4},
  {name :"Other" , id : 5} 
]

export default function TransactionUI(prop : TransactionUI) {
  const {toast} = useToast()
  const {user, selectedShop} = useAuth()
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("")
  const [date, setDate] = useState('')
  const dateRef = useRef<HTMLInputElement>(null)
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [stockLevel, setStockLevel] = useState<ItemStockLevelDTO | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  
  // Check if transaction type is stock transfer
  const isStockTransfer = prop?.transactionActionType?.toLowerCase().trim() === "stock transfer";

  //coupon
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponResponse | null>(null);
  // const [couponAmount, setCouponAmount] = useState(0);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [cart, setCart] = useState<
    Array<{ item: Item; quantity: number; price: number, deliveredQty? : number }>
  >([]);

  const getLocationId = useCallback(() => {
    return selectedShop || sessionStorage.getItem("selectedShop") || "";
  }, [selectedShop]);


 useEffect(() => {
    loadData();
  }, []);

const loadData = async (): Promise<void> => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    try {
        const sessionShop = sessionStorage.getItem("selectedShop")
        const items = await axiosInstance.get(prop.transactionActionType.toLowerCase() === "sale"  ? `/Items?locationId=${selectedShop || sessionShop}` : `/Items/Purchase?locationId=${selectedShop || sessionShop}`);
        setItems(items?.data)
        //const data = await axiosInstance.get(`/Suppliers?companyId=${user.companyId || user}&locationId=${selectedShop || sessionShop}`);

        //setSuppliers(data?.data);
    } catch (error) {
        console.log("Error loading data:", error);
    } finally {
        setLoading(false);
        isLoadingRef.current = false;
    }
};

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
      setStockLevel
      toast.warning({
            title: 'Technical Challenge',
            description: `failed to check currently out of stock`,
          });
          setStockLevel({
          name:'',
          code: '',
          reorderLevel: 0,
          availableQuantity:  0,
          actualQuantity:  0
        });
    } finally {
      if (isMountedRef.current) {
        setCheckingStock(false);
      }
    }
  }, [items, toast]); // Added dependencies

  // FIX: Watch for selectedItem changes and check stock
  useEffect(() => {
    if (selectedItem) {
      checkStockLevel(selectedItem);
    } else {
      setStockLevel(null);
    }
  }, [selectedItem, checkStockLevel]);

const validateCoupon = useCallback(async (code: string) => {
  if (!code.trim()) {
    setCouponData(null);
    setCouponError("");
    return;
  }

  // Check for invalid characters
  if (code.includes('/') || code.includes('\\')) {
    setCouponError("Coupon code cannot contain '/' or '\\' characters");
    setCouponData(null);
    setCouponCode(""); // Clear the input
    toast.error({
      title: 'Invalid Coupon',
      description: 'Coupon code cannot contain "/" or "\\" characters',
    });
    return;
  }

  const locationId = getLocationId();
  if (!locationId) {
    setCouponError("No shop selected");
    setCouponCode(""); // Clear the input
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
        setCouponCode(""); // Clear the input
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
          setCouponCode(""); // Clear the input
          toast.error({
            title: 'Coupon Expired',
            description: `This coupon expired on ${new Date(coupon.expiryDate).toLocaleDateString()}`,
          });
          return;
        }
      }

      // Coupon is valid
      setCouponData(coupon);
      setCouponError("");
      toast.success({
        title: 'Coupon Applied',
        description: `Coupon worth ${currency(coupon?.amount?.toString())} applied successfully!`,
      });
    }
  } catch (error: any) {
    console.error("Error validating coupon:", error);
    setCouponData(null);
    setCouponCode(""); // Clear the input
    
    const errorMessage = error?.response?.data?.message || 'Invalid coupon code';
    setCouponError(errorMessage);
    
    toast.error({
      title: 'Invalid Coupon',
      description: errorMessage,
    });
  } finally {
    setIsCheckingCoupon(false);
  }
}, [getLocationId, toast]);

 const addToCart = () => {
    if (!selectedItem || !quantity) {
      toast.warning({
          title: 'Failed to submit',
           description: "Please select an item, enter quantity, and unit price"
        })
      return;
    }

    if ((stockLevel?.availableQuantity ?? 0 )< Number(removeCommasFromNumbers(quantity || ""))) {
        toast.warning({
          title: 'Available quantity not enough to fulfill the transaction'
        })
        return;
    }

    const item = items.find(i => i.id === selectedItem);
    
    if (!item) return;

    const existingIndex = cart.findIndex((c) => c.item.id === selectedItem);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity = parseInt(quantity);
      newCart[existingIndex].price = item.sellingPrice ;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        item, 
        quantity: parseInt(quantity), 
        price: item.sellingPrice 
      }]);
    }

    // Reset form
    setSelectedItem("");
    setQuantity("");
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.price, 0);

  const handleSubmit = async () => {
    
    // Modified validation for stock transfer
    if (cart.length === 0 || !prop?.businessPartnerValue || !date) {
      toast.warning({
        title: 'Missing required fields',
        description: isStockTransfer ? 'Please add items and select a date' : 'Please add items, select a date, and choose payment method',
      });
      return;
    }

    
    // For non-stock transfer, require payment method and amount paid
    if (!isStockTransfer && (!selectedPaymentMethod || !amountPaid)) {
      toast.warning({
        title: 'Payment details required',
        description: 'Please enter amount paid and select payment method',
      });
      return;
    }

    
    setLoading(true)
    try {

      const sessionShop = sessionStorage.getItem("selectedShop")
      const transaction ={
        locationId : selectedShop || sessionShop,
        businessPartnerId: prop?.businessPartnerValue,
        transactionType : 1,
        transactionResultsType : 1, // Deposit
        date,
        totalAmount: removeCommasFromNumbers(cartTotal.toString()),
        taxAmount: 0,
        discountAmount: couponData?.amount || 0,
        amountPaid: isStockTransfer ? 0 : removeCommasFromNumbers(amountPaid),
        paymentMethod : isStockTransfer ? 0 : Number(selectedPaymentMethod),
        couponCode: couponData?.code || null,
        items: cart.map((c) => ({
          itemId: c.item.id,
          quantity: removeCommasFromNumbers(c?.quantity?.toString()),
          unitPrice: removeCommasFromNumbers(c?.price?.toString()),
          deliveredQuantity: c.deliveredQty,
        })),
        currencyCode: "GHS"
      };

     
      const url = prop.submitUrl || ""
      await axiosInstance.post(url, transaction);

      toast.success({
          title: 'Submitted successfully',
          description: prop?.transactionActionType +' transaction saved successfully',
      })

      await axiosInstance.get(prop.reloadUrl || "").then((res) => {
        if (prop?.reloadSetterFunction) prop?.reloadSetterFunction(res?.data)
      })
    
      setCart([]);
      setModalOpen(false);
      prop.setOpen(false)
    } catch (error: any) {
      return toastErrors(toast, error);
    }
    finally{
      setLoading(false)
    }
  };

  useEffect(() =>{
    setUnitPrice(items?.find(x => x.id == selectedItem)?.sellingPrice?.toString() ||"")
  }, [selectedItem])
  
  if (loading) {
    return  <Loading/>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 sm:p-3">
        <div className="text-sm sm:text-base mx-1 sm:mx-2">
          {prop?.businessPartnerLable}: <b>{prop?.businessPartnerName}</b>
        </div>
        <Button className="w-full sm:w-auto bg-red-700 hover:bg-red-500" onClick={() => prop.setOpen(false)}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </div>

      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2" >
          {/* Left Column - Items Selection and Cart */}
          <div className="lg:col-span-3 space-y-2">
            {/* Items Selection Card */}
            <Card className="border-border p-0">

              <StockLevelUi
                checkingStock={checkingStock}
                selectedItem={selectedItem}
                stockLevel={stockLevel}
              />

              <CardContent className="">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                  {/* Item Selection Dropdown */}
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="item" className="text-xs sm:text-sm text-foreground">Select Item</Label>
                    <Select value={selectedItem} onValueChange={(value) => {
                      setSelectedItem(value);
                      // Stock check will be triggered by the useEffect
                    }}>
                      <SelectTrigger className="bg-secondary border-border w-full text-xs sm:text-sm">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex flex-col">
                              <span className="text-sm">{item.name}</span>
                              <span className="text-xs text-muted-foreground">Code: {item.code} | Cost: GHS{item?.sellingPrice?.toFixed(2) }</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                   
                  </div>

                  {/* Quantity Input */}
                  {(prop.transactionActionType.toLocaleLowerCase() === "purchase") && <div className="space-y-1">
                    <Label htmlFor="quantity" className="text-xs sm:text-sm text-foreground">Price (optional)</Label>
                    <Input
                      id="price"
                      value={formatNumberWithCommas(unitPrice.toString() ||"")}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="bg-secondary border-border text-xs sm:text-sm"
                      style={{textAlign:"right"}}
                      placeholder="Qty"
                    />
                  </div>}

                  <div className="space-y-1">
                    <Label htmlFor="quantity" className="text-xs sm:text-sm text-foreground">Quantity</Label>
                    <Input
                      id="quantity"
                      value={formatNumberWithCommas(quantity)}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="bg-secondary border-border text-xs sm:text-sm"
                      style={{textAlign:"right"}}
                      placeholder="Qty"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="space-y-1 flex items-end h-15">
                    <Button 
                      onClick={addToCart}
                      disabled={!selectedItem || !quantity}
                      className="w-full text-xs sm:text-sm"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Add 
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Order Table */}
            <Card className="border-border">
              <CardHeader className="border-b border-border h-5 mt-[-20px] ">
                <div className="flex items-center">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-sm sm:text-lg font-semibold ml-2">
                    {cart.length} {cart.length === 1 ? "item" : "items"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:h-[calc(100vh-420px)] overflow-auto">
                {cart.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm sm:text-base text-muted-foreground">No items in purchase order</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Add items using the form above</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="p-0 sm:h-[calc(100vh-420px)] overflow-auto">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-muted-foreground">Item</th>
                          <th className="text-right p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-muted-foreground">Unit Price</th>
                          <th className="text-right p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="text-right p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-muted-foreground">Total</th>
                          <th className="text-right p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((cartItem, index) => (
                          <tr key={cartItem.item.id} className="border-b border-border hover:bg-secondary/50">
                            <td className="p-1 sm:p-2 text-left">
                              <div className="text-xs sm:text-sm">{cartItem.item.name}</div>
                              <div className="text-[10px] sm:text-xs font-bold text-gray-500">{cartItem.item.code}</div>
                            </td>
                            <td className="p-1 sm:p-2 text-xs sm:text-sm text-right">
                              {formatNumberWithCommas(cartItem?.price?.toString())}
                            </td>
                            <td className="p-1 sm:p-2 text-xs sm:text-sm text-right">
                              {formatNumberWithCommas(cartItem?.quantity?.toString())}
                            </td>
                            <td className="p-1 sm:p-2 text-xs sm:text-sm text-right font-semibold">
                              {formatNumberWithCommas((cartItem.quantity * cartItem.price).toFixed(2))}
                            </td>
                            <td className="p-1 sm:p-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(index)}
                                className="h-7 w-7 sm:h-8 sm:w-8"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
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

          {/* Right Column - Supplier and Purchase Actions */}
          <div className="space-y-0">
            <Card className="border-border p-2">
              <CardContent className="p-0 space-y-2">
                {/* Amount Paid Input - Hidden for Stock Transfer */}
                {!isStockTransfer && (
                  <div className="space-y-1">
                    <Label htmlFor="amountPaid" className="text-xs sm:text-sm text-foreground">Amount Paid <span className="text-destructive">*</span></Label> 
                    <Input
                      id="amountPaid"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(formatNumberWithCommas(e.target.value))}
                      className="bg-secondary border-border text-xs sm:text-sm"
                      style={{textAlign:"right"}}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* Coupon Input - Hidden for Stock Transfer */}
                {!isStockTransfer && prop?.transactionActionType.toLocaleLowerCase().trim() == "sale" && (
                  <div className="space-y-1">
                    <Label htmlFor="coupon" className="text-xs sm:text-sm text-foreground flex items-center gap-1 sm:gap-2">
                      <Ticket className="w-3 h-3 sm:w-4 sm:h-4" />
                      Coupon Code
                    </Label>
                    <div className="relative">
                      <Input
                        id="coupon"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            validateCoupon(e.target.value.trim());
                          }
                        }}
                        placeholder="Enter coupon code"
                        className={`bg-secondary border-border uppercase text-xs sm:text-sm ${
                          couponError ? 'border-destructive' : 
                          couponData ? 'border-green-500' : ''
                        }`}
                        disabled={cart.length === 0}
                      />
                      {isCheckingCoupon && (
                        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {couponData && !couponError && (
                        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-[10px] sm:text-xs text-destructive mt-0.5">{couponError}</p>
                    )}
                    {couponData && !couponError && (
                      <p className="text-[10px] sm:text-xs text-green-600 mt-0.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formatNumberWithCommas(couponData.amount?.toString())} discount applied
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Method - Hidden for Stock Transfer */}
                {!isStockTransfer && (
                  <div className="space-y-1">
                    <Label htmlFor="paymentMethod" className="text-xs sm:text-sm text-foreground">Payment Method <span className="text-destructive">*</span></Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger className="bg-secondary border-border w-full text-xs sm:text-sm">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            <div className="flex flex-col">
                              <span className="text-sm">{item.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date */}
                <div className="space-y-1">
                  <Label htmlFor="hireDate" className="text-xs sm:text-sm text-foreground">Date <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Calendar className="absolute left-2 sm:left-3 top-1/3 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                    <Input
                      id="date"
                      readOnly={true}
                      value={alphaNumericDate(date)}
                      onClick={() => dateRef.current?.showPicker()}
                      className="pl-7 sm:pl-10 bg-secondary border-border text-xs sm:text-sm"
                      required
                    />
                    <Input
                      ref={dateRef}
                      style={{height: "0px", width: "0px", padding:"0px", margin:"0px"}}
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required={!date}
                      max={new Date().toISOString().split('T')[0]}
                    /> 
                  </div>
                </div>

                <hr className="my-2"/>

                {/* Total Display */}
                <div className="bg-secondary rounded-lg p-2 sm:p-4 space-y-1 sm:space-y-2">
                  <div className="border-border pt-1 sm:pt-2">
                    <div className="flex justify-between text-sm sm:text-lg font-bold">
                      <span className="text-xs sm:text-sm">Total:</span>
                      <span className="text-primary text-xs sm:text-sm md:text-lg">{formatNumberWithCommas(cartTotal.toFixed(2))}</span>
                    </div>
                  </div>

                  {couponData && !couponError && !isStockTransfer && (
                    <div className="flex justify-between text-xs sm:text-sm text-green-600">
                      <span>Discount:</span>
                      <span>- {formatNumberWithCommas(couponData.amount?.toFixed(2))}</span>
                    </div>
                  )}

                  {!isStockTransfer && (
                    <div className="border-t border-border pt-1 sm:pt-2">
                      <div className="flex justify-between text-sm sm:text-lg font-bold">
                        <span className="text-xs sm:text-sm">{cartTotal - Number(removeCommasFromNumbers(amountPaid)) > 0 ? "Debt" : "Balance"}:</span>
                        <span className="text-xs sm:text-sm md:text-lg" style={{color: cartTotal - Number(removeCommasFromNumbers(amountPaid)) > 0 ? "red" : "blue"}}>
                          {amountPaid && formatNumberWithCommas(parseFloat((cartTotal - Number(removeCommasFromNumbers(amountPaid))).toString()).toFixed(2))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-success hover:bg-success/90 text-xs sm:text-sm"
                    onClick={() => {
                      // Modified validation for stock transfer
                      if (!prop?.businessPartnerValue || cart.length === 0 || !date) {
                        toast.warning({
                          title: 'Missing required fields',
                          description: isStockTransfer ? 'Please add items and select a date' : 'Please add items, select a date, and enter payment details',
                        });
                        return;
                      }
                      
                      // For non-stock transfer, require amount paid and payment method
                      if (!isStockTransfer && (!amountPaid || !selectedPaymentMethod)) {
                        toast.warning({
                          title: 'Payment details required',
                          description: 'Please enter amount paid and select payment method',
                        });
                        return;
                      }
                      
                      setModalOpen(true);
                    }}
                    disabled={
                      !prop?.businessPartnerValue || 
                      cart.length === 0 || 
                      !date || 
                      (!isStockTransfer && (!amountPaid || !selectedPaymentMethod))
                    }
                  >
                    <Banknote className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Submit
                  </Button>
                  
                  <Button
                    className="w-full bg-warning hover:bg-warning/90 text-warning-foreground text-xs sm:text-sm"
                    onClick={() => {
                      setCart([]);
                      setSelectedItem("");
                      setQuantity("");
                      setAmountPaid("");
                      setSelectedPaymentMethod("");
                      setDate("");
                      setCouponCode("");
                      setCouponData(null);
                      setCouponError("");
                      setStockLevel(null);
                    }}
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={"Complete " + prop?.transactionActionType}
        description="Review your purchase order before completing"
      >
        <div className="space-y-4">
          <Card className="bg-secondary">
            <CardContent className="p-3 sm:p-4">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">{prop?.transactionActionType} Order Summary</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                {prop.businessPartnerName ? prop?.businessPartnerName : (suppliers).find((s) => s.id === prop?.businessPartnerValue)?.supplierCompanyName}
              </p>
              <div className="space-y-1 max-h-40 overflow-auto">
                {cart.map((c) => (
                  <div key={c.item.id} className="flex justify-between text-xs sm:text-sm">
                    <span>
                      {c.item.name} x {c.quantity}
                    </span>
                    <span>GHS {formatNumberWithCommas((c.quantity * c.price).toFixed(2))}</span>
                  </div>
                ))}
              </div>
              
              {couponData && !couponError && !isStockTransfer && (
                <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>- GHS {formatNumberWithCommas(couponData.amount?.toFixed(2))}</span>
                </div>
              )}
              
              <div className="border-t border-border mt-2 pt-2 flex justify-between font-bold text-sm sm:text-base">
                <span>Total</span>
                <span className="text-primary">GHS {formatNumberWithCommas(cartTotal.toFixed(2))}</span>
              </div>
              
              {couponData && !couponError && !isStockTransfer && (
                <div className="border-t border-border mt-2 pt-2 flex justify-between font-bold text-sm sm:text-base">
                  <span>Net Total</span>
                  <span className="text-primary">GHS {formatNumberWithCommas((cartTotal - couponData.amount).toFixed(2))}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {!isStockTransfer && (
            <div className="p-3 bg-warning/20 text-warning-foreground rounded-lg">
              <p className="text-xs sm:text-sm">
                This transaction will be recorded as {cartTotal - Number(removeCommasFromNumbers(amountPaid)) > 0 ? <b>UNDER PAID</b> : <b>FULLY PAID</b>} with amount <b>GHS{formatNumberWithCommas(parseFloat(removeCommasFromNumbers(amountPaid).toString()).toFixed(2))}</b> paid for a of total {formatNumberWithCommas(parseFloat(cartTotal.toString()).toFixed(2))} .... <b style={removeCommasFromNumbers(amountPaid) > removeCommasFromNumbers(cartTotal.toString()) ? {color:"blue"} : {color:"red"}}>{removeCommasFromNumbers(amountPaid) > removeCommasFromNumbers(cartTotal.toString()) ? "Balance" : "Debt"} : {formatNumberWithCommas(parseFloat((cartTotal - Number(removeCommasFromNumbers(amountPaid))).toString()).toFixed(2))}</b>
              </p>
            </div>
          )}

          {isStockTransfer && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800">
                This is a stock transfer transaction. No payment is required.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-success hover:bg-success/90 w-full sm:w-auto text-xs sm:text-sm"
            >
              Complete {prop?.transactionActionType}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}