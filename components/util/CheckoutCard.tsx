'use client';

import React, { useCallback, memo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Ticket, CheckCircle, X, Calendar } from 'lucide-react';
import { currency, formatNumberWithCommas, readCachedSettings } from '@/helpers/formatStrings';
import { config, paymentMethods, settings } from './AppConfig';
import { CustomSelect } from './CustomSelect';

// ✅ Computed ONCE at module scope — never a new array reference per render.
// This is the primary kill-switch for the "Maximum update depth exceeded"
// loop when a CustomSelect re-runs an internal effect on `options` identity.
const PAYMENT_METHOD_OPTIONS = paymentMethods.map((x) => ({
  value: x.id.toString(),
  label: x.name,
}));

interface CheckoutCardProps {
  transactionType?: string;
  instantSale?: boolean;
  hasBusinessPartner ?: boolean;
  date?: string;
  onDateChange?: (value: string) => void;
  dateError?: string;
  datePlaceholder?: string;
  cartTotal: number;
  amountPaid?: string;
  onAmountPaidChange?: (value: string) => void;
  amountPaidError?: string;
  amountPaidPlaceholder?: string;
  showCoupon?: boolean;
  showPayment: boolean;
  showDate? : boolean;
  showMinPaymentThreshold?: boolean;
  couponCode?: string;
  onCouponChange?: (value: string) => void;
  onCouponBlur?: (value: string) => void;
  couponError?: string;
  couponData?: { amount: number; code: string } | null;
  isCheckingCoupon?: boolean;
  couponPlaceholder?: string;
  selectedPaymentMethod?: string;
  onPaymentMethodChange?: (value: string) => void;
  paymentMethodError?: string;
  paymentMethodPlaceholder?: string;
  couponAmount?: number;
  balance?: number;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isCheckOutValid: boolean;
  cartEmpty?: boolean;
  loading?: boolean;
  className?: string;
  height?: string;
  allowPaymentInfo?: boolean;
}

