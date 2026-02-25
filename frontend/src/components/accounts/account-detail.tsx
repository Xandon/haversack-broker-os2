'use client';

import Link from 'next/link';

import type { Account } from '@/hooks/use-accounts';
import { HealthBadge } from '@/components/accounts/health-badge';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
}

export interface ParentAccount {
  id: string;
  name: string;
}

export interface ChildAccount {
  id: string;
  name: string;
  account_type: string;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

export interface AccountDetailData extends Account {
  health_score: number | null;
  health_score_updated_at: string | null;
  contacts: Contact[];
  parent_account: ParentAccount | null;
  child_accounts: ChildAccount[];
  recent_activities: RecentActivity[];
}

interface AccountDetailProps {
  account: AccountDetailData;
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function InfoField({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}): React.JSX.Element | null {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">
        {href ? (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-800 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }): React.JSX.Element {
  return (
    <li
      className={`rounded-lg border p-3 ${contact.is_primary ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
          {contact.role ? (
            <p className="text-xs text-gray-500">{contact.role}</p>
          ) : null}
        </div>
        {contact.is_primary ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Primary
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-1">
        {contact.email ? (
          <p className="text-xs text-gray-600">
            <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">
              {contact.email}
            </a>
          </p>
        ) : null}
        {contact.phone ? (
          <p className="text-xs text-gray-600">
            <a href={`tel:${contact.phone}`} className="hover:text-blue-600 hover:underline">
              {contact.phone}
            </a>
          </p>
        ) : null}
      </div>
    </li>
  );
}

function formatAddress(account: Account): string {
  const parts = [account.address_line1];
  if (account.address_line2) {
    parts.push(account.address_line2);
  }
  parts.push(`${account.city}, ${account.state} ${account.zip_code}`);
  return parts.join(', ');
}

function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function AccountDetail({ account }: AccountDetailProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
          <HealthBadge
            score={account.health_score}
            lastCalculatedAt={account.health_score_updated_at}
            variant="compact"
          />
        </div>
        <Link
          href={`/accounts/${account.id}/edit`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Edit Account
        </Link>
      </div>

      {/* Main content: responsive layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Account info + health score */}
        <div className="space-y-6 lg:col-span-2">
          {/* Account Information Card */}
          <section
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
            aria-label="Account information"
          >
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Account Type" value={account.account_type} />
              <InfoField label="Address" value={formatAddress(account)} />
              <InfoField label="Phone" value={account.phone} href={account.phone ? `tel:${account.phone}` : undefined} />
              <InfoField label="Email" value={account.email} href={account.email ? `mailto:${account.email}` : undefined} />
              <InfoField
                label="Website"
                value={account.website}
                href={account.website ? (account.website.startsWith('http') ? account.website : `https://${account.website}`) : undefined}
              />
              {account.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{account.notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Health Score Expanded */}
          <section aria-label="Health score details">
            <HealthBadge
              score={account.health_score}
              lastCalculatedAt={account.health_score_updated_at}
              variant="expanded"
            />
          </section>

          {/* Recent Activities */}
          <section
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
            aria-label="Recent activities"
          >
            <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
            {account.recent_activities.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No recent activities.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {account.recent_activities.map((activity) => (
                  <li key={activity.id} className="flex items-start gap-3 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <span className="text-xs font-medium text-gray-600">
                        {activity.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatActivityDate(activity.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: Contacts, Parent/Child accounts */}
        <div className="space-y-6">
          {/* Contacts */}
          <section
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
            aria-label="Contacts"
          >
            <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
            {account.contacts.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No contacts added.</p>
            ) : (
              <ul className="mt-3 space-y-2" aria-label="Contact list">
                {account.contacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
              </ul>
            )}
          </section>

          {/* Parent Account */}
          {account.parent_account ? (
            <section
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
              aria-label="Parent account"
            >
              <h2 className="text-lg font-semibold text-gray-900">Parent Account</h2>
              <Link
                href={`/accounts/${account.parent_account.id}`}
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                {account.parent_account.name}
              </Link>
            </section>
          ) : null}

          {/* Child Accounts */}
          {account.child_accounts.length > 0 ? (
            <section
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
              aria-label="Child accounts"
            >
              <h2 className="text-lg font-semibold text-gray-900">Child Accounts</h2>
              <ul className="mt-3 space-y-2" aria-label="Child account list">
                {account.child_accounts.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/accounts/${child.id}`}
                      className="flex min-h-[44px] items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium text-blue-600">{child.name}</span>
                      <span className="text-xs text-gray-500">{child.account_type}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
