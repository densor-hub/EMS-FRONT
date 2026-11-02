'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Store } from 'lucide-react';
import { readCachedSettings, sessionStore, SETTINGS_CACHE_KEY } from '@/helpers/formatStrings';
import { SystemSettings } from '../settings/page';
import axiosInstance from '@/lib/customAxios';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { toast } from 'sonner';
// import { settings } from '@/components/util/AppConfig';

export const loadSettings = async (id: string): Promise<boolean> => {
  try {
    // 1. Set the shop in sessionStore FIRST so Axios interceptor uses it
    sessionStore.set("selectedShop", id); 
    
    const res = await axiosInstance.get(`/System/Settings/${id}`);
    
    // Debugging: Check what the API actually returns
    console.log("RAW API SETTINGS:", res?.data); 

    const body = res?.data?.data ?? res?.data ?? {};

    const settingValue: SystemSettings = {
      // Force the locationId to be the one we passed in, not what the API returned
      locationId: "",//body.locationId || id, 
      saleToDeliveryMode: Boolean(body.saleToDeliveryMode),
      recordingOldTransactions: Boolean(body.recordingOldTransactions),
      minimumSalePaymentPercentage: Number(body.minimumSalePaymentPercentage),
      posPrinterSize: Number(body.posPrinterSize),
      defaultPageSize: Number(body.defaultPageSize),
      currency: String(body.currency ?? ""),
    };

       // 2. Save it
    sessionStore.set(SETTINGS_CACHE_KEY, JSON.stringify(settingValue));

    return true;
  } catch (err: any) {
    console.error("Error loading settings:", err);
    return false;
  }
};

export default function SelectShopPage() {
  const router = useRouter();
  const { user, setSelectedShop, isLoading } = useAuth();
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const locations = user?.locations ?? [];
  const hasLocations = locations.length > 0;

  const handleSelect = async (id: string) => {
    if (loading) return;
    
    setLoading(true);
    setSelected(id);

    // Call loadSettings which now updates the sessionStore first
    const success = await loadSettings(id);

    if (success) {
      setSelectedShop(id);
      window.location.href = '/dashboard';
    } else {
      toast.error("Failed to load shop settings. Please try again.");
      setSelected("");
      setLoading(false);
    }
  };

  if (isLoading || !user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <>
      {loading && <LoadingOverlay />}
      <div className="min-h-screen bg-background">
        <Header title="Select Shop" />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                Hi {user?.firstName || 'there'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasLocations ? 'Select a shop to continue' : 'Set up your first shop to continue'}
              </p>
            </div>

            {hasLocations ? (
              <div className="w-full">
                <Select value={selected} onValueChange={handleSelect} disabled={loading}>
                  <SelectTrigger className="w-full bg-background border-border h-11 text-sm">
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((shop: any) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/setup/shops';
                  }}
                  className="w-full sm:w-auto h-11 px-6 text-sm"
                >
                  Set up shops now
                </Button>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              You can change your shop anytime from the header.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}