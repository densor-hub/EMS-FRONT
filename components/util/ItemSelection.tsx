// components/ItemSelection.tsx
"use client";

import React, { Dispatch, SetStateAction } from "react";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Item, ItemStockLevelDTO } from "@/lib/types";
import { formatNumberWithCommas } from "@/helpers/formatStrings";
import { CustomSelect } from "./CustomSelect";
import { config } from "./AppConfig";

interface ItemSelectionProps {
  items: Item[];
  selectedItem: string;
  setSelectedItem: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  stockLevel: ItemStockLevelDTO | null;
  //setStockLevel?: (level: ItemStockLevelDTO | null) => void;
  isStockLevelLoading?: boolean;
  disableCartAdition?: boolean;
  errors?: Record<string, string>;
  onAddItem?: () => void;
  transactionActionType?: string;
  price?: string;
  setPrice?: Dispatch<SetStateAction<string>>;
}

export function ItemSelection({
  items,
  selectedItem,
  setSelectedItem,
  quantity,
  setQuantity,
  stockLevel,
  isStockLevelLoading = false,
  disableCartAdition = false,
  errors = {},
  onAddItem,
  price,
  setPrice,
  transactionActionType = "SALE"
}: ItemSelectionProps) {
  // Get selected item details
  const selectedItemDetails = items.find(i => i.id === selectedItem);
  const isPurchase = transactionActionType?.toUpperCase().trim() === "PURCHASE";
  const isSale = transactionActionType?.toUpperCase().trim() === "SALE";
  const isStock = transactionActionType?.toUpperCase().trim() === "STOCK";
   const isTrans = transactionActionType?.toUpperCase().trim() === "TRANS";
  
  // Get available quantity from stock level
  const availableQty = stockLevel?.availableQuantity ?? 0;

  // ✅ Determine the price to display
  const getDisplayPrice = () => {
    if (isPurchase) {
      // ✅ For purchases: show the entered price (if any)
      return price ? formatNumberWithCommas(price) : '';
    } else {
      // ✅ For sales: show the selling price
      return selectedItemDetails 
        ? `${config?.currency} ${formatNumberWithCommas(selectedItemDetails.sellingPrice.toString())}` 
        : '';
    }
  };

  // ✅ Determine if price should be editable
  const isPriceEditable = isPurchase;

  // ✅ Determine price input className
  const getPriceClassName = () => {
    if (isPurchase) {
      return "bg-white border-border text-right";
    } else {
      return "bg-primary/10 border-primary/30 text-primary font-bold text-right cursor-not-allowed";
    }
  };

  // ✅ 
  //  price change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPurchase && setPrice) {
      // Only allow numbers and decimal
      const value = e.target.value.replace(/[^0-9.]/g, '');
      setPrice(value);
    }
  };

  // ✅ Handle quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isStock) {
      // Only allow numbers
      const value = e.target.value.replace(/[^0-9]/g, '');
      setQuantity(value);
    }
  };

  // ✅ Determine if Add button should be disabled
  const isAddDisabled = () => {
    if (!selectedItem) return true;
    if (disableCartAdition) return true;
    if (isStockLevelLoading) return true;
    
    if (isStock) {
      // For stock: just need an item selected
      return false;
    }
    
    if (isTrans && quantity) {
      // For stock: just need an item selected
      return false;
    }
    

    if (isPurchase) {
      // ✅ For purchase: need quantity AND price
      const qty = parseInt(quantity);
      const priceNum = parseFloat(price || '0');
      return !quantity || qty <= 0 || !price || priceNum <= 0;
    }
    
    // For sale: need quantity
    const qty = parseInt(quantity);
    return !quantity || qty <= 0 || (stockLevel?.availableQuantity === 0);
  };

  // ✅ Get button text
  const getButtonText = () => {
    if (isStockLevelLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Checking stock...
        </>
      );
    }
    
    if (isStock) {
      return (
        <>
          <Plus className="w-4 h-4 mr-2" />
          Add to Stock Take
        </>
      );
    }
    
    return (
      <>
        <Plus className="w-4 h-4 mr-2" />
        Add to Cart
      </>
    );
  };

  return (
    <Card className="border-border p-3">
      <CardContent className="">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          {/* Item Selection - col-span-4 */}
          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="item" className="text-foreground">
              Select Item <span className="text-destructive">*</span>
            </Label>
            <CustomSelect
              options={items?.map((x) => ({
                value: x.id.toString(),
                label: x.name,
                discriptionLabel: `${config.currency} ${formatNumberWithCommas(x.sellingPrice.toString())}`
              }))}
              value={selectedItem}
              onValueChange={setSelectedItem}
              placeholder="Select Item"
              required={true}
              searchable={true}
              clearable={true}
              size="md"
            />
            {errors.selectedItem && (
              <p className="text-sm text-destructive mt-1">{errors.selectedItem}</p>
            )}
          </div>

          <div className="flex gap-2 w-full md:col-span-2">
            {/* Quantity Input - col-span-1 */}
            <div className="space-y-2 md:col-span-1 w-full">
              <Label htmlFor="quantity" className="text-foreground">
                {isStock ? 'Available' : 'Qty'}
                {!isStock && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="quantity"
                value={isStock ? (stockLevel ? formatNumberWithCommas(availableQty.toString()) : '') : formatNumberWithCommas(quantity)}
                onChange={handleQuantityChange}
                placeholder={isStock ? 'Stock Level' : '0'}
                className={`${
                  isStock 
                    ? 'bg-blue-200 border-blue-300 font-medium font-bold cursor-not-allowed' 
                    : 'bg-white border-border'
                } border-border text-right ${errors.quantity ? 'border-destructive' : ''}`}
                aria-invalid={!!errors.quantity}
                readOnly={isStock}
                disabled={isStock || !selectedItem || isStockLevelLoading}
              />
              {errors.quantity && !isStock && (
                <p className="text-sm text-destructive mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* ✅ Price Input - col-span-1 */}
            <div className="space-y-2 md:col-span-1 w-full">
              <Label className="text-foreground">
                Price <span className="text-muted-foreground">{config?.currency}</span>
                {isPurchase && <span className="text-destructive">*</span>}
              </Label>
              <Input
                value={getDisplayPrice()}
                readOnly={!isPriceEditable}
                className={getPriceClassName()}
                placeholder={isPurchase ? 'Enter price' : ''}
                onChange={handlePriceChange}
                disabled={!selectedItem || isStockLevelLoading}
              />
            </div>
          </div>
        </div>

        {/* Add Button - Full width */}
        <div className="mt-3">
          <Button 
            onClick={onAddItem}
            disabled={isAddDisabled()}
            className="w-full"
          >
            {getButtonText()}
          </Button>
        </div>

        {/* Stock Level Status */}
        <div className="h-6">
          {selectedItem && (
            <div className="mt-1">
              {isStockLevelLoading ? (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking stock availability...
                </div>
              ) : stockLevel ? (
                <div className={`flex items-center gap-2 text-sm ${stockLevel.availableQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {stockLevel.availableQuantity} available
                    {stockLevel.availableQuantity === 0 && (
                      <span className="ml-1 font-semibold">(Out of stock)</span>
                    )}
                    {(stockLevel.actualQuantity <= stockLevel.reorderLevel) && stockLevel.availableQuantity > 0 && (
                      <span className="ml-1 text-yellow-600 font-semibold">
                        (Actual Qty : {stockLevel.actualQuantity})
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  No stock information available
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ItemSelection;