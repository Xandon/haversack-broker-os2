'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchTriggerProps {
  onClick: () => void;
}

export function SearchTrigger({ onClick }: SearchTriggerProps): React.ReactElement {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        (navigator.platform?.toUpperCase().includes('MAC') ?? false),
    );
  }, []);

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative h-9 w-full justify-start gap-2 text-sm text-muted-foreground sm:w-64"
      aria-label="Open search"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline-flex">Search...</span>
      <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
        {isMac ? '⌘' : 'Ctrl+'}K
      </kbd>
    </Button>
  );
}
