'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Package, Loader2 } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGlobalSearch } from '@/hooks/use-global-search';
import type { GlobalSearchResult } from '@haversack/shared';

export function CommandPalette(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { accounts, contacts, products, isLoading, isError } = useGlobalSearch(query);

  const hasResults = accounts.length > 0 || contacts.length > 0 || products.length > 0;
  const queryTooShort = query.length > 0 && query.length < 2;

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Clear query when palette closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (result: GlobalSearchResult): void => {
      setOpen(false);
      router.push(result.url);
    },
    [router],
  );

  const handleOpenChange = useCallback((value: boolean): void => {
    setOpen(value);
  }, []);

  const handleValueChange = useCallback((value: string): void => {
    setQuery(value);
  }, []);

  const iconForType = (type: string): React.ReactElement => {
    switch (type) {
      case 'account':
        return <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'contact':
        return <User className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'product':
        return <Package className="mr-2 h-4 w-4 text-muted-foreground" />;
      default:
        return <></>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search accounts, contacts, products..."
            value={query}
            onValueChange={handleValueChange}
          />
          <CommandList>
            {isLoading && query.length >= 2 && (
              <div className="flex items-center justify-center py-6" role="status">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {queryTooShort && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </div>
            )}

            {isError && query.length >= 2 && !isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Search unavailable. Please try again.
              </div>
            )}

            {!isLoading && !isError && !queryTooShort && query.length >= 2 && !hasResults && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {accounts.length > 0 && (
              <CommandGroup heading="Accounts">
                {accounts.map((result) => (
                  <CommandItem
                    key={`account-${result.id}`}
                    value={`account-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    {iconForType(result.type)}
                    <span>{result.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {result.secondaryText}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {contacts.map((result) => (
                  <CommandItem
                    key={`contact-${result.id}`}
                    value={`contact-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    {iconForType(result.type)}
                    <span>{result.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {result.secondaryText}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {products.length > 0 && (
              <CommandGroup heading="Products">
                {products.map((result) => (
                  <CommandItem
                    key={`product-${result.id}`}
                    value={`product-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    {iconForType(result.type)}
                    <span>{result.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {result.secondaryText}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
