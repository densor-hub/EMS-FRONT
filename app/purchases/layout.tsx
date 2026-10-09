import React from "react"
import { AuthProvider } from '@/lib/auth-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Copyright } from "@/components/util/Copyright";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 lg:ml-0">
          {children}

          <div className="m-2">
                            <Copyright/>
                          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
