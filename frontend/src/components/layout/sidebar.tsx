'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, type AuthUser } from '@/providers/auth-provider';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Calendar,
  CheckSquare,
  Target,
  DollarSign,
  Settings,
  Zap,
  Package,
  Tag,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AuthUser['role'][];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/brands', label: 'Brands', icon: Tag },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/activities', label: 'Activities', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/opportunities', label: 'Pipeline', icon: Target },
  { href: '/commissions', label: 'Commissions', icon: DollarSign, roles: ['admin', 'manager', 'rep'] },
  { href: '/admin/rules', label: 'Rules', icon: Zap, roles: ['admin'] },
  { href: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
];

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex" role="navigation" aria-label="Main navigation">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-semibold">
          Haversack
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
