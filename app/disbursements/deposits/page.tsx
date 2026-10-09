"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense } from "react";
import { Plus, Building2, Phone, Mail, X } from "lucide-react";
import { Header } from '@/components/dashboard/header';
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToaster } from '@/components/util/CustomToast';
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import {
  alphaNumericDate,
  formatNumberWithCommas,
  removeCommasFromNumbers,
  toastErrors,
  sessionStore,
} from "@/helpers/formatStrings";
import { DataTable } from '@/components/dashboard/data-table';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { CustomSelect } from '@/components/util/CustomSelect';
import { config } from '@/components/util/AppConfig';

const Modal = dynamic(
  () => import('@/components/dashboard/modal').then(mod => mod.Modal),
  { ssr: false }
);

// ---------- Types ----------
interface FinancialServiceContactPerson {
  id: string;
  code?: string;
  fullName: string;
  financialServiceProviderId?: string;
  status?: string | number;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

interface FinancialServiceProvider {
  id: string;
  code?: string;
  name: string;
  address?: string;
  status?: string | number;
  type?: number;
  contactPersons?: FinancialServiceContactPerson[];
}

interface DisbursementContactPerson {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  addrress: string;                       // API spelling
}

interface Disbursement {
  id: string;
  locationName: string;
  finacialServiceProviderName: string;    // API spelling
  totalAmount: number;
  createdAt: string;
  transactionDate: string;
  transactionCode: string;
  contactPersons: DisbursementContactPerson[];
}

const ALL_PROVIDERS = "all";

// ---------- Helpers ----------

/**
 * Extract an array from an axios response whether or not the instance's
 * response interceptor already unwrapped `.data`.
 *
 * Handles:
 *   - res               → [ ... ]          (unwrapped by interceptor)
 *   - res.data          → [ ... ]          (plain axios)
 *   - res.data.data     → [ ... ]          (wrapped envelope)
 *   - anything else     → []
 */
function extractArray<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

const isActiveStatus = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  const s = String(v ?? "").toLowerCase();
  return s === "active" || s === "1" || s === "true";
};

