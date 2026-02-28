'use client';

import { Mail, Phone, Star, Trash2 } from 'lucide-react';

import type { Contact } from '@/hooks/use-contacts';

interface ContactListProps {
  contacts: Contact[];
  onDelete?: (contactId: string) => void;
  onEdit?: (contact: Contact) => void;
}

export function ContactList({ contacts, onDelete, onEdit }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-500">No contacts yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer px-2 rounded"
          onClick={() => onEdit?.(contact)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
              {contact.firstName[0]}
              {contact.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-900">
                  {contact.firstName} {contact.lastName}
                </span>
                {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
              </div>
              {contact.title && <p className="text-xs text-gray-500">{contact.title}</p>}
              <div className="flex items-center gap-3 mt-0.5">
                {contact.email && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(contact.id);
              }}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete ${contact.firstName} ${contact.lastName}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
