// components/auth-guard.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingOverlay } from '@/components/SkeletonLoading';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render anything (or render a loader) until we know the auth state.
  // Otherwise you'll flash protected content to unauthenticated users.
  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!isAuthenticated) {
    return null; // redirect fires from the effect
  }

  return <>{children}</>;
}