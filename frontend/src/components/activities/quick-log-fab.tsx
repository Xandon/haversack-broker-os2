'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickLogFabProps {
  onClick: () => void;
}

function QuickLogFab({ onClick }: QuickLogFabProps): React.ReactElement {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg min-h-[44px] min-w-[44px]"
      size="icon"
      aria-label="Log activity"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}

export { QuickLogFab };
