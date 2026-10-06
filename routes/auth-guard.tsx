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
  const { user, selectedShop, isLoading } = useAuth();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    // Wait for auth to finish hydrating
    if (isLoading) return;

    // Not logged in → handled elsewhere (or send to login)
    if (!user?.id) return;

    // Already on a public path → nothing to do
    if (isPublic) return;

    // Logged in but no shop chosen → go pick one
    const shop = selectedShop || sessionStorage.getItem('selectedShop');
    if (!shop) {
      router.replace('/select-shop');
    }
  }, [isLoading, user, selectedShop, isPublic, router, pathname]);

  // Block render until we know who the user is
  if (isLoading && !user?.id) {
    return <LoadingOverlay />;
  }

  return <>{children}</>;
}