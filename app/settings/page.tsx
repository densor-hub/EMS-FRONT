"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Save, Loader2 } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToaster } from "@/components/util/CustomToast";
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";
import { readCachedSettings, sessionStore, toastErrors } from "@/helpers/formatStrings";
import { LoadingOverlay } from "@/components/SkeletonLoading";

// ────────────────────────────────────────────────
// Types — mirror the backend schema exactly
// ────────────────────────────────────────────────
export interface SystemSettings {
  locationId: string;
  saleToDeliveryMode: boolean;
  recordingOldTransactions: boolean;
  minimumSalePaymentPercentage: number;
  posPrinterSize: number;
  defaultPageSize: number;
  currency: string;
}

const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "XOF"];
const PRINTER_SIZES = [57, 80]; // mm — the two common thermal widths
const PAGE_SIZES = [10, 25, 50, 100];

export default function SystemSettingsPage() {
  const toast = useToaster();
  const { selectedShop } = useAuth();

  // null = not loaded yet. Never fall back to a hardcoded object.
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [original, setOriginal] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef<string | null>(null);

  const locationId =
    selectedShop || sessionStore.get("selectedShop") || "";

  const isDirty =
    !!settings && !!original && JSON.stringify(settings) !== JSON.stringify(original);

  // ────────────────────────────────────────────────
  // LOAD — API is the only source of defaults
  // ────────────────────────────────────────────────
  const loadSettings = useCallback(async (): Promise<void> => {
    if (!locationId) {
      setLoading(false);
      setError("No shop selected. Pick a shop to view its settings.");
      return;
    }

    if (inFlightRef.current === locationId) return;
    inFlightRef.current = locationId;

    try {
      setLoading(true);
      setError(null);

      const res = await axiosInstance.get(`/System/Settings/${locationId}`);
      const body = res?.data?.data ?? res?.data ?? {};

      
      // Trust the API. Coerce only for type-safety, do NOT inject defaults.
      const next: SystemSettings = {
        locationId: body.locationId ?? locationId,
        saleToDeliveryMode: Boolean(body.saleToDeliveryMode),
        recordingOldTransactions: Boolean(body.recordingOldTransactions),
        minimumSalePaymentPercentage: Number(body.minimumSalePaymentPercentage),
        posPrinterSize: Number(body.posPrinterSize),
        defaultPageSize: Number(body.defaultPageSize),
        currency: String(body.currency ?? ""),
      };

      setSettings(next);
      setOriginal(next);
      sessionStore.set("locationSettigs", JSON.stringify(settings))
    } catch (err: any) {
      console.error("Error loading settings:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to load settings. Please try again."
      );
      setSettings(null);
      setOriginal(null);
    } finally {
      if (inFlightRef.current === locationId) {
        inFlightRef.current = null;
      }
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    if (!locationId) {
      setLoading(false);
      setError("No shop selected. Pick a shop to view its settings.");
      return;
    }
    void loadSettings();
  }, [loadSettings, locationId]);

  // ────────────────────────────────────────────────
  // SAVE
  // ────────────────────────────────────────────────
  const save = async (): Promise<void> => {
    if (!locationId || !settings) {
      toast.warning({ title: "No shop selected", description: "" });
      return;
    }
    if (
      settings.minimumSalePaymentPercentage < 0 ||
      settings.minimumSalePaymentPercentage > 100
    ) {
      toast.warning({
        title: "Invalid percentage",
        description: "Minimum payment percentage must be between 0 and 100.",
      });
      return;
    }
    if (settings.defaultPageSize < 1) {
      toast.warning({
        title: "Invalid page size",
        description: "Default page size must be at least 1.",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: SystemSettings = { ...settings, locationId };
      await axiosInstance.put(`/System/Settings`, payload);

      setOriginal(payload);
      setSettings(payload);
      toast.success({
        title: "Settings saved",
        description: "Your changes have been applied.",
      });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toastErrors(toast, err);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (original) setSettings(original);
  };

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────
  return (
    <div className="w-full overflow-x-hidden">
      {(saving || loading) && <LoadingOverlay />}
      <Header title="System Settings" />
      <div className="p-2 sm:p-2 max-w-3xl mx-auto space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {/* Nothing below renders until the API has returned real settings. */}
        {settings && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  Sales & Transactions
                </CardTitle>
                <CardDescription>
                  Control how sales and old transactions are handled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-4 border border-border rounded-lg p-2">
                  <Label htmlFor="currency" className="text-sm font-medium">
                    Currency
                  </Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(v) =>
                      setSettings((s) => (s ? { ...s, currency: v } : s))
                    }
                  >
                    <SelectTrigger id="currency" className="max-w-[200px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start justify-between gap-4 border border-border rounded-lg p-2">
                  <div>
                    <Label htmlFor="saleToDeliveryMode" className="text-sm font-medium">
                      Sale-to-Delivery Mode
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send sales straight to delivery instead of requiring manual conversion.
                    </p>
                  </div>
                  <Switch
                    id="saleToDeliveryMode"
                    checked={settings.saleToDeliveryMode}
                    onCheckedChange={(v) =>
                      setSettings((s) => (s ? { ...s, saleToDeliveryMode: v } : s))
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 border border-border rounded-lg p-2">
                  <div>
                    <Label htmlFor="recordingOldTransactions" className="text-sm font-medium">
                      Recording Old Transactions
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allow back-dated entries for transactions from previous periods.
                    </p>
                  </div>
                  <Switch
                    id="recordingOldTransactions"
                    checked={settings.recordingOldTransactions}
                    onCheckedChange={(v) =>
                      setSettings((s) => (s ? { ...s, recordingOldTransactions: v } : s))
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 border border-border rounded-lg p-2">
                  <div>
                    <Label htmlFor="minimumSalePaymentPercentage" className="text-sm font-medium">
                      Minimum Sale Payment (%)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Minimum amount a customer must pay up-front before a sale is accepted. 0 = no minimum.
                    </p>
                  </div>
                  <Input
                    id="minimumSalePaymentPercentage"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.minimumSalePaymentPercentage}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              minimumSalePaymentPercentage:
                                Number(e.target.value) || 0,
                            }
                          : s
                      )
                    }
                    className="max-w-[160px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Display & Device ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Display & Device</CardTitle>
                <CardDescription>
                  Applies to POS printer output and table page sizes across the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1.5 border border-border rounded-lg p-2">
                  <Label htmlFor="posPrinterSize" className="text-sm font-medium">
                    POS Printer Size (mm)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Paper width used for receipts and labels.
                  </p>
                  <Select
                    value={String(settings.posPrinterSize)}
                    onValueChange={(v) =>
                      setSettings((s) => (s ? { ...s, posPrinterSize: Number(v) } : s))
                    }
                  >
                    <SelectTrigger id="posPrinterSize" className="max-w-[200px]">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINTER_SIZES.map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p} mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 border border-border rounded-lg p-2">
                  <Label htmlFor="defaultPageSize" className="text-sm font-medium">
                    Default Page Size
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Number of rows shown per page in paginated tables.
                  </p>
                  <Select
                    value={String(settings.defaultPageSize)}
                    onValueChange={(v) =>
                      setSettings((s) => (s ? { ...s, defaultPageSize: Number(v) } : s))
                    }
                  >
                    <SelectTrigger id="defaultPageSize" className="max-w-[200px]">
                      <SelectValue placeholder="Select page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ── Footer actions ── */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-3 py-2 flex flex-row justify-end gap-2 sm:gap-3 -mx-2 sm:-mx-4">
              <Button
                variant="outline"
                onClick={cancel}
                disabled={!isDirty || saving}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={!isDirty || saving || !locationId}
                className="flex-1 sm:flex-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {toast.ToastComponent}
    </div>
  );
}