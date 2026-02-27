'use client';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';

interface TopBarProps {
  onToggleNav?: () => void;
}

export function TopBar({ onToggleNav }: TopBarProps): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6" role="banner">
      <div className="flex items-center gap-2">
        {onToggleNav && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleNav}
            className="min-h-[44px] min-w-[44px] md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {user && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.firstName} {user.lastName}
            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">
              {user.role}
            </span>
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          aria-label="Sign out"
          className="min-h-[44px] min-w-[44px]"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
