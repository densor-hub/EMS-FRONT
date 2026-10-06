'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, User, Home, ChevronDown, Check } from 'lucide-react';
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

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user, userLogOut, selectedShop, setSelectedShop } = useAuth();
  const [isLoading, setIsLoading] = useState(false)
  const locations = user?.locations ?? [];

  const [activeShopId, setActiveShopId] = useState<string | undefined>(
    selectedShop ?? undefined
  );

  // ────────────────────────────────────────────
  // 1. Initial hydration — NO reload here
  // ────────────────────────────────────────────
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

  // ────────────────────────────────────────────
  // 2. Explicit switch — reload here
  // ────────────────────────────────────────────
  const handleSelectShop = (id: string) => {
    if (id === activeShopId) return; // no-op if same

    setActiveShopId(id);
    setSelectedShop(id);
    sessionStorage.setItem('selectedShop', id);

    // Force a full reload so every page refetches with the new location
    window.location.reload();
  };

  return (
   <>
    {isLoading && <LoadingOverlay/>}
       <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border p-0 h-16">
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm md:text-xl lg:text-2xl font-semibold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-4">
          {/* Location selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 max-w-[180px] sm:max-w-[240px]"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-foreground truncate">
                  {activeLocation?.name || 'Select Location'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
  <DropdownMenuLabel>Switch Location</DropdownMenuLabel>
  <DropdownMenuSeparator />
  {locations.length === 0 ? (
    <DropdownMenuItem disabled>No locations available</DropdownMenuItem>
  ) : (
    locations.map((loc: any) => {
      const isActive = loc.id === activeShopId;
      return (
        <DropdownMenuItem
          key={loc.id}
          onClick={() => handleSelectShop(loc.id)}
          className={`flex items-center justify-between gap-2 cursor-pointer border-l-2 ${
            isActive
              ? 'bg-primary/40 border-primary'
              : 'border-transparent'
          }`}
        >
          <div className="flex flex-col min-w-0">
            <span
              className={`text-sm truncate ${
                isActive ? 'font-semibold' : 'font-medium'
              }`}
            >
              {loc.name}
            </span>
          </div>
          {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
        </DropdownMenuItem>
      );
    })
  )}
</DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setIsLoading(true)
                userLogOut()
              }} className="text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
   </>
  );
}