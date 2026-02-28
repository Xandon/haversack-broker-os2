'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Accounts', href: '/accounts', icon: '🏢' },
  { label: 'Orders', href: '/orders', icon: '📦' },
  { label: 'Pipeline', href: '/pipeline', icon: '🎯' },
  { label: 'Products', href: '/products', icon: '🏷️' },
  { label: 'Brands', href: '/brands', icon: '🏭' },
  { label: 'Commissions', href: '/commissions', icon: '💰' },
  { label: 'Reports', href: '/reports', icon: '📈' },
] as const;

const ADMIN_ITEMS = [
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Import', href: '/admin/imports', icon: '📥' },
  { label: 'Rules', href: '/admin/rules', icon: '⚙️' },
  { label: 'Data Quality', href: '/admin/data-quality', icon: '✅' },
] as const;

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={`flex h-full flex-col border-r border-gray-200 bg-white transition-all ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-bold text-gray-900">
            Haversack
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className="text-base" aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-gray-200 pt-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Admin
            </p>
          )}
          <ul className="space-y-1">
            {ADMIN_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span className="text-base" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
