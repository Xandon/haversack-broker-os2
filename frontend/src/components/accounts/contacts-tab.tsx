'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContactSchema, type CreateContactInput } from '@haversack/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/patterns/confirmation-dialog';
import { EmptyState } from '@/components/patterns/empty-state';
import {
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  type UpdateContactInput,
} from '@/hooks/use-contacts';
import type { ContactItem } from '@/hooks/use-account-detail';

interface ContactsTabProps {
  accountId: string;
  contacts: ContactItem[];
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: ContactItem;
  onEdit: (contact: ContactItem) => void;
  onDelete: (contact: ContactItem) => void;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {contact.firstName} {contact.lastName}
            </span>
            {contact.isPrimary && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Primary
              </span>
            )}
          </div>
          {contact.title && (
            <p className="text-sm text-muted-foreground">{contact.title}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {contact.email && <span>{contact.email}</span>}
            {contact.phone && <span>{contact.phone}</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(contact)}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ContactFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
}

function ContactFormDialog({
  open,
  onOpenChange,
  editContact,
  accountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editContact: ContactItem | null;
  accountId: string;
}): React.ReactElement {
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      isPrimary: false,
    },
  });

  const isPrimaryValue = watch('isPrimary');

  React.useEffect(() => {
    if (editContact) {
      reset({
        firstName: editContact.firstName,
        lastName: editContact.lastName,
        email: editContact.email ?? '',
        phone: editContact.phone ?? '',
        title: editContact.title ?? '',
        isPrimary: editContact.isPrimary,
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        title: '',
        isPrimary: false,
      });
    }
  }, [editContact, reset]);

  const onSubmit = (data: ContactFormData): void => {
    const input: CreateContactInput | UpdateContactInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      title: data.title || undefined,
      isPrimary: data.isPrimary,
    };

    if (editContact) {
      updateContact.mutate(
        { accountId, contactId: editContact.id, input },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    } else {
      createContact.mutate(
        { accountId, input: input as CreateContactInput },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    }
  };

  const isSubmitting = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editContact ? 'Edit Contact' : 'Add Contact'}
          </DialogTitle>
          <DialogDescription>
            {editContact
              ? 'Update the contact information below.'
              : 'Add a new contact to this account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                aria-invalid={Boolean(errors.firstName)}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                aria-invalid={Boolean(errors.lastName)}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              aria-invalid={Boolean(errors.phone)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title / Role</Label>
            <Input
              id="title"
              {...register('title')}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isPrimary"
              checked={isPrimaryValue ?? false}
              onCheckedChange={(checked: boolean) => setValue('isPrimary', checked)}
            />
            <Label htmlFor="isPrimary">Primary contact</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContactsTab({ accountId, contacts }: ContactsTabProps): React.ReactElement {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editContact, setEditContact] = React.useState<ContactItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ContactItem | null>(null);
  const deleteContact = useDeleteContact();

  const handleEdit = (contact: ContactItem): void => {
    setEditContact(contact);
    setFormOpen(true);
  };

  const handleAddNew = (): void => {
    setEditContact(null);
    setFormOpen(true);
  };

  const handleDelete = (): void => {
    if (!deleteTarget) return;
    deleteContact.mutate(
      { accountId, contactId: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) },
    );
  };

  if (contacts.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No contacts yet"
          message="Add contacts to keep track of key people at this account."
          actionLabel="Add Contact"
          onAction={handleAddNew}
        />
        <ContactFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editContact={editContact}
          accountId={accountId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={handleAddNew}>
          Add Contact
        </Button>
      </div>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editContact={editContact}
        accountId={accountId}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Contact"
        description={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.firstName} ${deleteTarget.lastName}? This action cannot be undone.`
            : ''
        }
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteContact.isPending}
      />
    </div>
  );
}
