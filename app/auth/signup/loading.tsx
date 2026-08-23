// app/dashboard/loading.tsx
'use client';

import { useLinkStatus } from 'next/link';
import { LoadingOverlay } from "@/components/SkeletonLoading";

export default function Loading() {
  const { pending } = useLinkStatus();
  
  // Only show loading if navigation is pending
  // This prevents showing the overlay when not needed
  if (!pending) return null;
  
  return <LoadingOverlay />
}