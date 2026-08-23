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
import { Edit, Trash2, Store, MapPin, Phone, User2, Code2, MessageCircle, MessageCircleDashed, ReceiptIcon, Text } from 'lucide-react';
import Loading from '@/components/ui/loading-global';
import { useAuth } from '@/lib/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axiosInstance from '@/lib/customAxios';
import { useToast } from '@/hooks/use-toast';

export default function ShopsPage() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [employees, setEmployees] = useState<User[] | null>([])
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedManager, setSelectedManagers] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [email, setEmail] = useState('')

  useEffect(() => {
    loadShops();
    loadEmployees();
  }, []);

  const loadShops = async () => {
    try {
      const data = await axiosInstance.get('/locations');
      setShops(data?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await axiosInstance.get('/employees');
      setEmployees(data?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setLocation('');
    setPhone('');
    setSelectedManagers("");
    setIsActive(true);
    setEditingShop(null);
  };

  const openModal = (shop?: Shop) => {
    if (shop) {
      setEditingShop(shop);
      setName(shop.name);
      setLocation(shop.address);
      setPhone(shop.phone);
      setEmail(shop.email)
      // setManager(p => {
      //   return [...p, {}]
      // });
      setIsActive(shop.status);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const processSubmission = async () => {
     const shopData = {
      code : null,
      companyId: user?.companyId,
      name,
      address : location,
      phone,
       email,
      status : isActive,
      locationType : null,
      manager: []
    };

    
    try {
      if (editingShop) {
         await axiosInstance.put('/locations/Update', {...shopData, id : editingShop.id });
        
      } else {
        await axiosInstance.post('/locations', shopData);
      }
      await loadShops();
      setIsModalOpen(false);
      resetForm();

      toast.success({
        title: 'Submitted successfully',
        description: 'Shop saved successfully',
      })
    } catch (error : any) {
      setIsLoading(false)
      
      toast.warning({
        title: 'Error saving shop',
        description: error?.response?.data?.message || 'Please try again later',
      })

      console.error('Error saving shop:', error);
      
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true)

     await  processSubmission()
  };

  const handleDelete = async (shop: Shop) => {
    if (confirm(`Are you sure you want to delete "${shop.name}"?`)) {
      setIsLoading(true)
      try {
        await axiosInstance.delete(`/locations/${shop?.id}`);
        await loadShops();
         toast.success({
          title: 'Deleted successfully',
          description: 'Shop deleted successfully',
        })
      } catch (error) {
        console.error('Error deleting shop:', error);

         toast.warning({
          title: 'Failed to delete shop',
          description: 'Please try again later',
        })
      }
    }
  };

  const columns = [
    {
      key: 'name' as keyof Shop,
      label: 'Shop Name',
      sortable: true,
      render: (shop: Shop) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{shop.name}</p>
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
      key: 'manager' as keyof Shop,
      label: 'Manager',
      render: (shop: Shop) => (
        <span className="text-muted-foreground">
          {/* {shop?.managers[0]?.name || '-'} */}
          </span>
      ),
    },
    {
      key: 'isActive' as keyof Shop,
      label: 'Status',
      render: (shop: Shop) => (
        <Badge className={shop.status ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}>
          {shop.status ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as keyof Shop,
      label: 'Created',
      sortable: true,
    },
    {
      key: 'actions' as keyof Shop,
      label: 'Actions',
      render: (shop: Shop) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => openModal(shop)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(shop)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Loading></Loading>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Shops" description="Manage your shop locations" />

      <div className="p-6">
        <DataTable
          title="All Shops"
          data={shops}
          columns={columns}
          searchKey="name"
          onAdd={() => openModal()}
          addLabel="Add Shop"
          emptyMessage="No shops found. Create your first shop to get started."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingShop ? 'Edit Shop' : 'Add New Shop'}
        // description={editingShop ? 'Update shop information' : 'Create a new shop location'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Shop Name *</Label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Store"
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">Location/Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="123 Main Street, Downtown"
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Email</Label>
            <div className="relative">
              <Text  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="a@bdc.com"
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager" className="text-foreground">Manager (Optional)</Label>
             <div className="space-y-2 md:col-span-3">
              <Select value={selectedManager} onValueChange={setSelectedManagers}>
                <SelectTrigger className="bg-secondary border-border w-[100%]">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex flex-col">
                        <span>{`${item.firstName} ${item.lastName}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-foreground">Active Status</Label>
              <p className="text-xs text-muted-foreground">Enable or disable this shop</p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

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
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {editingShop ? 'Update Shop' : 'Create Shop'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
