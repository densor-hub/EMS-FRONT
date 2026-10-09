'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Ticket, Hash, Calendar, Lock, Unlock, Copy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { formatNumberWithCommas, removeCommasFromNumbers, numericCurrentDate, numericDate, lastDayOfYear } from '@/helpers/formatStrings';
import { useToaster } from '@/components/util/CustomToast';
import { sessionStore } from '@/helpers/formatStrings';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import SweetAlert from '@/components/util/SweetAlert';
import { config } from '@/components/util/AppConfig';

interface GeneratedCoupon {
  id: string;
  code: string;
  amount: number;
  used: boolean;
  expiryDate: string;
  status?: boolean;
}

export default function CouponsPage() {
  const sessionShop = sessionStore.get('selectedShop');
  const { selectedShop } = useAuth();
  const toast = useToaster();

  const shopId = selectedShop || sessionShop;

  const [coupons, setCoupons] = useState<GeneratedCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<GeneratedCoupon | null>(null);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);

  // SweetAlert confirmation state for updates
  const [showAlert, setShowAlert] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    id: string;
    status: boolean;
    expiryDate: string;
    amount: number;
  } | null>(null);

  // Generate form state
  const [amount, setAmount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');

  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editStatus, setEditStatus] = useState(true);

  useEffect(() => {
    if (shopId) loadCoupons();
  }, [shopId, showUnusedOnly]);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get(
        `/Coupon/${shopId}?status=${showUnusedOnly}`
      );
      setCoupons(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading coupons:', error);
      toast.warning({
        title: 'Failed to load coupons',
        description: error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setExpiryDate('');
    setQuantity('');
    setEditingCoupon(null);
    setEditAmount('');
    setEditExpiryDate('');
    setEditStatus(true);
  };

  const openModal = (coupon?: GeneratedCoupon) => {
    if (coupon) {
      if (coupon.used) {
        toast.info({
          title: 'Used coupon',
          description: 'Used coupons cannot be edited.',
        });
        return;
      }
      setEditingCoupon(coupon);
      setEditAmount(formatNumberWithCommas(coupon.amount.toString()));
      setEditExpiryDate(coupon.expiryDate.split('T')[0]);
      setEditStatus(coupon.status ?? true);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCoupon) {
      // Build the payload, then open the confirmation alert
      const amountValue = parseFloat(removeCommasFromNumbers(editAmount).toString());
      if (isNaN(amountValue) || amountValue <= 0) {
        toast.warning({
          title: 'Invalid amount',
          description: 'Enter a valid coupon amount.',
        });
        return;
      }
      if (!editExpiryDate) {
        toast.warning({
          title: 'Missing expiry date',
          description: 'Select an expiry date.',
        });
        return;
      }

      setPendingUpdate({
        id: editingCoupon.id,
        status: editStatus,
        expiryDate: new Date(`${editExpiryDate}T23:59:59.999`).toISOString(),
        amount: amountValue,
      });
      setShowAlert(true);
    } else {
      await generateCoupons();
    }
  };

  // Called by SweetAlert's confirm button
  const confirmUpdate = async () => {
    const payload = pendingUpdate;
    setShowAlert(false);
    setPendingUpdate(null);
    if (!payload) return;

    setIsLoading(true);
    try {
      await axiosInstance.put('/Coupon', payload);
      await loadCoupons();
      setIsModalOpen(false);
      resetForm();

      toast.success({
        title: 'Coupon updated',
        description: 'Changes saved successfully',
      });
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      toast.warning({
        title: 'Failed to update coupon',
        description: error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCoupons = async () => {
      const qty = parseInt(removeCommasFromNumbers(quantity).toString(), 10);
  if (!qty || qty < 1) {
    toast.warning({
      title: 'Invalid quantity',
      description: 'Enter at least 1 coupon to generate.',
    });
    return;
    }

    const amountValue = parseFloat(removeCommasFromNumbers(amount).toString());
  if (isNaN(amountValue) || amountValue <= 0) {
    toast.warning({
      title: 'Invalid amount',
      description: 'Enter a valid coupon amount.',
    });
    return;
  }

     if (!expiryDate) {
    toast.warning({
      title: 'Missing expiry date',
      description: 'Select an expiry date.',
    });
    return;
  }

     const couponAmounts = Array.from({ length: qty }, () => ({
    amount: amountValue,
    expiryDate: new Date(`${expiryDate}T23:59:59.999`).toISOString(),
  }));

   setIsLoading(true);
  try {
    await axiosInstance.post('/Coupon', {
      couponAmounts,
      locationId: shopId,
    });
    await loadCoupons();
    setIsModalOpen(false);
    resetForm();

    toast.success({
      title: 'Coupons generated',
      description: `${qty} coupon${qty > 1 ? 's' : ''} created successfully`,
    });
  } catch (error: any) {
    console.error('Error generating coupons:', error);
    toast.warning({
      title: 'Failed to generate coupons',
      description: error?.response?.data?.message || 'Please try again later',
    });
  } finally {
    setIsLoading(false);
  }
};

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success({ title: 'Copied', description: code });
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: config.currency,
    }).format(value);

  const columns = [
    {
      key: 'code' as keyof GeneratedCoupon,
      label: 'Code',
      sortable: true,
      render: (coupon: GeneratedCoupon) => (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-medium">{coupon.code}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyCode(coupon.code);
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Copy code"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'amount' as keyof GeneratedCoupon,
      label: 'Amount',
      sortable: true,
      render: (coupon: GeneratedCoupon) => (
        <span className="font-medium text-foreground">
          {formatCurrency(coupon.amount)}
        </span>
      ),
    },
    {
      key: 'expiryDate' as keyof GeneratedCoupon,
      label: 'Expires',
      sortable: true,
      render: (coupon: GeneratedCoupon) => {
        const expired = isExpired(coupon.expiryDate);
        return (
          <span className={expired ? 'text-red-500' : 'text-muted-foreground'}>
            {new Date(coupon.expiryDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            {expired && ' (expired)'}
          </span>
        );
      },
    },
    {
      key: 'used' as keyof GeneratedCoupon,
      label: 'Status',
      render: (coupon: GeneratedCoupon) => (
        <Badge
          className={
            coupon.used
              ? 'bg-muted text-muted-foreground'
              : isExpired(coupon.expiryDate)
                ? 'bg-red-100 text-red-600'
                : 'bg-success/20 text-success'
          }
        >
          {coupon.used ? 'Used' : isExpired(coupon.expiryDate) ? 'Expired' : 'Active'}
        </Badge>
      ),
    }
  ];

  return (
    <div className="min-h-screen">
      {isLoading && <LoadingOverlay />}
      <Header title="Coupons" description="Generate and manage discount coupons" />

      <div className="m-2 space-y-3">
        <div className="flex items-center gap-3 rounded-md border border-border bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <Switch
              id="unusedOnly"
              checked={showUnusedOnly}
              onCheckedChange={setShowUnusedOnly}
            />
            <Label htmlFor="unusedOnly" className="cursor-pointer text-xs">
              Show unused only
            </Label>
          </div>
        </div>

        <DataTable
          title="All Coupons"
          data={coupons}
          columns={columns}
          searchKey="code"
          onAdd={() => openModal()}
          addLabel="Generate Coupons"
          emptyMessage="No coupons found. Generate your first batch."
          height="h-[calc(100vh-260px)] sm:h-[calc(100vh-238px)]"
          onRowClick={(coupon) => openModal(coupon)}
        />
      </div>

      {/* Generate / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingCoupon ? 'Edit Coupon' : 'Generate Coupons'}
        description={
          editingCoupon
            ? `Update coupon ${editingCoupon.code}`
            : 'Create one or more coupons in a single batch'
        }
        size="lg"
      >
       <form onSubmit={handleSubmit} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="amount" className="text-foreground">
      Coupon Amount ({config.currency}) *
    </Label>
    <div className="relative">
      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id="amount"
        value={editingCoupon ? editAmount : amount}
        onChange={(e) => {
          const formatted = formatNumberWithCommas(e.target.value);
          editingCoupon ? setEditAmount(formatted) : setAmount(formatted);
        }}
        placeholder="Enter Amount"
        className="pl-10 bg-white border-border text-right"
        required
      />
    </div>
  </div>

  <div className="space-y-2">
    <Label htmlFor="expiryDate" className="text-foreground">
      Expiry Date *
    </Label>
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id="expiryDate"
        type="date"
        value={editingCoupon ? editExpiryDate : expiryDate}
        onChange={(e) =>
          editingCoupon
            ? setEditExpiryDate(e.target.value)
            : setExpiryDate(e.target.value)
        }
        className="pl-10 bg-white border-border"
        required
        min={numericCurrentDate('yyyy-mm-dd')}
        max={lastDayOfYear(new Date())}
      />
    </div>
  </div>

  {!editingCoupon && (
    <div className="space-y-2">
      <Label htmlFor="quantity" className="text-foreground">
        Number of Coupons to Generate *
      </Label>
      <Input
        id="quantity"
        type="text"
        inputMode="numeric"
        value={quantity}
        onChange={(e) => setQuantity(formatNumberWithCommas(e.target.value))}
        placeholder="Enter Quantity"
        className="bg-white border-border text-right"
        required
      />
      <p className="text-xs text-muted-foreground">
        Each coupon gets a unique code. All will have the same amount
        and expiry date.
      </p>
    </div>
  )}

  {editingCoupon && (
    <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
      <div>
        <Label htmlFor="editStatus" className="text-foreground">
          Active Status
        </Label>
        <p className="text-xs text-muted-foreground">
          Inactive coupons cannot be redeemed
        </p>
      </div>
      <Switch
        id="editStatus"
        checked={editStatus}
        onCheckedChange={setEditStatus}
      />
    </div>
  )}

  <div className="flex justify-end gap-3 pt-4">
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setIsModalOpen(false);
        resetForm();
      }}
    >
      Cancel
    </Button>
    <Button
      type="submit"
      className="bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {editingCoupon ? 'Update Coupon' : 'Generate Coupons'}
    </Button>
  </div>
</form>
      </Modal>

      {/* Confirm update */}
      <SweetAlert
        isOpen={showAlert}
        onClose={() => {
          setShowAlert(false);
          setPendingUpdate(null);
        }}
        onConfirm={confirmUpdate}
        onCancel={() => {
          setShowAlert(false);
          setPendingUpdate(null);
        }}
        type="warning"
        title="Save Changes?"
        message={
          editingCoupon
            ? `Update coupon "${editingCoupon.code}"? This will change the amount, expiry date, and status.`
            : 'Save these changes?'
        }
        confirmText="Yes, Update"
        showCancelButton={true}
        showCloseButton={false}
      />

      {toast.ToastComponent}
    </div>
  );
}