import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dispatch, SetStateAction } from 'react';
import { CartItem, Transaction, TransactionItem } from '@/lib/types';
import { useToaster } from '@/components/util/CustomToast';
import { getRemainingQuantity,  getOriginalRemainingQuantity, getDeliveredQuantity,  formatNumberWithCommas, removeCommasFromNumbers, toastErrors } from '@/helpers/formatStrings';
import { Plus } from 'lucide-react';
// import { ItemStockLevelDTO } from '@/lib/types';
// import { useAuth } from '@/lib/auth-context';
// import axiosInstance from '@/lib/customAxios';

interface iTransactionItemSelection {
    selectedItem: string;
    setSelectedItem: Dispatch<SetStateAction<string>>;
    selectedTransaction?: Partial<Transaction>;
    isStockTransfer: boolean;
    quantity: string;
    setQuantity: Dispatch<SetStateAction<string>>;
    cart: CartItem[];
    setCart: Dispatch<SetStateAction<CartItem[]>>
    transactionActionType: string | undefined;
   //  stockLevel: ItemStockLevelDTO | null;
}

const TransactionItemSelection = (props: iTransactionItemSelection) => {
    const toast = useToaster()


    // Get available items (items with remaining quantity > 0, factoring in cart)
    const availableItems = props?.selectedTransaction?.items?.filter(
        (item) => getRemainingQuantity(item, props.isStockTransfer, props?.selectedTransaction?.supplierId || "", props?.cart) > 0
    ) || [];

   // FIX: Move the addToCart logic into a useCallback function
     const addToCart = useCallback(() => {
       const item = props?.selectedTransaction?.items?.find(i => i.itemId === props?.selectedItem || i.id === props?.selectedItem);
       
       if (!item) {
         toast.warning({
           title: 'Item not found',
           description: 'Selected item could not be found',
         });
         return;
       }
   
       const remainingQty = getRemainingQuantity(item, props?.isStockTransfer, props?.selectedTransaction?.supplierId || "", props?.cart);
       const qtyToDeliver = parseFloat(removeCommasFromNumbers(props?.quantity)?.toString());
       
       if (qtyToDeliver > remainingQty) {
        toastErrors(toast,`Quantity ${qtyToDeliver} exceeds remaining quantity (${remainingQty})` )
        //  toast.warning({
        //    title: 'Quantity exceeds remaining',
        //    description: ,
        //  });
         return;
       }
   
       if (qtyToDeliver <= 0) {
         toastErrors(toast,'Quantity must be greater than 0')
        //  toast.warning({
        //    title: 'Invalid quantity',
        //    description: 'Quantity must be greater than 0',
        //  });
         return;
       }
   
       const existingIndex = props?.cart.findIndex((c) => c.id === item.itemId);
   
       if (existingIndex >= 0) {
         // Update existing cart item
         const newCart = [...props?.cart];
         const totalDelivering = (newCart[existingIndex]?.receivingQuantity || 0) + qtyToDeliver;
         
         if (totalDelivering > getOriginalRemainingQuantity(item, props?.isStockTransfer, props?.selectedTransaction?.supplierId || "")) {
           toast.warning({
             title: 'Exceeds remaining quantity',
             description: `Total delivering (${totalDelivering}) exceeds remaining quantity (${getOriginalRemainingQuantity(item, props?.isStockTransfer, props?.selectedTransaction?.supplierId || "")})`,
           });
           return;
         }
         
         newCart[existingIndex].receivingQuantity = totalDelivering;
         newCart[existingIndex].remainingQuantity = getOriginalRemainingQuantity(item, props?.isStockTransfer, props?.selectedTransaction?.supplierId || "") - totalDelivering;
         props?.setCart(newCart);
       } else {
         // Add new item to cart
         props?.setCart([...props?.cart, {
           id: item.itemId,
           name: item.name || item.itemName,
           code: item.code || '',
        //    costPrice: item.costPrice || 0,
           price: item.unitPrice || 0,
           quantity: item.quantity || 0,
           deliveredQuantity: getDeliveredQuantity(item, props?.isStockTransfer, props?.selectedTransaction?.supplierId || ""),
           receivingQuantity: qtyToDeliver,
           remainingQuantity: getOriginalRemainingQuantity(item, props?.isStockTransfer, props?.selectedTransaction?.supplierId || "") - qtyToDeliver,
         }]);
       }
   
       // Reset form
       props?.setSelectedItem("");
       props?.setQuantity("");
     }, [props?.selectedItem, props?.quantity, props?.cart, props?.selectedTransaction, props?.isStockTransfer, toast]);


     //console.log(props.transactionActionType)
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-1">
                {/* Item Selection Dropdown */}
                <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="item" className="text-xs sm:text-sm text-foreground">Select Item</Label>
                    <Select value={props.selectedItem} onValueChange={props.setSelectedItem}>
                        <SelectTrigger className="bg-white border-border w-full text-xs sm:text-sm">
                            <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableItems.length === 0 ? (
                                <div className="p-2 text-center text-sm text-gray-500">
                                    No items available for delivery
                                </div>
                            ) : (
                                availableItems.map((item) => {
                                    const remaining = getRemainingQuantity(
                                        item,
                                        props?.isStockTransfer,
                                        props?.selectedTransaction?.supplierId || "",
                                        props?.cart
                                    );
                                    return (
                                        <SelectItem key={ item.itemId} value={ item.itemId}>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{item.name || item.itemName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {/* Code: {item.code} | Remaining: {remaining} | Price: GHS{item?.unitPrice?.toFixed(2)} */}
                                                    { "Price " + item?.unitPrice?.toFixed(2) }
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Quantity Remaining */}
                <div className="space-y-1">
                    <Label htmlFor="quantityRemaining" className="text-xs sm:text-sm text-foreground">Remaining Qty</Label>
                    <Input
                        id="quantityRemaining"
                        // type="tring"
                        // min="1"
                        value={ formatNumberWithCommas((availableItems?.some(x=> x.itemId == props.selectedItem) ? getRemainingQuantity(
                                        availableItems.find(x=> x.itemId == props.selectedItem)!,
                                        props?.isStockTransfer,
                                        props?.selectedTransaction?.supplierId || "",
                                        props?.cart
                                    ): 0)?.toString())}
                        className="bg-secondary text-right border-border text-xs sm:text-sm"
                        readOnly={true}
                        style={{ color: "blue", fontWeight: "bold" }}
                    />
                </div>

                {/* Quantity Input */}
                <div className="space-y-1">
                    <Label htmlFor="quantity" className="text-xs sm:text-sm text-foreground">
                        {props?.transactionActionType === "SALE" ? "Delivery Qty" : "Receiving Qty"}
                    </Label>
                    <Input
                        id="quantity"
                        value={formatNumberWithCommas(props.quantity)}
                        onChange={(e) => props.setQuantity(e.target.value)}
                        placeholder="1"
                        className=" border-border text-xs sm:text-sm"
                        style={{ textAlign: "right" }}
                        disabled={false}
                    />
                </div>
            </div>
            <div className="space-y-1 flex justify-end">
                <Button
                    onClick={addToCart}
                    disabled={!props?.selectedItem || !props?.quantity || availableItems.length === 0}
                    className="w-30 text-xs sm:text-sm"
                >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Add
                </Button>
            </div>
            {toast.ToastComponent}
        </>
    );
};

export default TransactionItemSelection;