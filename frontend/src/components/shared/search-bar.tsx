'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

import { useSearch } from '@/hooks/use-search';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface SearchBarProps {
  className?: string;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function SearchBar({ className }: SearchBarProps): React.JSX.Element {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: results, isLoading } = useSearch(debouncedQuery);

  // Debounce input changes (300ms)
  const handleInputChange = useCallback((value: string): void => {
    setInputValue(value);
    setActiveIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Open dropdown when there's a query
  useEffect(() => {
    const shouldOpen = debouncedQuery.trim().length >= 2;
    setIsOpen(shouldOpen);
  }, [debouncedQuery]);

  // Navigate to account
  const navigateToAccount = useCallback(
    (accountId: string): void => {
      setInputValue('');
      setDebouncedQuery('');
      setIsOpen(false);
      setActiveIndex(-1);
      router.push(`/accounts/${accountId}`);
    },
    [router],
  );

  // Close dropdown
  const closeDropdown = useCallback((): void => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (!isOpen) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        }
        case 'Enter': {
          event.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            const selected = results[activeIndex];
            if (selected) {
              navigateToAccount(selected.id);
            }
          }
          break;
        }
        case 'Escape': {
          event.preventDefault();
          closeDropdown();
          inputRef.current?.blur();
          break;
        }
      }
    },
    [isOpen, activeIndex, results, navigateToAccount, closeDropdown],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        inputRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  const showDropdown = isOpen && debouncedQuery.trim().length >= 2;
  const showNoResults = showDropdown && !isLoading && results.length === 0;
  const showResults = showDropdown && results.length > 0;
  const showLoading = showDropdown && isLoading;

  return (
    <div className={clsx('relative w-full sm:w-[300px]', className)}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search accounts..."
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedQuery.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls="search-results-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          aria-label="Search accounts"
        />
      </div>

      {showDropdown ? (
        <div
          ref={dropdownRef}
          id="search-results-listbox"
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {showLoading ? (
            <div className="px-4 py-3 text-center text-sm text-gray-500" role="status">
              Searching...
            </div>
          ) : null}

          {showNoResults ? (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              No results found
            </div>
          ) : null}

          {showResults
            ? results.map((result, index) => (
                <button
                  key={result.id}
                  id={`search-result-${index}`}
                  role="option"
                  type="button"
                  aria-selected={index === activeIndex}
                  className={clsx(
                    'flex w-full min-h-[44px] items-center gap-3 px-4 py-2 text-left transition-colors',
                    index === activeIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-900 hover:bg-gray-50',
                  )}
                  onClick={() => navigateToAccount(result.id)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{result.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {result.city} &middot; {result.account_type}
                    </p>
                  </div>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
