import { Inter, Courier_Prime } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context';
import Loading from '@/components/ui/loading-global';
// import { Toaster } from '@/components/ui/toaster';
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-courier-prime',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} ${courierPrime.variable}`}>
      <body>
        <AuthProvider>
          <Loading/>
          {children}
          {/* <Toaster /> */}
        </AuthProvider>
      </body>
    </html>
  );
}