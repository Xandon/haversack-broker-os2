'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Package, Loader2, X } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { GlobalSearchResult } from '@haversack/shared';

export function CommandPalette(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { accounts, contacts, products, isLoading, isError, refetch } = useGlobalSearch(query);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const hasResults = accounts.length > 0 || contacts.length > 0 || products.length > 0;
  const queryTooShort = query.length > 0 && query.length < 2;

  // Live region announcement text
  const resultAnnouncement = useMemo((): string => {
    if (!hasResults || query.length < 2) return '';
    const parts: string[] = [];
    if (accounts.length > 0) parts.push(`${accounts.length} account${accounts.length !== 1 ? 's' : ''}`);
    if (contacts.length > 0) parts.push(`${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`);
    if (products.length > 0) parts.push(`${products.length} product${products.length !== 1 ? 's' : ''}`);
    return `${parts.join(', ')} found`;
  }, [accounts.length, contacts.length, products.length, hasResults, query.length]);

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

  const handleClose = useCallback((): void => {
    setOpen(false);
  }, []);

  const handleRetry = useCallback((): void => {
    refetch();
  }, [refetch]);

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
      <DialogContent
        className={`overflow-hidden p-0 ${isMobile ? 'fixed inset-0 h-full w-full max-w-full rounded-none' : ''}`}
        aria-label="Global search"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10"
            onClick={handleClose}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search accounts, contacts, products..."
            value={query}
            onValueChange={handleValueChange}
          />
          <CommandList className={isMobile ? 'max-h-[calc(100vh-56px)]' : ''}>
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
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <span>Search unavailable. Please try again.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  aria-label="Retry search"
                >
                  Retry
                </Button>
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
                    <div className="flex flex-col">
                      <span>{result.name}</span>
                      {result.tertiaryText && (
                        <span className="text-xs text-muted-foreground">{result.tertiaryText}</span>
                      )}
                    </div>
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

        {/* Live region for screen reader announcements */}
        {resultAnnouncement && (
          <div
            role="status"
            aria-label="Search results"
            aria-live="polite"
            className="sr-only"
          >
            {resultAnnouncement}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
