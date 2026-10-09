'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/util/CustomSelect';
import { User, Mail, Phone, MapPin, Trash2, Plus, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { useToaster } from '@/components/util/CustomToast';
import { sessionStore } from '@/helpers/formatStrings';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import SweetAlert from '@/components/util/SweetAlert';

// ---------- Types ----------
interface ContactPerson {
  id?: string;              // present only when editing an existing one
  code?: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  location: string;
  status?: number;          // number for POST/PUT payloads
  isNew?: boolean;          // UI-only, marks unsaved rows
}

interface FinancialServiceProvider {
  id: string;
  code?: string;
  name: string;
  address: string;
  locationId?: string;
  status: number | string;  // API returns string on GET, number elsewhere
  type: number;
  contactPersons?: ContactPerson[];
}

// 1 = Bank, 2 = FinTech
const FSP_TYPES = [
  { value: '1', label: 'Bank' },
  { value: '2', label: 'FinTech' },
];

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
];

const emptyContact: ContactPerson = {
  fullName: '',
  phoneNumber: '',
  email: '',
  location: '',
  isNew: true,
};

// Coerce "1"/"0"/1/0/true/false into 1 or 0
const toStatusNumber = (v: unknown): number => {
  if (v === true) return 1;
  if (v === false) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function FinancialServiceProviderPage() {
  const sessionShop = sessionStore.get('selectedShop');
  const toast = useToaster();
  const { selectedShop } = useAuth();

  const [providers, setProviders] = useState<FinancialServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<FinancialServiceProvider | null>(null);

  // Delete confirmation
  const [showAlert, setShowAlert] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<FinancialServiceProvider | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('2');        // default FinTech
  const [status, setStatus] = useState('1');    // default Active
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([{ ...emptyContact }]);

  // ---------- Load list ----------
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loc = selectedShop || sessionShop;
      if (!loc) {
        setProviders([]);
        return;
      }
      const response = await axiosInstance.get(
        `/FinancialServiceProvider/${loc}?status=1`
      );
      setProviders(Array.isArray(response?.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error loading providers:', error);
      toast.warning({
        title: 'Failed to load providers',
        description: error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Form helpers ----------
  const resetForm = () => {
    setName('');
    setAddress('');
    setType('2');
    setStatus('1');
    setContactPersons([{ ...emptyContact }]);
    setEditingProvider(null);
  };

  const openModal = (provider?: FinancialServiceProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setName(provider.name || '');
      setAddress(provider.address || '');
      setType(((provider as any).type ?? 2).toString());
      setStatus(toStatusNumber(provider.status ?? 1).toString());
      setContactPersons(
        provider.contactPersons && provider.contactPersons.length > 0
          ? provider.contactPersons.map(c => ({
              id: c.id,
              code: c.code,
              fullName: c.fullName || '',
              phoneNumber: c.phoneNumber ?? '',
              email: c.email ?? '',
              location: (c as any).location ?? '',
              status: toStatusNumber(c.status ?? 0),
              isNew: false,
            }))
          : [{ ...emptyContact }]
      );
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  // ---------- Contact person row handlers ----------
  const addContactRow = () => {
    setContactPersons(prev => [...prev, { ...emptyContact }]);
  };

  const removeContactRow = (index: number) => {
    setContactPersons(prev => prev.filter((_, i) => i !== index));
  };

  const updateContactRow = (
    index: number,
    field: keyof ContactPerson,
    value: string
  ) => {
    setContactPersons(prev =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Drop blank contact rows; require at least one with a name
    const validContacts = contactPersons.filter(c => c.fullName.trim() !== '');

    if (validContacts.length === 0) {
      toast.warning({
        title: 'Add at least one contact person',
        description: 'A full name is required for each contact.',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingProvider) {
        // ---------- PUT /FinancialServiceProvider/{id} ----------
        // Schema: name, status, address, type, contactPersons[{id, fullName, status, phoneNumber, email}]
        // Only existing contacts (with an id) can be sent — new rows are not allowed on edit.
        const existingContacts = validContacts.filter(c => !!c.id);

        if (existingContacts.length === 0) {
          toast.warning({
            title: 'No existing contact to update',
            description:
              'New contacts cannot be added from the edit form. Delete this provider and create a new one, or add contacts during creation.',
          });
          setIsLoading(false);
          return;
        }

        const updatePayload = {
          name,
          status: Number(status),
          address,
          type: Number(type),
          contactPersons: existingContacts.map(c => ({
            id: c.id,
            fullName: c.fullName,
            status: toStatusNumber(c.status ?? 0),
            phoneNumber: c.phoneNumber,
            email: c.email,
          })),
        };

        await axiosInstance.put(
          `/FinancialServiceProvider/${editingProvider.id}`,
          updatePayload
        );
      } else {
        // ---------- POST /FinancialServiceProvider ----------
        // Schema: name, address, locationId, status, type, contactPersons[{fullName, phoneNumber, email, location}]
        const createPayload = {
          name,
          address,
          locationId: selectedShop || sessionShop,
          status: Number(status),
          type: Number(type),
          contactPersons: validContacts.map(c => ({
            fullName: c.fullName,
            phoneNumber: c.phoneNumber,
            email: c.email,
            location: c.location,
          })),
        };

        await axiosInstance.post('/FinancialServiceProvider', createPayload);
      }

      await loadData();
      setIsModalOpen(false);
      resetForm();

      toast.success({
        title: 'Submitted successfully',
        description: editingProvider
          ? 'Financial service provider updated.'
          : 'Financial service provider saved.',
      });
    } catch (error: any) {
      console.error('Error saving provider:', error?.response?.data?.message);
      toast.warning({
        title: 'Failed to submit',
        description: error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Delete ----------
  const requestDelete = (provider: FinancialServiceProvider) => {
    setProviderToDelete(provider);
    setShowAlert(true);
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    const provider = providerToDelete;
    setShowAlert(false);
    setProviderToDelete(null);
    if (!provider) return;

    setIsLoading(true);
    try {
      await axiosInstance.delete(`/FinancialServiceProvider/${provider.id}`);
      await loadData();
      toast.success({
        title: 'Deleted successfully',
        description: 'Financial service provider deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast.warning({
        title: 'Failed to delete provider',
        description: error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Columns ----------
  const columns = [
    {
      key: 'name' as keyof FinancialServiceProvider,
      label: 'Provider',
      sortable: true,
      render: (p: FinancialServiceProvider) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{p.name}</p>
            {p.address && (
              <p className="text-xs text-muted-foreground">{p.address}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type' as keyof FinancialServiceProvider,
      label: 'Type',
      sortable: true,
      render: (p: FinancialServiceProvider) => (
        <Badge className="bg-primary/10 text-primary">
          {p.type === 1 ? 'Bank' : p.type === 2 ? 'FinTech' : '—'}
        </Badge>
      ),
    },
    {
      key: 'status' as keyof FinancialServiceProvider,
      label: 'Status',
      sortable: true,
      render: (p: FinancialServiceProvider) => {
        const s = toStatusNumber(p.status);
        return (
          <Badge
            className={
              s === 1
                ? 'bg-success/20 text-success'
                : 'bg-muted text-muted-foreground'
            }
          >
            {s === 1 ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      key: 'contactPersons' as keyof FinancialServiceProvider,
      label: 'Contacts',
      render: (p: FinancialServiceProvider) => (
        <span className="text-muted-foreground">
          {p.contactPersons?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'actions' as keyof FinancialServiceProvider,
      label: 'Actions',
      render: (p: FinancialServiceProvider) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              requestDelete(p);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const isEditing = !!editingProvider;

  return (
    <div className="min-h-screen">
      {isLoading && <LoadingOverlay />}
      <Header
        title="Financial Service Providers"
        description="Manage banks, fintechs and their contact persons"
      />

      <div className="mt-2">
        <DataTable
          title="All Providers"
          data={providers}
          columns={columns}
          searchKey="name"
          onAdd={() => openModal()}
          addLabel="Add Provider"
          emptyMessage="No data found."
          height="h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]"
          onRowClick={(data) => openModal(data)}
        />
      </div>

      {/* ---------- Add/Edit Modal ---------- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={isEditing ? 'Edit Financial Service Provider' : 'Add Financial Service Provider'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider basics */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Provider Name *
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MTN MoMo"
                className="pl-10 bg-white border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground">
              Address
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Provider Street"
                className="pl-10 bg-white border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-foreground">
                Type *
              </Label>
              <CustomSelect
                options={FSP_TYPES}
                value={type}
                onValueChange={setType}
                placeholder="Select type"
                required={true}
                searchable={false}
                clearable={false}
                size="md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground">
                Status *
              </Label>
              <CustomSelect
                options={STATUS_OPTIONS}
                value={status}
                onValueChange={setStatus}
                placeholder="Select status"
                required={true}
                searchable={false}
                clearable={false}
                size="md"
              />
            </div>
          </div>

          {/* Contact Persons */}
          <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Contact Persons <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {isEditing
                  ? 'Existing contacts can be updated'
                  : 'At least one is required'}
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {contactPersons.map((c, index) => (
                <div
                  key={c.id ?? `new-${index}`}
                  className="border rounded-md bg-white p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Contact #{index + 1}
                      {c.id ? (
                        <span className="ml-2 text-[10px] uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Existing
                        </span>
                      ) : (
                        <span className="ml-2 text-[10px] uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          New
                        </span>
                      )}
                    </span>
                    {contactPersons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContactRow(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={c.fullName}
                          onChange={(e) =>
                            updateContactRow(index, 'fullName', e.target.value)
                          }
                          placeholder="John Doe"
                          className="pl-10 bg-white border-border"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={c.phoneNumber}
                          onChange={(e) =>
                            updateContactRow(index, 'phoneNumber', e.target.value)
                          }
                          placeholder="+233 20 000 0000"
                          className="pl-10 bg-white border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={c.email}
                          onChange={(e) =>
                            updateContactRow(index, 'email', e.target.value)
                          }
                          placeholder="john@provider.com"
                          className="pl-10 bg-white border-border"
                        />
                      </div>
                    </div>

                    {/* Location is only relevant on create — the PUT schema omits it */}
                    {!isEditing && (
                      <div className="space-y-1">
                        <Label className="text-xs">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={c.location}
                            onChange={(e) =>
                              updateContactRow(index, 'location', e.target.value)
                            }
                            placeholder="Accra Branch"
                            className="pl-10 bg-white border-border"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Adding new contacts is only allowed on create */}
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addContactRow}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Another Contact
              </Button>
            )}
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
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isEditing ? 'Update Provider' : 'Add Provider'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <SweetAlert
        isOpen={showAlert}
        onClose={() => {
          setShowAlert(false);
          setProviderToDelete(null);
        }}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowAlert(false);
          setProviderToDelete(null);
        }}
        type="error"
        title="Delete Financial Service Provider?"
        message={
          providerToDelete
            ? `Are you sure you want to delete "${providerToDelete.name}"? This action cannot be undone.`
            : 'This action cannot be undone.'
        }
        confirmText="Yes, Delete"
        showCancelButton={true}
        showCloseButton={false}
      />

      {toast.ToastComponent}
    </div>
  );
}