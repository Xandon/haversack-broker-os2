'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface SearchComboboxProps<T> {
  onSearch: (query: string) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  placeholder?: string;
  maxResults?: number;
  debounceMs?: number;
  className?: string;
}

function SearchCombobox<T>({
  onSearch,
  renderItem,
  onSelect,
  placeholder = 'Search...',
  maxResults = 10,
  debounceMs = 300,
  className,
}: SearchComboboxProps<T>): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<T[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = React.useCallback(
    (value: string) => {
      setQuery(value);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (!value.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      timerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const items = await onSearch(value);
          setResults(items.slice(0, maxResults));
          setIsOpen(items.length > 0);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [onSearch, maxResults, debounceMs],
  );

  React.useEffect(() => {
    return (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading && <div className="px-3 py-2 text-small text-muted-foreground">Searching...</div>}
          {!isLoading && results.length === 0 && query.trim() && (
            <div className="px-3 py-2 text-small text-muted-foreground">No results found</div>
          )}
          {results.map((item, index) => (
            <button
              key={index}
              type="button"
              className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
                setQuery('');
                setResults([]);
              }}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { SearchCombobox };
