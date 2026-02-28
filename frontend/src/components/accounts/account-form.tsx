'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createAccountSchema,
  updateAccountSchema,
} from '@haversack/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DuplicateWarningDialog } from './duplicate-warning-dialog';
import { useTerritories } from '@/hooks/use-territories';
import { useCheckDuplicates, type DuplicateMatch } from '@/hooks/use-check-duplicates';

type AccountFormMode = 'create' | 'edit';

interface AccountFormData {
  name: string;
  accountType: 'retail' | 'restaurant' | 'distributor';
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  territoryId: string;
  parentAccountId?: string | null;
  primaryContact?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
  };
}

export interface AccountFormProps {
  mode: AccountFormMode;
  defaultValues?: Partial<AccountFormData>;
  onSubmit: (data: AccountFormData, skipDuplicateCheck: boolean) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const editFormSchema = updateAccountSchema.extend({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  accountType: z.enum(['retail', 'restaurant', 'distributor']),
  streetAddress: z.string().min(1, 'Street address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().min(1, 'Zip code is required').max(20),
  territoryId: z.string().uuid('Territory is required'),
});

export function AccountForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: AccountFormProps): React.ReactElement {
  const { data: territories = [] } = useTerritories();
  const checkDuplicates = useCheckDuplicates();
  const [duplicateMatches, setDuplicateMatches] = React.useState<DuplicateMatch[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false);
  const [pendingFormData, setPendingFormData] = React.useState<AccountFormData | null>(null);

  const schema = mode === 'create' ? createAccountSchema : editFormSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(schema as z.ZodType<AccountFormData>),
    defaultValues: {
      name: '',
      accountType: 'retail',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      territoryId: '',
      primaryContact: mode === 'create' ? { firstName: '', lastName: '', email: '', phone: '', title: '' } : undefined,
      ...defaultValues,
    },
  });

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    const name = e.target.value.trim();
    if (name.length < 2) return;

    checkDuplicates.mutate(name, {
      onSuccess: (response) => {
        if (response.data.hasDuplicates) {
          setDuplicateMatches(response.data.matches);
          setShowDuplicateDialog(true);
        }
      },
    });
  };

  const handleCreateAnyway = (): void => {
    setShowDuplicateDialog(false);
    if (pendingFormData) {
      onSubmit(pendingFormData, true);
      setPendingFormData(null);
    }
  };

  const handleFormSubmitWithDuplicateGate = handleSubmit((data: AccountFormData): void => {
    if (duplicateMatches.length > 0 && mode === 'create') {
      setPendingFormData(data);
      setShowDuplicateDialog(true);
      return;
    }
    onSubmit(data, false);
  });

  const contactErrors = errors.primaryContact as
    | { firstName?: { message?: string }; lastName?: { message?: string }; email?: { message?: string } }
    | undefined;

  return (
    <>
      <form onSubmit={handleFormSubmitWithDuplicateGate} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name', { onBlur: handleNameBlur })}
                aria-invalid={Boolean(errors.name)}
                placeholder="e.g., Pacific Bistro"
              />
              {errors.name && (
                <p className="text-sm text-destructive" role="alert">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accountType">
                  Account Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  id="accountType"
                  {...register('accountType')}
                  aria-invalid={Boolean(errors.accountType)}
                >
                  <option value="retail">Retail</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="distributor">Distributor</option>
                </Select>
                {errors.accountType && (
                  <p className="text-sm text-destructive" role="alert">{errors.accountType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="territoryId">
                  Territory <span className="text-destructive">*</span>
                </Label>
                <Select
                  id="territoryId"
                  {...register('territoryId')}
                  aria-invalid={Boolean(errors.territoryId)}
                >
                  <option value="">Select territory…</option>
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </Select>
                {errors.territoryId && (
                  <p className="text-sm text-destructive" role="alert">{errors.territoryId.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="streetAddress">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="streetAddress"
                {...register('streetAddress')}
                aria-invalid={Boolean(errors.streetAddress)}
                placeholder="123 Main St"
              />
              {errors.streetAddress && (
                <p className="text-sm text-destructive" role="alert">{errors.streetAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  {...register('city')}
                  aria-invalid={Boolean(errors.city)}
                />
                {errors.city && (
                  <p className="text-sm text-destructive" role="alert">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="state"
                  {...register('state')}
                  aria-invalid={Boolean(errors.state)}
                  placeholder="OR"
                />
                {errors.state && (
                  <p className="text-sm text-destructive" role="alert">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">
                  Zip Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="zipCode"
                  {...register('zipCode')}
                  aria-invalid={Boolean(errors.zipCode)}
                  placeholder="97201"
                />
                {errors.zipCode && (
                  <p className="text-sm text-destructive" role="alert">{errors.zipCode.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {mode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryContact.firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="primaryContact.firstName"
                    {...register('primaryContact.firstName')}
                    aria-invalid={Boolean(contactErrors?.firstName)}
                  />
                  {contactErrors?.firstName && (
                    <p className="text-sm text-destructive" role="alert">{contactErrors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryContact.lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="primaryContact.lastName"
                    {...register('primaryContact.lastName')}
                    aria-invalid={Boolean(contactErrors?.lastName)}
                  />
                  {contactErrors?.lastName && (
                    <p className="text-sm text-destructive" role="alert">{contactErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryContact.email">Email</Label>
                <Input
                  id="primaryContact.email"
                  type="email"
                  {...register('primaryContact.email')}
                  aria-invalid={Boolean(contactErrors?.email)}
                />
                {contactErrors?.email && (
                  <p className="text-sm text-destructive" role="alert">{contactErrors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryContact.phone">Phone</Label>
                  <Input
                    id="primaryContact.phone"
                    {...register('primaryContact.phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryContact.title">Title / Role</Label>
                  <Input
                    id="primaryContact.title"
                    {...register('primaryContact.title')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Account' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <DuplicateWarningDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        matches={duplicateMatches}
        onCreateAnyway={handleCreateAnyway}
      />
    </>
  );
}
