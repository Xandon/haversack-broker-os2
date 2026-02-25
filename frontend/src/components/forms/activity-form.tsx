'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSearch } from '@/hooks/use-search';
import { useAuth } from '@/providers/auth-provider';

// -------------------------------------------------------------------
// Zod schema
// -------------------------------------------------------------------

const activityFormSchema = z.object({
  activityType: z.enum(['visit', 'call', 'email', 'demo', 'sampling', 'note'], {
    errorMap: () => ({ message: 'Activity type is required' }),
  }),
  accountId: z.string().min(1, 'Account is required'),
  accountName: z.string().optional(),
  contactId: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be 255 characters or fewer'),
  notes: z.string().optional(),
  durationMinutes: z
    .number({ invalid_type_error: 'Duration must be a number' })
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration must be 480 minutes or fewer')
    .optional()
    .or(z.literal(undefined)),
  productDemoed: z.string().optional(),
  quantitySampled: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .min(0, 'Quantity cannot be negative')
    .optional()
    .or(z.literal(undefined)),
  buyerFeedback: z.string().optional(),
  products: z.string().optional(),
  activityDate: z.string().min(1, 'Date is required'),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface Contact {
  id: string;
  name: string;
}

interface ActivityFormProps {
  onSubmit: (values: ActivityFormValues) => void;
  isLoading?: boolean;
  contacts?: Contact[];
  defaultAccountId?: string;
  defaultAccountName?: string;
}

// -------------------------------------------------------------------
// Activity type options
// -------------------------------------------------------------------

const ACTIVITY_TYPE_OPTIONS = [
  { value: '', label: 'Select activity type' },
  { value: 'visit', label: 'Visit' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'demo', label: 'Demo' },
  { value: 'sampling', label: 'Sampling' },
  { value: 'note', label: 'Note' },
] as const;

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function ActivityForm({
  onSubmit,
  isLoading = false,
  contacts = [],
  defaultAccountId,
  defaultAccountName,
}: ActivityFormProps): React.JSX.Element {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activityType: undefined,
      accountId: defaultAccountId ?? '',
      accountName: defaultAccountName ?? '',
      contactId: '',
      subject: '',
      notes: '',
      durationMinutes: undefined,
      productDemoed: '',
      quantitySampled: undefined,
      buyerFeedback: '',
      products: '',
      activityDate: getTodayDateString(),
    },
  });

  const activityType = watch('activityType');

  // Account search state
  const [accountSearch, setAccountSearch] = useState(defaultAccountName ?? '');
  const [debouncedAccountSearch, setDebouncedAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const { data: accountResults, isLoading: isSearching } = useSearch(debouncedAccountSearch);

  // Debounce account search input (300ms)
  const handleAccountSearchChange = useCallback(
    (value: string): void => {
      setAccountSearch(value);
      setValue('accountId', '');
      setValue('accountName', '');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setDebouncedAccountSearch(value);
      }, 300);
    },
    [setValue],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Open dropdown when search has results
  useEffect(() => {
    setShowAccountDropdown(debouncedAccountSearch.trim().length >= 2);
  }, [debouncedAccountSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    }

    if (showAccountDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccountDropdown]);

  const selectAccount = useCallback(
    (id: string, name: string): void => {
      setValue('accountId', id);
      setValue('accountName', name);
      setAccountSearch(name);
      setShowAccountDropdown(false);
      setDebouncedAccountSearch('');
    },
    [setValue],
  );

  // Type-specific field visibility
  const showDuration = activityType === 'visit' || activityType === 'call';
  const showDemoFields = activityType === 'demo';
  const showProductsField = activityType === 'sampling';

  const inputClasses =
    'block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

  const inputErrorClasses =
    'block w-full min-h-[44px] rounded-md border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

  const labelClasses = 'block text-sm font-medium text-gray-700';
  const errorClasses = 'mt-1 text-sm text-red-600';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
      aria-label="Activity form"
    >
      {/* User info (read-only display) */}
      {user ? (
        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Logging as: {user.firstName} {user.lastName}
        </div>
      ) : null}

      {/* Activity date */}
      <div>
        <label htmlFor="activity-date" className={labelClasses}>
          Date <span className="text-red-500">*</span>
        </label>
        <input
          id="activity-date"
          type="date"
          {...register('activityDate')}
          className={errors.activityDate ? inputErrorClasses : inputClasses}
          disabled={isLoading}
          aria-invalid={errors.activityDate ? 'true' : 'false'}
          aria-describedby={errors.activityDate ? 'activity-date-error' : undefined}
        />
        {errors.activityDate ? (
          <p id="activity-date-error" className={errorClasses} role="alert">
            {errors.activityDate.message}
          </p>
        ) : null}
      </div>

      {/* Activity type */}
      <div>
        <label htmlFor="activity-type" className={labelClasses}>
          Activity type <span className="text-red-500">*</span>
        </label>
        <select
          id="activity-type"
          {...register('activityType')}
          className={errors.activityType ? inputErrorClasses : inputClasses}
          disabled={isLoading}
          aria-invalid={errors.activityType ? 'true' : 'false'}
          aria-describedby={errors.activityType ? 'activity-type-error' : undefined}
        >
          {ACTIVITY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.activityType ? (
          <p id="activity-type-error" className={errorClasses} role="alert">
            {errors.activityType.message}
          </p>
        ) : null}
      </div>

      {/* Account selector — search-as-you-type */}
      <div className="relative" ref={accountDropdownRef}>
        <label htmlFor="account-search" className={labelClasses}>
          Account <span className="text-red-500">*</span>
        </label>
        <input type="hidden" {...register('accountId')} />
        <input type="hidden" {...register('accountName')} />
        <input
          id="account-search"
          type="text"
          value={accountSearch}
          onChange={(e) => handleAccountSearchChange(e.target.value)}
          onFocus={() => {
            if (debouncedAccountSearch.trim().length >= 2) {
              setShowAccountDropdown(true);
            }
          }}
          className={errors.accountId ? inputErrorClasses : inputClasses}
          placeholder="Search accounts..."
          disabled={isLoading}
          autoComplete="off"
          role="combobox"
          aria-expanded={showAccountDropdown}
          aria-haspopup="listbox"
          aria-controls="account-search-listbox"
          aria-label="Search accounts"
          aria-invalid={errors.accountId ? 'true' : 'false'}
          aria-describedby={errors.accountId ? 'account-id-error' : undefined}
        />
        {errors.accountId ? (
          <p id="account-id-error" className={errorClasses} role="alert">
            {errors.accountId.message}
          </p>
        ) : null}

        {showAccountDropdown ? (
          <div
            id="account-search-listbox"
            role="listbox"
            aria-label="Account search results"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {isSearching ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500" role="status">
                Searching...
              </div>
            ) : null}
            {!isSearching && accountResults.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                No accounts found
              </div>
            ) : null}
            {accountResults.map((result) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full min-h-[44px] items-center gap-3 px-4 py-2 text-left text-sm text-gray-900 hover:bg-blue-50 transition-colors"
                onClick={() => selectAccount(result.id, result.name)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{result.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {result.city} &middot; {result.account_type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contact selector (optional) */}
      {contacts.length > 0 ? (
        <div>
          <label htmlFor="contact-select" className={labelClasses}>
            Contact
          </label>
          <select
            id="contact-select"
            {...register('contactId')}
            className={inputClasses}
            disabled={isLoading}
          >
            <option value="">Select contact (optional)</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Subject */}
      <div>
        <label htmlFor="activity-subject" className={labelClasses}>
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          id="activity-subject"
          type="text"
          {...register('subject')}
          className={errors.subject ? inputErrorClasses : inputClasses}
          placeholder="Brief description of the activity"
          disabled={isLoading}
          aria-invalid={errors.subject ? 'true' : 'false'}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
        />
        {errors.subject ? (
          <p id="subject-error" className={errorClasses} role="alert">
            {errors.subject.message}
          </p>
        ) : null}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="activity-notes" className={labelClasses}>
          Notes
        </label>
        <textarea
          id="activity-notes"
          rows={3}
          {...register('notes')}
          className="block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Additional notes (optional)"
          disabled={isLoading}
        />
      </div>

      {/* Duration (visit, call) */}
      {showDuration ? (
        <div>
          <label htmlFor="duration-minutes" className={labelClasses}>
            Duration (minutes)
          </label>
          <input
            id="duration-minutes"
            type="number"
            min={1}
            max={480}
            {...register('durationMinutes', { valueAsNumber: true })}
            className={errors.durationMinutes ? inputErrorClasses : inputClasses}
            placeholder="e.g. 30"
            disabled={isLoading}
            aria-invalid={errors.durationMinutes ? 'true' : 'false'}
            aria-describedby={errors.durationMinutes ? 'duration-error' : undefined}
          />
          {errors.durationMinutes ? (
            <p id="duration-error" className={errorClasses} role="alert">
              {errors.durationMinutes.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Demo-specific fields */}
      {showDemoFields ? (
        <>
          <div>
            <label htmlFor="product-demoed" className={labelClasses}>
              Product demoed
            </label>
            <input
              id="product-demoed"
              type="text"
              {...register('productDemoed')}
              className={inputClasses}
              placeholder="Product name"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="quantity-sampled" className={labelClasses}>
              Quantity sampled
            </label>
            <input
              id="quantity-sampled"
              type="number"
              min={0}
              {...register('quantitySampled', { valueAsNumber: true })}
              className={errors.quantitySampled ? inputErrorClasses : inputClasses}
              placeholder="e.g. 5"
              disabled={isLoading}
              aria-invalid={errors.quantitySampled ? 'true' : 'false'}
              aria-describedby={errors.quantitySampled ? 'quantity-error' : undefined}
            />
            {errors.quantitySampled ? (
              <p id="quantity-error" className={errorClasses} role="alert">
                {errors.quantitySampled.message}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="buyer-feedback" className={labelClasses}>
              Buyer feedback
            </label>
            <textarea
              id="buyer-feedback"
              rows={2}
              {...register('buyerFeedback')}
              className="block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Buyer's response or feedback"
              disabled={isLoading}
            />
          </div>
        </>
      ) : null}

      {/* Sampling-specific fields */}
      {showProductsField ? (
        <div>
          <label htmlFor="products" className={labelClasses}>
            Products
          </label>
          <input
            id="products"
            type="text"
            {...register('products')}
            className={inputClasses}
            placeholder="Product names (comma-separated)"
            disabled={isLoading}
          />
        </div>
      ) : null}

      {/* Submit button */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Log Activity'}
        </button>
      </div>
    </form>
  );
}
