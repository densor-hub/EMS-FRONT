// components/auth-guard.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!user && !isAuthenticated) {
       router.replace('/auth/login');
    }
  }, []);

  return <>{children}</>;
}