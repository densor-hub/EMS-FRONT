// components/protected-route.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthState } from '@/lib/customAxios';

export function PublicRoute({ children }: { children: React.ReactNode }) {
  
  const router = useRouter();
  var authState = getAuthState();

  useEffect(() => {
    var authState = getAuthState();
     console.log(authState)
  }, [])

  console.log(authState)
  if  (authState?.user?.id && authState?.isAuthenticated) {
     return  router.push("/dashboard")
    } 

  return <>{children}</>;
}