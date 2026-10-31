import { Inter, Courier_Prime } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { AuthGuard } from '@/routes/auth-guard';    // adjust path if different
import { LoadingOverlay } from '@/components/SkeletonLoading';
import './globals.css';
import { Suspense } from 'react';
import IdleTimer from '@/components/util/IdleTimer';

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
            <Suspense fallback={<LoadingOverlay />}>
              {children}
            </Suspense>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}