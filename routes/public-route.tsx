'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Routes where a logged-in user should NOT stay.
// If they're authenticated and land on one of these, redirect them away.
const PUBLIC_ONLY_PREFIXES = [
  '/auth/login',
  '/auth/signup',
  '/auth/confirm', 
  '/auth/forgot-password',
  '/auth/reset-password',
  '/'
];

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, selectedShop } = useAuth();

  const isPublicOnly = PUBLIC_ONLY_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isPublicOnly) return;
    if (!isAuthenticated) return;

    // Authenticated user on a public-only page → send them where they belong.
    router.replace(selectedShop ? '/dashboard' : '/select-shop');
  }, [isLoading, isAuthenticated, isPublicOnly, selectedShop, router, pathname]);

  if (isLoading) {
    return null;
  }

  if (isPublicOnly && isAuthenticated) {
    return null;     // prevent flash before redirect fires
  }

  return <>{children}</>;
}