// components/public-route.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingOverlay } from '@/components/SkeletonLoading';

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // While we don't know the auth state yet, show a loader
  // so we don't flash the login page for a logged-in user.
  if (isLoading) {
    return <LoadingOverlay />;
  }

  // If authenticated, don't render children — the effect will redirect.
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}