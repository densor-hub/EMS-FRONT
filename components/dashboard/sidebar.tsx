'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LucideChartNetwork,
  LucideShoppingCart,
  SendToBackIcon,
  PlusCircleIcon
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
    label: 'Disbursements',
    href: '/disbursements',
    icon: <LucideChartNetwork size={20} />,
    children: [
      { label: 'Disbursements', href: '/disbursements/disbursement' },
      { label: 'Approval', href: '/disbursements/approval' },
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
     
    ],
  },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={20} /> },
];

// Recursive NavItem Component
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
  const {user} = useAuth()
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.includes(item.label);
  const isItemActive = isActive(item.href);
  const isItemParentActive = isParentActive(item);

  console.log(user)
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
            className={`transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
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
  const [sessionShop, setSessionShop] = useState<string | null>(null);
  const pathname = usePathname();
  const { company, user, selectedShop } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Get sessionShop safely on client side
  useEffect(() => {
    setSessionShop(sessionStorage.getItem("selectedShop"));
  }, []);

  // Auto-expand logic when pathname changes
  useEffect(() => {
    const findActiveMenus = (): string[] => {
      const activeMenus: string[] = [];

      // Check if path matches any top-level item exactly
      const topLevelItem = navItems.find(item => item.href === pathname);
      
      if (topLevelItem) {
        // If it's a top-level item with children, expand it
        if (topLevelItem.children && topLevelItem.children.length > 0) {
          activeMenus.push(topLevelItem.label);
        }
        // If it's a top-level item with NO children (Dashboard, Reports), fallback to POS
        else {
          const posItem = navItems.find(item => item.label === 'POS');
          if (posItem) {
            activeMenus.push('POS');
          }
        }
        return activeMenus;
      }

      // Check if path is a child of any menu
      // const findInChildren = (items: NavItem[], parentLabel?: string): boolean => {
      //   for (const item of items) {
      //     if (item.children) {
      //       // Check direct children
      //       for (const child of item.children) {
      //         if (pathname === child.href) {
      //           // Found a child - expand the parent
      //           if (parentLabel && !activeMenus.includes(parentLabel)) {
      //             activeMenus.push(parentLabel);
      //           }
      //           if (!activeMenus.includes(item.label)) {
      //             activeMenus.push(item.label);
      //           }
      //           return true;
      //         }
      //         // Check nested children (grandchildren)
      //         if (child.children) {
      //           for (const grandchild of child.children) {
      //             if (pathname === grandchild.href) {
      //               // Found a grandchild - expand parent and grandparent
      //               if (parentLabel && !activeMenus.includes(parentLabel)) {
      //                 activeMenus.push(parentLabel);
      //               }
      //               if (!activeMenus.includes(item.label)) {
      //                 activeMenus.push(item.label);
      //               }
      //               if (!activeMenus.includes(child.label)) {
      //                 activeMenus.push(child.label);
      //               }
      //               return true;
      //             }
      //           }
      //         }
      //       }
      //     }
      //   }
      //   return false;
      // };

      // Search through all navItems
      for (const item of navItems) {
        if (item.children) {
          // Check direct children first
          for (const child of item.children) {
            if (pathname === child.href) {
              activeMenus.push(item.label);
              return activeMenus;
            }
            // Check grandchildren
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

      // If no menu matched, fallback to POS
      const posItem = navItems.find(item => item.label === 'POS');
      if (posItem) {
        activeMenus.push('POS');
      }

      return activeMenus;
    };

    const activeMenus = findActiveMenus();
    setExpandedItems(prev => {
      // Merge existing expanded items with new active ones
      const merged = [...new Set([...prev, ...activeMenus])];
      return merged;
    });
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
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
      {/* Logo/Company */}
      <div className="p-4 border-b border-border h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Building2 size={20} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-xs text-muted-foreground truncate">
              {company?.name || 'Company Name'}
            </h2>
            <p className="font-semibold text-foreground truncate">
              {user?.locations?.find(x => x.id == (selectedShop || sessionShop))?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map(item => (
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

      {/* Footer */}
      <div className="border-t border-border ">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Settings size={20} />
          Settings
        </Link>
        {/* <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button> */}
      </div>
    </div>
  );

  return (
    <div className='bg-sidebar '>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border text-foreground"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
        <NavContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 border-r border-sidebar-border sticky top-0">
        <NavContent />
      </aside>
    </div>
  );
}