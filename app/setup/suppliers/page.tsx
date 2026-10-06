'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Shop, Supplier } from '@/lib/types';
import { Edit, Trash2, Truck, User, Mail, Phone, MapPin, Building } from 'lucide-react';
import { MultiSelectComponent } from '@/components/ui/select';
import axiosInstance from '@/lib/customAxios';
import { useAuth } from '@/lib/auth-context';
import { useToaster } from '@/components/util/CustomToast';
import { sessionStore } from '@/helpers/formatStrings';

export default function SuppliersPage() {
  const sessionShop = sessionStore.get("selectedShop");
  const toast = useToaster();
  const {user, selectedShop} = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedShops, setselectedShops] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
       loadSuppliers();
      loadData();
    } 
  }, [user]);

  const loadSuppliers = async () => {
    try {
      const data = await axiosInstance.get(`Suppliers?companyId=${user.companyId}`);
      setSuppliers(data?.data);
    } finally {
      setIsLoading(false);
    }
  };

    const loadData = async () => {
    try {
      //shops 
      const shopsData = await axiosInstance.get('/locations');
      //  const rolesData = await axiosInstance.get('/positions');
      setShops(shopsData?.data);
      // setRoles(rolesData?.data);

    } catch (error) {
      console.log(error)
    }
  };

  const resetForm = () => {
    setName('');
    setFirstName('');
     setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setEditingSupplier(null);
    setselectedShops([]);
  };

  const openModal = (supplier?: Supplier) => {
    if (supplier) {

       let locationIds : string [] = [];

       if (supplier?.locations !== undefined ) {
            if (supplier?.locations?.length > 0) {
                locationIds = supplier.locations.map((x : any)=> { return x.id.toString()});
            }
        }

      setEditingSupplier(supplier);
      setName(supplier.supplierCompanyName);
      setFirstName(supplier.firstName);
      setLastName(supplier.lastName);
      setEmail(supplier.email);
      setPhone(supplier.phone);
      setAddress(supplier.address);
      setselectedShops(locationIds)
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const supplierData = {
      firstName,
      lastName,
      phone,
      email,
      address,
      supplierComanyName : name,
      locations: selectedShops,
      tin : ""
    };

    setIsLoading(true)
    try {
      if (editingSupplier) {
        await axiosInstance.put('/Suppliers', {...supplierData, id : editingSupplier.id})
      } else {
        await axiosInstance.post(`Suppliers/${selectedShop || sessionShop}`, supplierData)
      }
      await loadSuppliers();
      setIsModalOpen(false);
      resetForm();

       toast.success({
          title: 'Submitted successfully',
          description: 'Supplier created successfully',
      })
    } catch (error : any) {
      console.error('Error saving supplier:', error);

      toast.warning({
          title:  'Failed to submit',
          description: error?.response?.data?.message || 'Please try again later',
      })
    }
    finally {
      setIsLoading(false)
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete "${supplier.supplierCompanyName}"?`)) {
      try {
        setIsLoading(true)
        await axiosInstance.delete(`/Suppliers/${supplier.id}`)
        await loadSuppliers();

        toast.success({
          title: 'Submitted successfully',
          description: 'Supplier deleted successfully',
      })
      } catch (error: any) {
        console.error('Error deleting supplier:', error);

        toast.warning({
          title:  'Failed to submit',
          description: error?.response?.data?.message || 'Please try again later',
      })
      }

      finally{
        setIsLoading(false)
      }
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const columns = [
    {
      key: 'name' as keyof Supplier,
      label: 'Supplier',
      sortable: true,
      render: (supplier: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{supplier.supplierCompanyName}</p>
            <p className="text-xs text-muted-foreground">{supplier.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contactPerson' as keyof Supplier,
      label: 'Contact Person',
      render: (supplier: Supplier) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{`${supplier.firstName} ${supplier.lastName}`}</span>
        </div>
      ),
    },
    {
      key: 'phone' as keyof Supplier,
      label: 'Phone',
      render: (supplier: Supplier) => (
        <span className="text-muted-foreground">{supplier.phone}</span>
      ),
    },
    {
      key: 'balance' as keyof Supplier,
      label: 'Outstanding Balance',
      sortable: true,
      render: (supplier: Supplier) => (
        <Badge className={supplier.balance > 0 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
          {formatCurrency(supplier.balance)}
        </Badge>
      ),
    },
    {
      key: 'actions' as keyof Supplier,
      label: 'Actions',
      render: (supplier: Supplier) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => openModal(supplier)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Suppliers" description="Manage your supplier relationships" />

      <div className="p-6">
        <DataTable
          title="All Suppliers"
          data={suppliers}
          columns={columns}
          searchKey="supplierCompanyName"
          onAdd={() => openModal()}
          addLabel="Add Supplier"
          emptyMessage="No suppliers found. Add your first supplier to get started."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        description={editingSupplier ? 'Update supplier information' : 'Add a new supplier to your system'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Company Name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Global Distributors Inc."
                className="pl-10 bg-white border-border"
                required
              />
            </div>
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-foreground">Contact First Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John Smith"
                className="pl-10 bg-white border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-foreground">Contact Last Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="John Smith"
                className="pl-10 bg-white border-border"
                required
              />
            </div>
          </div>
        </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@supplier.com"
                  className="pl-10 bg-white border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
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
          </div>

           <div className="space-y-2">
              <Label htmlFor="shop" className="text-foreground">Shop</Label>
              <MultiSelectComponent
                selectedItems={selectedShops}
                items={shops.map(x=> {
                  return {id : x.id, name: x.name, description : ""}
                })}
                 label=''
                setSelectedItems={setselectedShops}

              />
            </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="500 Supplier Road, City, State"
                className="pl-10 bg-white border-border"
                required
              />
            </div>
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
              {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
