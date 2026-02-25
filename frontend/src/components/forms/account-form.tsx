'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { DuplicateMatch } from '@/hooks/use-accounts';
import { DuplicateWarning } from '@/components/accounts/duplicate-warning';

// -------------------------------------------------------------------
// Zod schema
// -------------------------------------------------------------------

const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(255, 'Account name must be 255 characters or fewer'),
  accountType: z.enum(['Store', 'Restaurant', 'Distributor', 'Other'], {
    errorMap: () => ({ message: 'Account type is required' }),
  }),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code (e.g. 97201 or 97201-1234)'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[+]?[\d\s()-]{7,20}$/.test(val),
      'Enter a valid phone number',
    ),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, 'Enter a valid email'),
  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().url().safeParse(val).success,
      'Enter a valid URL (e.g. https://example.com)',
    ),
  notes: z.string().optional(),
  territoryId: z.string().optional(),
  assignedRepId: z.string().optional(),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface AccountFormInitialValues {
  name?: string;
  accountType?: 'Store' | 'Restaurant' | 'Distributor' | 'Other';
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  territoryId?: string;
  assignedRepId?: string;
}

interface AccountFormProps {
  onSubmit: (values: AccountFormValues) => void;
  onNameBlur?: (name: string) => void;
  initialValues?: AccountFormInitialValues;
  isLoading?: boolean;
  duplicates?: DuplicateMatch[];
  onViewExisting?: (id: string) => void;
  onCreateAnyway?: () => void;
  showTerritoryField?: boolean;
  showRepField?: boolean;
}

// -------------------------------------------------------------------
// Account type options
// -------------------------------------------------------------------

const ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'Select account type' },
  { value: 'Store', label: 'Store' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Other', label: 'Other' },
] as const;

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function AccountForm({
  onSubmit,
  onNameBlur,
  initialValues,
  isLoading = false,
  duplicates = [],
  onViewExisting,
  onCreateAnyway,
  showTerritoryField = false,
  showRepField = false,
}: AccountFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      accountType: initialValues?.accountType,
      addressLine1: initialValues?.addressLine1 ?? '',
      addressLine2: initialValues?.addressLine2 ?? '',
      city: initialValues?.city ?? '',
      state: initialValues?.state ?? '',
      zipCode: initialValues?.zipCode ?? '',
      phone: initialValues?.phone ?? '',
      email: initialValues?.email ?? '',
      website: initialValues?.website ?? '',
      notes: initialValues?.notes ?? '',
      territoryId: initialValues?.territoryId ?? '',
      assignedRepId: initialValues?.assignedRepId ?? '',
    },
  });

  const handleNameBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>): void => {
      const value = event.target.value.trim();
      if (value.length > 0 && onNameBlur) {
        onNameBlur(value);
      }
    },
    [onNameBlur],
  );

  const handleViewExisting = useCallback(
    (id: string): void => {
      if (onViewExisting) {
        onViewExisting(id);
      }
    },
    [onViewExisting],
  );

  const handleCreateAnyway = useCallback((): void => {
    if (onCreateAnyway) {
      onCreateAnyway();
    }
  }, [onCreateAnyway]);

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
      className="space-y-6"
      aria-label="Account form"
    >
      {/* Account name */}
      <div>
        <label htmlFor="account-name" className={labelClasses}>
          Account name <span className="text-red-500">*</span>
        </label>
        <input
          id="account-name"
          type="text"
          autoComplete="organization"
          {...register('name', { onBlur: handleNameBlur })}
          className={errors.name ? inputErrorClasses : inputClasses}
          placeholder="Enter account name"
          disabled={isLoading}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'account-name-error' : undefined}
        />
        {errors.name ? (
          <p id="account-name-error" className={errorClasses} role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      {/* Duplicate warning */}
      {duplicates.length > 0 ? (
        <DuplicateWarning
          duplicates={duplicates}
          onViewExisting={handleViewExisting}
          onCreateAnyway={handleCreateAnyway}
        />
      ) : null}

      {/* Account type */}
      <div>
        <label htmlFor="account-type" className={labelClasses}>
          Account type <span className="text-red-500">*</span>
        </label>
        <select
          id="account-type"
          {...register('accountType')}
          className={errors.accountType ? inputErrorClasses : inputClasses}
          disabled={isLoading}
          aria-invalid={errors.accountType ? 'true' : 'false'}
          aria-describedby={errors.accountType ? 'account-type-error' : undefined}
        >
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.accountType ? (
          <p id="account-type-error" className={errorClasses} role="alert">
            {errors.accountType.message}
          </p>
        ) : null}
      </div>

      {/* Address section */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">Address</legend>

        {/* Address line 1 */}
        <div>
          <label htmlFor="address-line1" className={labelClasses}>
            Address line 1 <span className="text-red-500">*</span>
          </label>
          <input
            id="address-line1"
            type="text"
            autoComplete="address-line1"
            {...register('addressLine1')}
            className={errors.addressLine1 ? inputErrorClasses : inputClasses}
            placeholder="Street address"
            disabled={isLoading}
            aria-invalid={errors.addressLine1 ? 'true' : 'false'}
            aria-describedby={errors.addressLine1 ? 'address-line1-error' : undefined}
          />
          {errors.addressLine1 ? (
            <p id="address-line1-error" className={errorClasses} role="alert">
              {errors.addressLine1.message}
            </p>
          ) : null}
        </div>

        {/* Address line 2 */}
        <div>
          <label htmlFor="address-line2" className={labelClasses}>
            Address line 2
          </label>
          <input
            id="address-line2"
            type="text"
            autoComplete="address-line2"
            {...register('addressLine2')}
            className={inputClasses}
            placeholder="Suite, unit, floor (optional)"
            disabled={isLoading}
          />
        </div>

        {/* City / State / ZIP — responsive grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          {/* City */}
          <div className="sm:col-span-3">
            <label htmlFor="city" className={labelClasses}>
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              autoComplete="address-level2"
              {...register('city')}
              className={errors.city ? inputErrorClasses : inputClasses}
              placeholder="City"
              disabled={isLoading}
              aria-invalid={errors.city ? 'true' : 'false'}
              aria-describedby={errors.city ? 'city-error' : undefined}
            />
            {errors.city ? (
              <p id="city-error" className={errorClasses} role="alert">
                {errors.city.message}
              </p>
            ) : null}
          </div>

          {/* State */}
          <div className="sm:col-span-1">
            <label htmlFor="state" className={labelClasses}>
              State <span className="text-red-500">*</span>
            </label>
            <input
              id="state"
              type="text"
              autoComplete="address-level1"
              {...register('state')}
              className={errors.state ? inputErrorClasses : inputClasses}
              placeholder="ST"
              disabled={isLoading}
              aria-invalid={errors.state ? 'true' : 'false'}
              aria-describedby={errors.state ? 'state-error' : undefined}
            />
            {errors.state ? (
              <p id="state-error" className={errorClasses} role="alert">
                {errors.state.message}
              </p>
            ) : null}
          </div>

          {/* ZIP */}
          <div className="sm:col-span-2">
            <label htmlFor="zip-code" className={labelClasses}>
              ZIP code <span className="text-red-500">*</span>
            </label>
            <input
              id="zip-code"
              type="text"
              autoComplete="postal-code"
              {...register('zipCode')}
              className={errors.zipCode ? inputErrorClasses : inputClasses}
              placeholder="97201"
              disabled={isLoading}
              aria-invalid={errors.zipCode ? 'true' : 'false'}
              aria-describedby={errors.zipCode ? 'zip-code-error' : undefined}
            />
            {errors.zipCode ? (
              <p id="zip-code-error" className={errorClasses} role="alert">
                {errors.zipCode.message}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      {/* Contact information section */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">Contact information</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelClasses}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register('phone')}
              className={errors.phone ? inputErrorClasses : inputClasses}
              placeholder="(503) 555-0123"
              disabled={isLoading}
              aria-invalid={errors.phone ? 'true' : 'false'}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone ? (
              <p id="phone-error" className={errorClasses} role="alert">
                {errors.phone.message}
              </p>
            ) : null}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClasses}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={errors.email ? inputErrorClasses : inputClasses}
              placeholder="contact@example.com"
              disabled={isLoading}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email ? (
              <p id="email-error" className={errorClasses} role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className={labelClasses}>
            Website
          </label>
          <input
            id="website"
            type="url"
            autoComplete="url"
            {...register('website')}
            className={errors.website ? inputErrorClasses : inputClasses}
            placeholder="https://example.com"
            disabled={isLoading}
            aria-invalid={errors.website ? 'true' : 'false'}
            aria-describedby={errors.website ? 'website-error' : undefined}
          />
          {errors.website ? (
            <p id="website-error" className={errorClasses} role="alert">
              {errors.website.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/* Territory and Rep (conditionally rendered) */}
      {showTerritoryField || showRepField ? (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">Assignment</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {showTerritoryField ? (
              <div>
                <label htmlFor="territory-id" className={labelClasses}>
                  Territory ID
                </label>
                <input
                  id="territory-id"
                  type="text"
                  {...register('territoryId')}
                  className={inputClasses}
                  placeholder="Territory ID"
                  disabled={isLoading}
                />
              </div>
            ) : null}
            {showRepField ? (
              <div>
                <label htmlFor="assigned-rep-id" className={labelClasses}>
                  Assigned Rep ID
                </label>
                <input
                  id="assigned-rep-id"
                  type="text"
                  {...register('assignedRepId')}
                  className={inputClasses}
                  placeholder="Rep ID"
                  disabled={isLoading}
                />
              </div>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={labelClasses}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          {...register('notes')}
          className="block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Additional notes (optional)"
          disabled={isLoading}
        />
      </div>

      {/* Submit button */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initialValues ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
