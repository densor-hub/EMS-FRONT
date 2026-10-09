'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  LucideShoppingCart,
  SendToBackIcon,
  PlusCircleIcon,
  AwardIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  {
    label: 'Sales',
    href: '/sales',
    icon: <Receipt size={20} />,
    children: [
      { label: 'Sale', href: '/sales/sale' },
      { label: 'Deliveries', href: '/sales/deliveries' },
      { label: 'Customer Sales', href: '/sales/customer-sales' },
    ],
  },
  {
    label: 'Coupons',
    href: '/coupons',
    icon: <AwardIcon size={20} />,
  },
  {
    label: 'Disbursements',
    href: '/disbursements',
    icon: <LucideShoppingCart size={20} />,
    children: [
      { label: 'Miscellaneous', href: '/disbursements/miscellaneous' },
      { label: 'Miscellaneous Approval', href: '/disbursements/miscellaneous-approval' },
      { label: 'Deposits', href: '/disbursements/deposits' },
    ],
  },
  {
    label: 'Stock Management',
    href: '/stock-management/stock',
    icon: <LucideShoppingCart size={20} />,
    children: [
      { label: 'Stock Lock', href: '/stock-management/stock-lock' },
      { label: 'Stock Take', href: '/stock-management/stock-take' },
      { label: 'Stock Verification', href: '/stock-management/stock-verification' },
    ],
  },
  {
    label: 'Transfers',
    href: '/transfers',
    icon: <SendToBackIcon size={20} />,
    children: [
      { label: 'Requests', href: '/transfers/requests' },
      { label: 'Manager Check', href: '/transfers/manager-check' },
      { label: 'Deliveries', href: '/transfers/deliveries' },
      { label: 'Receivals', href: '/transfers/receivals' },
    ],
  },
  {
    label: 'Purchases',
    href: '/purchases',
    icon: <PlusCircleIcon size={20} />,
    children: [
      { label: 'Request', href: '/purchases/request' },
      { label: 'Manager Check', href: '/purchases/manager-check' },
      { label: 'Receivals', href: '/purchases/receivals' },
      { label: 'Payments', href: '/purchases/payments' },
    ],
  },
  {
    label: 'Set up',
    href: '/dashboard/setup',
    icon: <Settings size={20} />,
    children: [
      { label: 'Shops', href: '/setup/shops' },
      { label: 'Roles & Permissions', href: '/setup/roles' },
      { label: 'Employees', href: '/setup/employees' },
      { label: 'Items', href: '/setup/items' },
      { label: 'Customers', href: '/setup/customers' },
      { label: 'Suppliers', href: '/setup/suppliers' },
      { label: 'Financial Institutions', href: '/setup/financial-institutions' },
    ],
  },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={20} /> },
];

const filterNavByRoutes = (
  items: NavItem[],
  allowedCodes: Set<string>
): NavItem[] => {
  return items.flatMap((item) => {
    const filteredChildren = item.children
      ? filterNavByRoutes(item.children, allowedCodes)
      : undefined;

    const hasChildren = !!filteredChildren && filteredChildren.length > 0;
    const selfAllowed = allowedCodes.has(item.href);

    if (!hasChildren && !selfAllowed) return [];

    const next: NavItem = {
      label: item.label,
      href: item.href,
      icon: item.icon,
    };

    if (hasChildren) {
      next.children = filteredChildren;
    }

    return [next];
  });
};

const NavItemRenderer = ({
  item,
  level = 0,
  expandedItems,
  toggleExpanded,
  isActive,
  isParentActive,
  onClose,
}: {
  item: NavItem;
  level?: number;
  expandedItems: string[];
  toggleExpanded: (label: string) => void;
  isActive: (href: string) => boolean;
  isParentActive: (item: NavItem) => boolean;
  onClose: () => void;
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.includes(item.label);
  const isItemActive = isActive(item.href);
  const isItemParentActive = isParentActive(item);

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => toggleExpanded(item.label)}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isItemParentActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          style={{ paddingLeft: `${level * 8 + 12}px` }}
        >
          <span className="flex items-center gap-3">
            {item.icon}
            {item.label}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {isExpanded && (
          <ul className="mt-1 space-y-1 border-l border-border ml-4 pl-3">
            {item.children!.map((child) => (
              <NavItemRenderer
                key={child.href}
                item={child}
                level={level + 1}
                expandedItems={expandedItems}
                toggleExpanded={toggleExpanded}
                isActive={isActive}
                isParentActive={isParentActive}
                onClose={onClose}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        prefetch={false}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          isItemActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
        style={{ paddingLeft: `${level * 8 + 12}px` }}
      >
        {item.icon}
        {item.label}
      </Link>
    </li>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, company, selectedShop } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const allowedCodes = useMemo(() => {
    const codes = (user as any)?.routes?.map((x: any) => x.code) ?? [];
    return new Set<string>(codes);
  }, [(user as any)?.routes]);

  const visibleNavItems = useMemo(() => {
    const routes = (user as any)?.routes;
    if (!routes || routes.length === 0) return [];
    return filterNavByRoutes(navItems, allowedCodes);
  }, [(user as any)?.routes, allowedCodes]);

  // Auto-expand parent when a child route is active
  useEffect(() => {
    const findActiveMenus = (): string[] => {
      const activeMenus: string[] = [];

      const topLevelItem = navItems.find((item) => item.href === pathname);
      if (topLevelItem) {
        if (topLevelItem.children && topLevelItem.children.length > 0) {
          activeMenus.push(topLevelItem.label);
        }
        return activeMenus;
      }

      for (const item of navItems) {
        if (item.children) {
          for (const child of item.children) {
            if (pathname === child.href) {
              activeMenus.push(item.label);
              return activeMenus;
            }
            if (child.children) {
              for (const grandchild of child.children) {
                if (pathname === grandchild.href) {
                  activeMenus.push(item.label);
                  if (!activeMenus.includes(child.label)) {
                    activeMenus.push(child.label);
                  }
                  return activeMenus;
                }
              }
            }
          }
        }
      }

      return activeMenus;
    };

    const activeMenus = findActiveMenus();
    if (activeMenus.length > 0) {
      setExpandedItems((prev) => [...new Set([...prev, ...activeMenus])]);
    }
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href;

  const isParentActive = (item: NavItem) => {
    if (!item.children) return false;
    const checkChildren = (children: NavItem[]): boolean => {
      for (const child of children) {
        if (pathname === child.href) return true;
        if (child.children && checkChildren(child.children)) return true;
      }
      return false;
    };
    return checkChildren(item.children) || pathname === item.href;
  };

  const NavContent = () => (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-border h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Building2 size={20} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-xs text-muted-foreground truncate">
              {(company as any)?.name || 'Company Name'}
            </h2>
            <p className="font-semibold text-foreground truncate">
              {(user as any)?.locations?.find(
                (x: any) => String(x.id) === String(selectedShop)
              )?.name ?? ''}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavItemRenderer
              key={item.label}
              item={item}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
              isActive={isActive}
              isParentActive={isParentActive}
              onClose={() => setIsMobileOpen(false)}
            />
          ))}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/dashboard/settings"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Settings size={20} />
          Settings
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-sidebar">
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed mt-1.5 left-4 z-50 p-2 rounded-lg bg-card border border-border text-foreground"
      >
        <Menu size={12} />
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded text-muted-foreground hover:text-foreground z-10"
        >
          <X size={20} />
        </button>
        <NavContent />
      </aside>

      <aside className="hidden lg:block w-72 border-r border-sidebar-border sticky top-0">
        <NavContent />
      </aside>
    </div>
  );
}