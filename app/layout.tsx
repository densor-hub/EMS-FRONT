// app/layout.tsx
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context';
import Loading from '@/components/ui/loading-global';
import { ToastProvider, ToastViewport } from '@/components/ui/toast'; // Import your Toast components
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AuthProvider>
          <ToastProvider> {/* Wrap with ToastProvider */}
            <Loading/>
            {children}
            <ToastViewport /> {/* Add ToastViewport for positioning */}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}