export const CheckoutCard: React.FC<CheckoutCardProps> = memo(({
  transactionType = '',
  instantSale,
  date,
  onDateChange,
  dateError,
  cartTotal = 0,
  amountPaid = '',
  onAmountPaidChange = () => {},
  amountPaidError = '',
  amountPaidPlaceholder = '0.00',
  showPayment,
  showDate = true,
  showMinPaymentThreshold = false,
  showCoupon = true,
  couponCode = '',
  onCouponChange = () => {},
  onCouponBlur = () => {},
  couponError = '',
  couponData = null,
  isCheckingCoupon = false,
  couponPlaceholder = 'Enter coupon code',
  selectedPaymentMethod = '',
  onPaymentMethodChange = () => {},
  paymentMethodError = '',
  paymentMethodPlaceholder = 'Select payment method',
  couponAmount = 0,
  balance = 0,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isCheckOutValid = false,
  cartEmpty = true,
  className = '',
  height = '',
  allowPaymentInfo = false,
}) => {
  const isTransfer = transactionType === config.transactionTypes.TRAN;
  const isSale = transactionType === config.transactionTypes.SALE;

  // console.log(isStockAdjustment)
  const couponApplied = !!couponData && !couponError;
  const finalTotal = Math.max(0, cartTotal - (couponAmount || 0));

  // ✅ Stable handler identity via ref — parent can pass an inline arrow
  //    without invalidating the callback, and the Input subtree won't re-mount.
  const onAmountPaidChangeRef = useRef(onAmountPaidChange);
  useEffect(() => {
    onAmountPaidChangeRef.current = onAmountPaidChange;
  }, [onAmountPaidChange]);

  const handleAmountPaidChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/,/g, '');
      // Only forward values that are strictly digits (optionally one decimal point).
      // This prevents a formatted value like "1,,0,0,0" from ever reaching the
      // parent, which would re-format and re-trigger the change.
      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
        onAmountPaidChangeRef.current(rawValue);
      }
    },
    []
  );

  return (
    !readCachedSettings()?.locationId ? <div>
      Failed to load system configurations. Please refresh page to try again later
    </div>
    : <div className={`space-y-2 p-0 ${className}`} style={{ height }}>
      <Card className="border-border h-full">
        <CardContent className="px-2 sm:px-3 space-y-3 sm:space-y-4">
          {/* TOTAL */}
          {!isTransfer && (
            <div className="text-center">
              <div className="font-bold text-xl sm:text-2xl lg:text-3xl">
                <span className="text-sm sm:text-md lg:text-lg">{readCachedSettings()?.currency} </span>
                {couponApplied ? (
                  <>
                    <span className="text-muted-foreground line-through text-base sm:text-lg lg:text-xl mr-2">
                      {currency(cartTotal?.toString() || '0')}
                    </span>
                    <span className="text-green-600 text-2xl sm:text-3xl lg:text-4xl">
                      {currency(finalTotal?.toString() || '0')}
                    </span>
                  </>
                ) : (
                  <span className="text-green-600 text-2xl sm:text-3xl lg:text-4xl">
                    {currency(cartTotal?.toString() || '0')}
                  </span>
                )}
              </div>

              {couponApplied && (
                <p className="text-xs sm:text-sm text-green-600 mt-1">
                  Coupon {currency((couponAmount || 0).toString())}
                </p>
              )}
            </div>
          )}

          {/* Amount Paid + Coupon */}
          <div className={!isTransfer  ? 'flex flex-row gap-2 sm:flex-col' : ''}>
            {showPayment && (
              <div className="w-full">
                <div>
                  <Label
                    htmlFor="amountPaid"
                    className="text-xs sm:text-sm lg:text-md text-foreground"
                  >
                    Amount Paid <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Input
                  id="amountPaid"
                  autoComplete="off"
                  value={
                    amountPaid
                      ? formatNumberWithCommas(
                          String(amountPaid).replace(/,/g, '')
                        )
                      : ''
                  }
                  onChange={handleAmountPaidChange}
                  placeholder={amountPaidPlaceholder}
                  className={`bg-white border-border text-right text-sm sm:text-md ${
                    amountPaidError ? 'border-destructive' : ''
                  }`}
                  aria-invalid={!!amountPaidError}
                  disabled={isSubmitting}
                />
                {amountPaidError && (
                  <p className="text-xs sm:text-sm text-destructive mt-0.5 sm:mt-1">
                    {amountPaidError}
                  </p>
                )}
              {showMinPaymentThreshold && <span className='text-xs'>Minimum payment : {readCachedSettings()?.minimumSalePaymentPercentage}% <span className='fond-bold text-blue-900'>({readCachedSettings()?.currency} {finalTotal > 0 ? formatNumberWithCommas(Math.round(((readCachedSettings()?.minimumSalePaymentPercentage || 0)/100) * finalTotal).toString()) : "" })</span> </span>}

              </div>
            )}
{/* !isTransfer && !isStockAdjustment  && !isPurchase && showCoupon  && allowPaymentInfo */}
            { showCoupon && (
              <div className="">
                <Label
                  htmlFor="coupon"
                  className="text-xs sm:text-sm lg:text-md text-foreground flex items-center gap-1.5 sm:gap-2"
                >
                  Coupon Code
                </Label>
                <div className="relative">
                  <Input
                    id="coupon"
                    autoComplete="off"
                    value={couponCode}
                    onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                    onBlur={(e) => onCouponBlur(e.target.value.trim())}
                    placeholder={couponPlaceholder}
                    className={`bg-white border-border uppercase text-sm sm:text-md ${
                      couponError
                        ? 'border-destructive'
                        : couponData
                        ? 'border-green-500'
                        : ''
                    }`}
                    disabled={isSubmitting || cartEmpty}
                  />
                  {isCheckingCoupon && (
                    <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {couponData && !couponError && (
                    <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                    </div>
                  )}
                </div>
                {couponError && (
                  <p className="text-xs sm:text-sm text-destructive mt-0.5 sm:mt-1">
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* DATE + PAYMENT METHOD */}
          {/* {isSale ? ( */}
            {showPayment && (
                <div className="">
                  <Label className="text-xs sm:text-sm lg:text-md text-foreground">
                    Payment Method <span className="text-destructive">*</span>
                  </Label>
                  <CustomSelect
                    options={PAYMENT_METHOD_OPTIONS}
                    value={selectedPaymentMethod}
                    onValueChange={onPaymentMethodChange}
                    placeholder="Select Payment Method"
                    required={true}
                    searchable={true}
                    clearable={true}
                    size="md"
                  />
                  {paymentMethodError && (
                    <p className="text-xs sm:text-sm text-destructive mt-0.5 sm:mt-1">
                      {paymentMethodError}
                    </p>
                  )}
                </div>
              )}
          
            <>
             {showDate && <div className="">
                <Label
                  htmlFor="date"
                  className="text-xs sm:text-sm lg:text-md text-foreground"
                >
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="date"
                    type="date"
                    value={date || ''}
                    onChange={(e) => onDateChange?.(e.target.value)}
                    className="pl-8 sm:pl-10 bg-white border-border w-full text-sm sm:text-md"
                    required={!date}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {dateError && (
                  <p className="text-xs sm:text-sm text-destructive mt-0.5 sm:mt-1">
                    {dateError}
                  </p>
                )}
              </div>}

             
            </>

          {/* Balance summary */}
          {!isTransfer && allowPaymentInfo && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="bg-secondary rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                {couponAmount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-600">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{currency(couponAmount.toString())}</span>
                  </div>
                )}

                <div className="border-t border-border pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                  <div className="flex justify-between text-sm sm:text-md lg:text-lg font-bold">
                    <span className="text-xs sm:text-sm lg:text-md">
                      {balance > 0 ? 'Debt' : 'Balance'}:
                    </span>
                    <span
                      className={`text-sm sm:text-md ${
                        balance > 0 ? 'text-destructive' : 'text-green-600'
                      }`}
                    >
                      <span className="text-2xl sm:text-2xl lg:text-2xl">
                        {currency(Math.abs(balance).toString())}
                      </span>{' '}
                      {balance > 0 ? '(Due)' : '(Change)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-row sm:flex-row lg:flex-col gap-2 pt-1 sm:pt-2">
            <Button
              className="w-[49%] lg:w-full bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm lg:text-md py-2 sm:py-2.5 lg:py-3"
              onClick={onSubmit}
              disabled={!isCheckOutValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  <span className="text-xs sm:text-sm">Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Submit</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-[49%] lg:w-full bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 text-xs sm:text-sm lg:text-md py-2 sm:py-2.5 lg:py-3"
              onClick={onCancel}
              disabled={cartEmpty || isSubmitting}
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Cancel</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

CheckoutCard.displayName = 'CheckoutCard';

export default CheckoutCard;