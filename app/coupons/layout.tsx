import React from "react"
import { Sidebar } from '@/components/dashboard/sidebar';
import { Copyright } from "@/components/util/Copyright";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="flex bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 lg:ml-0">
          {children}

          <div className="mx-2 relative bottom-8">
            <Copyright/>
          </div>
        </main>
      </div>
  );
}
