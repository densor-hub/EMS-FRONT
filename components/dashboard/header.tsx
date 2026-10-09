'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { User, Home, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LoadingOverlay } from '../SkeletonLoading';
import {DynamicBreadcrumb} from '../util/Breadcrumb';
import { BreadcrumbPage } from '../ui/breadcrumb';

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user, userLogOut, selectedShop, setSelectedShop } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const locations = user?.locations ?? [];

  const [activeShopId, setActiveShopId] = useState<string | undefined>(
    selectedShop ?? undefined
  );

  // 1. Initial hydration — no reload
  useEffect(() => {
    const stored = sessionStorage.getItem('selectedShop');

    if (stored) {
      setActiveShopId(stored);
      if (stored !== selectedShop) setSelectedShop(stored);
    } else if (selectedShop) {
      setActiveShopId(selectedShop);
    } else if (locations.length > 0) {
      const firstId = locations[0].id;
      setActiveShopId(firstId);
      setSelectedShop(firstId);
      sessionStorage.setItem('selectedShop', firstId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.length]);

  const activeLocation = locations.find((l: any) => l.id === activeShopId);

  // 2. Explicit switch — reload here
  const handleSelectShop = (id: string) => {
    if (id === activeShopId) return;

    setActiveShopId(id);
    setSelectedShop(id);
    sessionStorage.setItem('selectedShop', id);

    window.location.reload();
  };

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border p-0 h-16">
        <div className="flex items-center justify-between px-2 pt-2">
          {/* Title — hidden on mobile */}
          <div className="flex-1 min-w-0" >
            <h1 className="hidden sm:block text-sm md:text-xl lg:text-2xl font-semibold text-foreground truncate">
              {title}
            </h1>
            {description && (
              <p className="hidden sm:block text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-0.5 ml-2">
            {/* Location selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-1.5 px-1.5 max-w-[140px] sm:max-w-[240px]"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <span className="hidden sm:block text-xs md:text-sm font-medium text-foreground truncate">
                    {activeLocation?.name || 'Select Location'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Switch Location</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {locations.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No locations available
                  </DropdownMenuItem>
                ) : (
                  locations.map((loc: any) => {
                    const isActive = loc.id === activeShopId;
                    return (
                      <DropdownMenuItem
                        key={loc.id}
                        onClick={() => handleSelectShop(loc.id)}
                        className={`flex items-center justify-between gap-2 cursor-pointer border-l-2 hover:!text-white hover:[&_svg]:!text-white ${
                          isActive
                            ? 'bg-primary/40 border-primary'
                            : 'border-transparent'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`truncate ${
                              isActive ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {loc.name}
                          </span>
                        </div>
                        {isActive && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1.5 px-1.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <span className="hidden sm:block text-xs md:text-sm font-medium text-foreground">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-[10px] md:text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsLoading(true);
                    userLogOut();
                  }}
                  className="text-destructive"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      <DynamicBreadcrumb/>

      </header>
      
      {/* <>I neead breadcrump here</> */}
      {/* <BreadcrumbPage/> */}
    </>
  );
}