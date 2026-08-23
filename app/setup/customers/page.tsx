'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { customerService, itemService } from '@/lib/api-service';
import type { Customer, Item } from '@/lib/types';
import { Edit, Trash2, User, Mail, Phone, MapPin, DollarSign, CreditCard, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { useToast } from '@/hooks/use-toast';
import { formatNumberWithCommas, removeCommasFromNumbers } from '@/helpers/formatStrings';


export default function CustomersPage() {
  const sessionShop = sessionStorage.getItem("selectedShop")
  const {toast} = useToast()
  const {selectedShop} = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');

  // Deposit form state
  // const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  // const [depositCustomer, setDepositCustomer] = useState<Customer | null>(null);
  // const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const response = await axiosInstance.get( `/Customers?locationId=${selectedShop || sessionShop}`);
        setCustomers(response?.data);
    } finally {
      setIsLoading(false);
    }
  };


  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setNationalId('');
    setAddress('');
    setCreditLimit('');
    setEditingCustomer(null);
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFirstName(customer.firstName);
      setLastName(customer.lastName);
      setEmail(customer.email);
      setPhone(customer.phone);
      setNationalId(customer.nationalId)
      setAddress(customer.address);
      setCreditLimit(formatNumberWithCommas(customer.creditLimit.toString()));
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  // const openDepositModal = (customer: Customer) => {
  //   setDepositCustomer(customer);
  //   setDepositAmount('');
  //   setIsDepositModalOpen(true);
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customerData = {
      firstName,
      lastName,
      phone,
      email,
      address,
      status : true,
      locationId : selectedShop || sessionShop,
      creditLimit: parseFloat(removeCommasFromNumbers(creditLimit).toString()),
      nationalIdentificationNumber: nationId
    };

    setIsLoading(true)
    try {
      if (editingCustomer) {
        await axiosInstance.put('/Customers', {...customerData, id : editingCustomer.id})
      } else {
        await axiosInstance.post('/Customers', customerData)
      }
      await loadData();
      setIsModalOpen(false);
      resetForm();

      toast.success({
          title: 'Submitted successfully',
          description: 'Customer saved successfully',
      })
    } catch (error: any) {
       console.error('Error saving employee:', error.response?.data?.message);

       toast.warning({
          title:  'Failed to submit',
          description: error?.response?.data?.message || 'Please try again later',
      })
    }
    finally{
      setIsLoading(false)
    }
  };

  // const handleDeposit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!depositCustomer) return;

  //   try {
  //     await customerService.addDeposit(depositCustomer.id, parseFloat(depositAmount));
  //     await loadData();
  //     setIsDepositModalOpen(false);
  //     setDepositCustomer(null);
  //     setDepositAmount('');
  //   } catch (error) {
  //     console.error('Error adding deposit:', error);
  //   }
  // };

  const handleDelete = async (customer: Customer) => {
    if (confirm(`Are you sure you want to delete "${customer.firstName} ${customer.lastName}"?`)) {
     
      setIsLoading(true)
      try {
        await axiosInstance.delete(`/Customers/${customer?.id}`);
        await loadData();

         toast.success({
          title: 'Submitted successfully',
          description: 'Customer deleted successfully',
      })
      } catch (error : any) {
        console.error('Error deleting customer:', error);

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
      key: 'firstName' as keyof Customer,
      label: 'Customer',
      sortable: true,
      render: (customer: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {customer.firstName[0]}{customer.lastName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{customer.firstName} {customer.lastName}</p>
            <p className="text-xs text-muted-foreground">{customer.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone' as keyof Customer,
      label: 'Phone',
      render: (customer: Customer) => (
        <span className="text-muted-foreground">{customer.phone}</span>
      ),
    },
    {
      key: 'creditLimit' as keyof Customer,
      label: 'Credit Limit',
      sortable: true,
      render: (customer: Customer) => (
        <span className="text-foreground">{formatCurrency(customer.creditLimit)}</span>
      ),
    },
    {
      key: 'balance' as keyof Customer,
      label: 'Outstanding Balance',
      sortable: true,
      render: (customer: Customer) => (
        <Badge className={customer.balance > 0 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
          {formatCurrency(customer.balance)}
        </Badge>
      ),
    },

    {
      key: 'actions' as keyof Customer,
      label: 'Actions',
      render: (customer: Customer) => (
        <div className="flex items-center gap-2">
          {/* <Button variant="outline" size="sm" onClick={() => openDepositModal(customer)}>
            <Wallet className="w-4 h-4 mr-1" />
            Deposit
          </Button> */}
          <Button variant="ghost" size="icon" onClick={() => openModal(customer)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(customer)}>
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
      <Header title="Customers" description="Manage customer accounts and credit" />

      <div className="p-6">
        <DataTable
          title="All Customers"
          data={customers}
          columns={columns}
          searchKey="firstName"
          onAdd={() => openModal()}
          addLabel="Add Customer"
          emptyMessage="No customers found. Add your first customer to get started."
        />
      </div>

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        // description={editingCustomer ? 'Update customer information' : 'Add a new customer to your system'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground">First Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone *</Label>
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
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nationId" className="text-foreground">National ID *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="nationId"
                value={nationId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="GHA-00-3903-00"
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground">Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Customer Street"
                className="pl-10 bg-secondary border-border"
                // required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditLimit" className="text-foreground">Credit Limit </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="creditLimit"
                value={creditLimit}
                onChange={(e) => setCreditLimit(formatNumberWithCommas(e.target.value))}
                placeholder="5000"
                className="pl-10 bg-secondary border-border"
                // required
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
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deposit Modal */}
      {/* <Modal
        isOpen={isDepositModalOpen}
        onClose={() => {
          setIsDepositModalOpen(false);
          setDepositCustomer(null);
          setDepositAmount('');
        }}
        title="Add Customer Deposit"
        description={depositCustomer ? `Add a deposit for ${depositCustomer.firstName} ${depositCustomer.lastName}` : ''}
        size="sm"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          {depositCustomer && (
            <div className="p-4 bg-secondary rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Deposits:</span>
                <span className="font-medium text-success">{formatCurrency(depositCustomer.deposits)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding Balance:</span>
                <span className="font-medium text-warning">{formatCurrency(depositCustomer.balance)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="depositAmount" className="text-foreground">Deposit Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="depositAmount"
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="500.00"
                className="pl-10 bg-secondary border-border"
                required
                min="0.01"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDepositModalOpen(false);
                setDepositCustomer(null);
                setDepositAmount('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add Deposit
            </Button>
          </div>
        </form>
      </Modal> */}
    </div>
  );
}
