'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Store } from 'lucide-react';

export default function SelectShopPage() {
  const router = useRouter();
  const { user, setSelectedShop, selectedShop } = useAuth();
  const [selected, setSelected] = useState<string>('');

  const locations = user?.locations ?? [];
  const hasLocations = locations.length > 0;

  // If the user already has a shop selected, skip this page
  useEffect(() => {
    if (selectedShop) {
      router.replace('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user picks a shop, persist and navigate
  useEffect(() => {
    if (!selected) return;
    setSelectedShop(selected);
    sessionStorage.setItem('selectedShop', selected);
    router.replace('/dashboard');
  }, [selected, router, setSelectedShop]);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Select Shop" />

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="w-full max-w-md mx-auto">
          {/* Icon badge */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Greeting */}
          <div className="text-center mb-6">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              Hi {user?.firstName || 'there'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasLocations
                ? 'Select a shop to continue'
                : 'Set up your first shop to continue'}
            </p>
          </div>

          {/* Body */}
          {hasLocations ? (
            <div className="w-full">
              <Select value={selected} onValueChange={setSelected}>
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
            <div className="flex justify-center">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/setup/shops');
                }}
                className="w-full sm:w-auto h-11 px-6 text-sm"
              >
                Set up shops
              </Button>
            </div>
          )}

          {/* Helper text */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            You can change your shop anytime from the header.
          </p>
        </div>
      </div>
    </div>
  );
}