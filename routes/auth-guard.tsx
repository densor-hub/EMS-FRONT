'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
// Import the lightweight skeleton instead of the heavy LoadingOverlay
import { AppInitializationSkeleton } from '@/components/SkeletonLoading';

const PUBLIC_PREFIXES = [
  '/auth',
  '/terms',
  '/privacy',
  '/' 
];

const SHOP_EXEMPT_PREFIXES = [
  '/select-shop',
  '/setup',
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, selectedShop, isLoading } = useAuth();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isShopExempt = SHOP_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isLoading) return;

    // 1. Public pages always allowed.
    if (isPublic) return;

    // 2. Not authenticated → login.
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    // 3. Authenticated + shop-exempt pages → allowed without a shop.
    if (isShopExempt) return;

    // 4. Authenticated + protected + no shop → shop picker.
    if (!selectedShop) {
      router.replace('/select-shop');
    }
  }, [
    isLoading,
    isAuthenticated,
    selectedShop,
    isPublic,
    isShopExempt,
    router,
    pathname,
  ]);

  // FIX: If it's a public path (like /auth/login), render it IMMEDIATELY. 
  // Don't show a loading screen while checking a token we don't need yet.
  if (isPublic) {
    return <>{children}</>;
  }

  // FIX: For protected routes, show the lightweight skeleton instead of the blurring overlay.
  if (isLoading) {
    return <AppInitializationSkeleton />;
  }

  // Once loaded, render the app.
  return <>{children}</>;
}