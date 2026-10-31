'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingOverlay } from '@/components/SkeletonLoading';

// Routes that are accessible without authentication.
// Everything NOT in this list is protected by default.
const PUBLIC_PREFIXES = [
  '/auth',       // /auth/login, /auth/signup, /auth/forgot-password, ...
  '/terms',
  '/privacy',
  '/' // if your root page is a public landing page.
  // Add any other public routes here.
];

// Routes that require auth but not a selected shop.
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

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return <>{children}</>;
}