export default function DisbursementPage() {
  const toast = useToaster();
  const { selectedShop } = useAuth();

  // List
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Disbursement | null>(null);

  // New disbursement modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Step 1
  const [providers, setProviders] = useState<FinancialServiceProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  // Filter
  const [providerFilter, setProviderFilter] = useState<string>(ALL_PROVIDERS);

  // Step 2
  const [contactPersons, setContactPersons] = useState<FinancialServiceContactPerson[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(false);
  const [recipients, setRecipients] = useState<FinancialServiceContactPerson[]>([]);

  // Step 3
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const isLoadingRef = useRef(false);

  // ---------- Effects ----------
  useEffect(() => {
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFilter, selectedShop]);

  // ---------- Load deposits ----------
  const loadData = async (): Promise<void> => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const loc = selectedShop || sessionStore.get("selectedShop");
      if (!loc) {
        setDisbursements([]);
        return;
      }

      const hasFilter = providerFilter && providerFilter !== ALL_PROVIDERS;
      const query = hasFilter ? `?financialServiceProvider=${providerFilter}` : "";

      const res: any = await axiosInstance.get(
        `/FinancialServiceProvider/deposits/${loc}${query}`
      );

      // Works whether the interceptor unwrapped `.data` or not
      const list = extractArray<Disbursement>(res);
      console.log("deposits raw:", res, "→ extracted:", list.length, "items");

      setDisbursements(list);
    } catch (error: any) {
      console.error("Error loading disbursements:", error);
      toastErrors(toast, error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // ---------- Load providers ----------
  const loadProviders = async (): Promise<void> => {
    try {
      setProvidersLoading(true);
      const loc = selectedShop || sessionStore.get("selectedShop");
      if (!loc) {
        setProviders([]);
        return;
      }

      const res: any = await axiosInstance.get(
        `/FinancialServiceProvider/${loc}?status=1`
      );

      const list = extractArray<FinancialServiceProvider>(res);
      setProviders(list);
    } catch (error: any) {
      toastErrors(toast, error);
    } finally {
      setProvidersLoading(false);
    }
  };

  const openNewDisbursement = async () => {
    setModalOpen(true);
    if (!date) setDate(new Date().toISOString().slice(0, 10));
    if (providers.length === 0) await loadProviders();
  };

  // ---------- Provider change ----------
  const handleProviderChange = async (providerId: string) => {
    setSelectedProvider(providerId);
    setContactPersons([]);
    setRecipients([]);

    if (!providerId) return;

    const provider = providers.find(p => p.id === providerId);

    if (provider?.contactPersons && provider.contactPersons.length > 0) {
      setContactPersons(provider.contactPersons);
      return;
    }

    try {
      setContactsLoading(true);
      const res: any = await axiosInstance.get(
        `/FinancialServiceProvider/${providerId}/contact-persons`
      );
      setContactPersons(extractArray<FinancialServiceContactPerson>(res));
    } catch (error: any) {
      toastErrors(toast, error);
    } finally {
      setContactsLoading(false);
    }
  };

  // ---------- Recipients ----------
  const toggleRecipient = (contact: FinancialServiceContactPerson) => {
    setRecipients(prev => {
      const exists = prev.some(r => r.id === contact.id);
      if (exists) return prev.filter(r => r.id !== contact.id);
      return [...prev, contact];
    });
  };

  const removeRecipient = (contactId: string) => {
    setRecipients(prev => prev.filter(r => r.id !== contactId));
  };

  const resetForm = () => {
    setSelectedProvider("");
    setContactPersons([]);
    setRecipients([]);
    setPaymentMethod("");
    setDate("");
    setTotalAmount("");
    setRemarks("");
  };

  // ---------- Amount ----------
  const handleAmountChange = (raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, "");

    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");
    }

    if (cleaned === "" || cleaned === ".") {
      setTotalAmount(cleaned);
      return;
    }

    const [intPart, decPart] = cleaned.split(".");
    const intFormatted = intPart ? formatNumberWithCommas(intPart) : "";
    const next = decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;

    setTotalAmount(next);
  };

  // ---------- Save ----------
  const submitDisbursement = async (): Promise<void> => {
    if (!selectedProvider) {
      toast.warning({ title: 'Select a Financial Service Provider', description: '' });
      return;
    }
    if (recipients.length === 0) {
      toast.warning({ title: 'Select at least one contact person', description: '' });
      return;
    }
    if (!paymentMethod) {
      toast.warning({ title: 'Select a payment method', description: '' });
      return;
    }
    if (!date) {
      toast.warning({ title: 'Select a payment date', description: '' });
      return;
    }

    try {
      setLoading(true);
      const sessionShop = sessionStore.get("selectedShop");

      const payload = {
        locationId: selectedShop || sessionShop,
        financialServiceProviderId: selectedProvider,
        date: new Date(date).toISOString(),
        totalAmount: totalAmount ? Number(removeCommasFromNumbers(totalAmount)) : 0,
        paymentMethod: Number(paymentMethod),
        currencyCode: config.currency || "GHS",
        transactionType: 1,
        remarks: remarks || "",
        contactPersons: recipients.map(r => ({
          id: r.id,
          fullName: r.fullName,
          phoneNumber: r.phoneNumber ?? "",
          email: r.email ?? "",
          addrress: (r as any).addrress ?? r.address ?? "",
        })),
      };

      await axiosInstance.post("/FinancialServiceProvider/deposit", payload);
      await loadData();

      toast.success({ title: 'Submitted successfully', description: 'Disbursement saved.' });
      resetForm();
      setModalOpen(false);
    } catch (error: any) {
      console.error("Error saving disbursement:", error);
      toastErrors(toast, error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Details ----------
  const openDetails = (row: Disbursement) => {
    setSelectedDeposit(row);
    setDetailsModalOpen(true);
  };

  // ---------- Columns ----------
  const columns = [
    {
      key: "finacialServiceProviderName" as keyof Disbursement,
      label: "Financial Service Provider",
      sortable: true,
      render: (row: Disbursement) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {row.finacialServiceProviderName || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "locationName" as keyof Disbursement,
      label: "Location",
      render: (row: Disbursement) => (
        <span className="text-muted-foreground">{row.locationName || "—"}</span>
      ),
    },
    {
      key: "totalAmount" as keyof Disbursement,
      label: "Total Amount",
      sortable: true,
      render: (row: Disbursement) => (
        <span className="font-bold text-primary">
          {formatNumberWithCommas(Number(row.totalAmount ?? 0).toFixed(2))}
        </span>
      ),
    },
    {
      key: "contactPersons" as keyof Disbursement,
      label: "Contacts",
      render: (row: Disbursement) => (
        <span className="text-muted-foreground">
          {row.contactPersons?.length ?? 0}
        </span>
      ),
    },
    {
      key: "transactionDate" as keyof Disbursement,
      label: "Date",
      render: (row: Disbursement) =>
        row.transactionDate
          ? alphaNumericDate(new Date(row.transactionDate).toLocaleDateString())
          : "—",
    },
    {
      key: "transactionCode" as keyof Disbursement,
      label: "Transaction Code",
      render: (row: Disbursement) => (
        <span className="font-bold text-primary">
          {row.transactionCode || "—"}
        </span>
      ),
    },
  ];

  // ---------- Options ----------
  const providerOptions = providers.map(p => ({
    value: p.id,
    label: p.name,
    discriptionLabel: p.code || '',
  }));

  const filterOptions = [
    { value: ALL_PROVIDERS, label: "All Providers" },
    ...providerOptions,
  ];

  const paymentMethodOptions = config.paymentMethods?.map((m) => ({
    value: m.id.toString(),
    label: m.name,
  }));

  return (
    <Suspense fallback={<LoadingOverlay />}>
      {loading && <LoadingOverlay />}
      <div className="min-h-screen w-full overflow-x-hidden">
        <Header title="Disbursements" />

        <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 px-4 pt-2">
          <div className="w-full sm:w-[260px]">
            <CustomSelect
              options={filterOptions}
              value={providerFilter}
              onValueChange={(v) => setProviderFilter(v || ALL_PROVIDERS)}
              placeholder="Filter by Provider"
              required={false}
              searchable={true}
              clearable={false}
              size="md"
            />
          </div>

          <Button onClick={openNewDisbursement}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>

        <div className="relative">
          <CardContent className="m-0 p-0 overflow-x-auto">
            <DataTable
              title="Disbursements"
              data={disbursements}
              columns={columns}
              emptyMessage="No disbursements found."
              onRowClick={(row) => openDetails(row as Disbursement)}
            />
          </CardContent>

          {/* ========== NEW DISBURSEMENT MODAL ========== */}
          <Modal
            isOpen={modalOpen}
            onClose={() => { setModalOpen(false); resetForm(); }}
            title="New Disbursement"
            size="full"
            height="585px"
          >
            <div className="w-full flex flex-col gap-4 p-2">

              {/* Step 1 */}
              <div>
                <Label htmlFor="provider" className="text-foreground">
                  Financial Service Provider <span className="text-destructive">*</span>
                </Label>
                <CustomSelect
                  options={providerOptions}
                  value={selectedProvider}
                  onValueChange={handleProviderChange}
                  placeholder={providersLoading ? "Loading providers..." : "Select Provider"}
                  required={true}
                  searchable={true}
                  clearable={true}
                  size="md"
                  disabled={providersLoading}
                />
              </div>

              {/* Step 2 */}
              {selectedProvider && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">
                      Contact Persons <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {contactsLoading
                        ? "Loading..."
                        : `${recipients.length} of ${contactPersons.length} selected`}
                    </span>
                  </div>

                  {contactsLoading && (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      Loading contact persons...
                    </div>
                  )}

                  {!contactsLoading && contactPersons.length === 0 && (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      No contact persons registered for this provider.
                    </div>
                  )}

                  {!contactsLoading && contactPersons.length > 0 && (
                    <div className="max-h-[220px] overflow-y-auto divide-y rounded border bg-white">
                      {contactPersons.map(c => {
                        const selected = recipients.some(r => r.id === c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 ${
                              selected ? "bg-primary/5" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleRecipient(c)}
                              className="h-4 w-4 accent-primary"
                            />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium">{c.fullName}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-3">
                                {c.phoneNumber && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {c.phoneNumber}
                                  </span>
                                )}
                                {c.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {c.email}
                                  </span>
                                )}
                              </span>
                            </div>
                            {c.code && (
                              <span className="text-xs text-muted-foreground">{c.code}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Chips */}
              {recipients.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-sm font-semibold">
                    Selected Recipients ({recipients.length})
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {recipients.map(r => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm px-3 py-1 rounded-full"
                      >
                        {r.fullName}
                        <button
                          type="button"
                          onClick={() => removeRecipient(r.id)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="paymentMethod" className="text-foreground">
                    Payment Method <span className="text-destructive">*</span>
                  </Label>
                  <CustomSelect
                    options={paymentMethodOptions || []}
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    placeholder="Select Payment Method"
                    required={true}
                    searchable={false}
                    clearable={true}
                    size="md"
                  />
                </div>

                <div>
                  <Label htmlFor="date" className="text-foreground">
                    Payment Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="totalAmount" className="text-foreground">
                    Total Amount
                  </Label>
                  <Input
                    id="totalAmount"
                    value={totalAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="bg-white border-border"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="remarks" className="text-foreground">
                  Remarks
                </Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes"
                  className="bg-white border-border"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { resetForm(); setModalOpen(false); }}>
                  Cancel
                </Button>
                <Button onClick={submitDisbursement}>Save</Button>
              </div>
            </div>
          </Modal>

          {/* ========== DETAILS MODAL ========== */}
          <Modal
            isOpen={detailsModalOpen}
            onClose={() => { setDetailsModalOpen(false); setSelectedDeposit(null); }}
            title="Disbursement Details"
            size="lg"
          >
            {selectedDeposit && (
              <div className="w-full flex flex-col gap-4 p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="font-medium">{selectedDeposit.finacialServiceProviderName || "—"}</p>
                  </div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedDeposit.locationName || "—"}</p>
                  </div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-primary">
                      {formatNumberWithCommas(Number(selectedDeposit.totalAmount ?? 0).toFixed(2))}
                    </p>
                  </div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Transaction Code</p>
                    <p className="font-medium">{selectedDeposit.transactionCode || "—"}</p>
                  </div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Transaction Date</p>
                    <p className="font-medium">
                      {selectedDeposit.transactionDate
                        ? alphaNumericDate(new Date(selectedDeposit.transactionDate).toLocaleDateString())
                        : "—"}
                    </p>
                  </div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="font-medium">
                      {selectedDeposit.createdAt
                        ? alphaNumericDate(new Date(selectedDeposit.createdAt).toLocaleDateString())
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-sm font-semibold">
                    Contact Persons ({selectedDeposit.contactPersons?.length ?? 0})
                  </div>
                  <div className="divide-y max-h-[240px] overflow-y-auto">
                    {(selectedDeposit.contactPersons || []).map((c, idx) => (
                      <div key={c.id ?? idx} className="px-3 py-2">
                        <p className="text-sm font-medium">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          {c.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {c.phoneNumber}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {c.email}
                            </span>
                          )}
                          {c.addrress && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {c.addrress}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                    {(selectedDeposit.contactPersons?.length ?? 0) === 0 && (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No contact persons.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>

        {toast.ToastComponent}
      </div>
    </Suspense>
  );
}