// app/components/GlobalLoadingOverlay.tsx
'use client';

import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingOverlay } from "@/components/SkeletonLoading";

export default function GlobalLoadingOverlay() {
  const { pending } = useLinkStatus();
  const pathname = usePathname();
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // Track route changes
  useEffect(() => {
    setIsRouteLoading(false);
  }, [pathname]);

  // Show loading if either link is pending or route is loading
  const isLoading = pending || isRouteLoading;

  if (!isLoading) return null;

  return <LoadingOverlay />;
}