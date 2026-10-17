'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingOverlay } from '@/components/SkeletonLoading';

// Paths that are allowed without a selected shop / without auth
const PUBLIC_PREFIXES = ['/select-shop', '/setup', '/auth'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, selectedShop, isLoading } = useAuth();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    // 1. Wait for auth hydration to finish.
    if (isLoading) return;

    // 2. Auth failures are handled by ProtectedRoute / PublicRoute.
    //    AuthGuard's only job is the shop-selection check.
    if (!isAuthenticated) return;

    // 3. Public paths (login, select-shop, setup) don't need a shop.
    if (isPublic) return;

    // 4. ✅ Single source of truth: context state only.
    //    Do NOT also read sessionStorage — that's a second source of
    //    truth that can be stale mid-logout and cause redirect loops.
    if (!selectedShop) {
      router.replace('/select-shop');
    }
  }, [isLoading, isAuthenticated, selectedShop, isPublic, router]);

  // Block render during initial hydration, but only when we don't yet
  // know who the user is. Not tied to user?.id.
  if (isLoading) {
    return <LoadingOverlay />;
  }

  return <>{children}</>;
}