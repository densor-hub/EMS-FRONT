import { Inter, Courier_Prime } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { AuthGuard } from '@/routes/auth-guard';
import { Suspense } from 'react';
import IdleTimer from '@/components/util/IdleTimer';
import './globals.css';

// Optional: Use a lightweight skeleton for Suspense instead of a heavy overlay
import { AppInitializationSkeleton } from '@/components/SkeletonLoading';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-courier-prime',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} ${courierPrime.variable}`}>
      <body>
        <AuthProvider>
          <AuthGuard>
            <IdleTimer />
            {/* 
              Use a lighter fallback. If you want absolutely no wait here, 
              you can replace the fallback with null or a simple div. 
            */}
            <Suspense fallback={<AppInitializationSkeleton />}>
              {children}
            </Suspense>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}