'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Don't make a redirect decision while auth is still resolving.
    if (isLoading) return;

    if (isAuthenticated) {
      // Use replace (not push) so the back button doesn't loop.
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't flash children while we know we're about to redirect.
  if (!isLoading && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}