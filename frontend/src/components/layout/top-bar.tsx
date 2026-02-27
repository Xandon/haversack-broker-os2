'use client';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function TopBar(): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-muted-foreground">
            {user.firstName} {user.lastName}
            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">
              {user.role}
            </span>
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
