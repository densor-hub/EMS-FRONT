// components/protected-route.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const {  isAuthenticated} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, []);

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}