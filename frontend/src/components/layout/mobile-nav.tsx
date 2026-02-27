'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, type AuthUser } from '@/providers/auth-provider';
import { X } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Calendar,
  Target,
  DollarSign,
  Settings,
  Zap,
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
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/activities', label: 'Activities', icon: Calendar },
  { href: '/opportunities', label: 'Pipeline', icon: Target },
  { href: '/commissions', label: 'Commissions', icon: DollarSign, roles: ['admin', 'manager', 'rep'] },
  { href: '/admin/rules', label: 'Rules', icon: Zap, roles: ['admin'] },
  { href: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps): React.ReactElement | null {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!isOpen) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-xl">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="text-lg font-semibold">Haversack</span>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2" role="navigation" aria-label="Main navigation">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
