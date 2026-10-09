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
import type { Shop, User } from '@/lib/types';
import { Edit, Trash2, Store, MapPin, Phone, Text } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axiosInstance from '@/lib/customAxios';
import { useToaster } from '@/components/util/CustomToast';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import SweetAlert from '@/components/util/SweetAlert';

export default function ShopsPage() {
  const { user } = useAuth();
  const toast = useToaster();

  const [shops, setShops] = useState<Shop[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);

  // Delete confirmation state
  const [showAlert, setShowAlert] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!user) return;
    void loadShops();
    void loadEmployees();
  }, [user]);

  const loadShops = async () => {
    try {
      const { data } = await axiosInstance.get('/locations');
      setShops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await axiosInstance.get('/employees');
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setLocation('');
    setPhone('');
    setEmail('');
    setSelectedManager('');
    setIsActive(true);
    setEditingShop(null);
  };

  const openModal = (shop?: Shop) => {
    if (shop) {
      setEditingShop(shop);
      setName(shop.name);
      setLocation(shop.address);
      setPhone(shop.phone);
      setEmail(shop.email ?? '');
      setIsActive(shop.status);
      const firstManagerId = shop.managers?.[0]?.id
        ? String(shop.managers[0].id)
        : '';
      setSelectedManager(firstManagerId);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const processSubmission = async () => {
    // Swagger update schema expects: { id, isMainManager }
    const managerDto = selectedManager
      ? [{ id: selectedManager, isMainManager: true }]
      : [];

    if (editingShop) {
      // Flat payload — matches Swagger's update schema exactly.
      // No `dto` wrapper, no `companyId`, no `name` inside manager.
      await axiosInstance.put('/locations/Update', {
        id: editingShop.id,
        code: editingShop.code ?? '',
        name,
        address: location,
        phone,
        email,
        status: isActive,
        locationType: 1,
        managers: managerDto,
      });
    } else {
      // Create — keep whatever shape POST /locations expects.
      await axiosInstance.post('/locations', {
        code: null,
        companyId: user?.companyId,
        name,
        address: location,
        phone,
        email,
        status: isActive,
        locationType: null,
        managers: managerDto,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    // Yield one frame so the overlay paints before the request starts.
    await new Promise((r) => setTimeout(r, 0));

    try {
      await processSubmission();
      await loadShops();
      setIsModalOpen(false);
      resetForm();

      toast.success({
        title: 'Submitted successfully',
        description: 'Shop saved successfully',
      });
    } catch (error: any) {
      toast.warning({
        title: 'Error saving shop',
        description:
          error?.response?.data?.message || 'Please try again later',
      });
      console.error('Error saving shop:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: open the confirmation dialog
  const requestDelete = (shop: Shop) => {
    setShopToDelete(shop);
    setShowAlert(true);
    setIsModalOpen(false);
  };

  // Step 2: confirmed — perform the delete
  const confirmDelete = async () => {
    const shop = shopToDelete;
    setShowAlert(false);
    setShopToDelete(null);
    if (!shop) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 0));

    try {
      await axiosInstance.delete(`/locations/${shop.id}`);
      await loadShops();
      toast.success({
        title: 'Deleted successfully',
        description: 'Shop deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting shop:', error);
      toast.warning({
        title: 'Failed to delete shop',
        description: 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name' as keyof Shop,
      label: 'Shop Name',
      sortable: true,
      render: (shop: Shop) => (
        <div className="flex items-center gap-3">
          
          <div>
            <p className=" text-sm">{shop.name}</p>
            <p className="text-xs text-muted-foreground">{shop.address}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone' as keyof Shop,
      label: 'Phone',
      render: (shop: Shop) => (
        <span className="text-muted-foreground">{shop.phone}</span>
      ),
    },
    {
      key: 'managers' as keyof Shop,
      label: 'Manager',
      render: (shop: Shop) => {
        const managerName = shop.managers?.[0]?.name ?? '-';
        return <span className="text-muted-foreground">{managerName}</span>;
      },
    },
    {
      key: 'status' as keyof Shop,
      label: 'Status',
      render: (shop: Shop) => (
        <Badge
          className={
            shop.status
              ? 'bg-success/20 text-success'
              : 'bg-muted text-muted-foreground'
          }
        >
          {shop.status ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    // {
    //   key: 'createdAt' as keyof Shop,
    //   label: 'Created',
    //   sortable: true,
    //   render: (shop: Shop) =>
    //     shop.createdAt
    //       ? new Date(shop.createdAt).toLocaleDateString()
    //       : '-',
    // },
    {
      key: 'actions' as keyof Shop,
      label: 'Actions',
      render: (shop: Shop) => (
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" onClick={() => openModal(shop)}>
            <Edit className="w-4 h-4" />
          </Button> */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();   // ← prevents the row's onRowClick from firing
              requestDelete(shop);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {(isLoading || isSubmitting) && <LoadingOverlay />}
      <div className="">
        <Header title="Shops" description="Manage your shop locations" />

        <div className="mt-2">
          <DataTable
            title="All Shops"
            data={shops}
            columns={columns}
            searchKey="name"
            onAdd={() => openModal()}
            addLabel="Add Shop"
            emptyMessage="No data found."
            height='h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]'
            onRowClick={(shop) => openModal(shop)}
          />
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingShop ? 'Edit Shop' : 'Add New Shop'}
          size="full"
        >
         <form onSubmit={handleSubmit} className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Shop Name */}
    <div className="space-y-2">
      <Label htmlFor="name" className="text-foreground">
        Shop Name *
      </Label>
      <div className="relative">
        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Main Store"
          className="pl-10 bg-white border-border"
          required
        />
      </div>
    </div>

    {/* Phone */}
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-foreground">
        Phone Number *
      </Label>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 234 567 8900"
          className="pl-10 bg-white border-border"
          required
        />
      </div>
    </div>

    {/* Email */}
    <div className="space-y-2">
      <Label htmlFor="email" className="text-foreground">
        Email
      </Label>
      <div className="relative">
        <Text className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="a@bdc.com"
          className="pl-10 bg-white border-border"
          required
        />
      </div>
    </div>

    {/* Manager */}
    <div className="space-y-2">
      <Label htmlFor="manager" className="text-foreground">
        Manager (Optional)
      </Label>
      <Select value={selectedManager} onValueChange={setSelectedManager}>
        <SelectTrigger className="bg-white border-border w-full">
          <SelectValue placeholder="Select manager" />
        </SelectTrigger>
        <SelectContent>
          {employees?.map((item) => (
            <SelectItem key={item.id} value={String(item.id)}>
              <div className="flex flex-col">
                <span>{`${item.firstName} ${item.lastName}`}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Address — full width, textarea */}
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="location" className="text-foreground">
        Location/Address *
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <textarea
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="123 Main Street, Downtown"
          rows={3}
          required
          className="w-full text-xs sm:text-base rounded-md border border-border bg-white pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>
    </div>

    {/* Active Status — full width */}
    <div className="md:col-span-2 flex items-center justify-between p-4 bg-secondary rounded-lg">
      <div>
        <Label htmlFor="isActive" className="text-foreground">
          Active Status
        </Label>
        <p className="text-xs text-muted-foreground">
          Enable or disable this shop
        </p>
      </div>
      <Switch
        id="isActive"
        checked={isActive}
        onCheckedChange={setIsActive}
      />
    </div>

    {/* Actions — full width */}
    <div className="md:col-span-2 flex justify-end gap-3 pt-4">
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
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {editingShop ? 'Update Shop' : 'Create Shop'}
      </Button>
    </div>
  </div>
</form>
        </Modal>

        <SweetAlert
          isOpen={showAlert}
          onClose={() => {
            setShowAlert(false);
            setShopToDelete(null);
          }}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowAlert(false);
            setShopToDelete(null);
          }}
          type="error"
          title="Delete Item?"
          message={
            shopToDelete
              ? `Are you sure you want to delete "${shopToDelete.name}"? This action cannot be undone.`
              : 'This action cannot be undone.'
          }
          confirmText="Yes, Delete"
          showCancelButton={true}
          showCloseButton={false}
        />

        <>{toast.ToastComponent}</>
      </div>
    </>
  );
}