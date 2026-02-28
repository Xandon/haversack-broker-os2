'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AccountForm } from '@/components/accounts/account-form';
import { ContactList } from '@/components/accounts/contact-list';
import { MeetingBriefPanel } from '@/components/ai/meeting-brief-panel';
import { EmailThread } from '@/components/emails/email-thread';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { Skeleton, SkeletonTable } from '@/components/shared/skeleton';
import { useAccount } from '@/hooks/use-accounts';
import { useGenerateMeetingBrief } from '@/hooks/use-ai';
import { useContacts } from '@/hooks/use-contacts';
import { useEmails } from '@/hooks/use-emails';
import { useOpportunities } from '@/hooks/use-opportunities';

const TABS = ['Overview', 'Contacts', 'Orders', 'Pipeline', 'Emails'] as const;
type Tab = (typeof TABS)[number];

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params['id'] as string;
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const { data: accountData, isLoading, error, refetch } = useAccount(accountId);
  const { data: contacts, isLoading: contactsLoading } = useContacts(accountId);
  const { data: emails, isLoading: emailsLoading } = useEmails(accountId);
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities({ accountId });
  const meetingBrief = useGenerateMeetingBrief();

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message="Account not found" />
        <Link href="/accounts" className="text-sm text-blue-600 hover:underline">
          Back to accounts
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="mt-6">
          <SkeletonTable rows={5} />
        </div>
      </div>
    );
  }

  const account = accountData?.data;
  if (!account) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span>{account.accountType}</span>
            <span>{account.territory?.name}</span>
            {account.healthScore !== undefined && (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  account.healthScore >= 70
                    ? 'bg-green-100 text-green-800'
                    : account.healthScore >= 40
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                Health: {account.healthScore}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Account tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-3 text-sm font-medium ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'Overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <AccountForm
              defaultValues={{
                name: account.name,
                accountType: account.accountType as
                  | 'store'
                  | 'restaurant'
                  | 'distributor'
                  | 'other',
                addressLine1: account.addressLine1,
                city: account.city,
                state: account.state,
                zipCode: account.zipCode,
                territoryId: account.territoryId,
              }}
              onSubmit={() => refetch()}
            />
            <MeetingBriefPanel
              onGenerate={() => meetingBrief.mutate({ accountId })}
              brief={meetingBrief.data ?? null}
              isLoading={meetingBrief.isPending}
              error={meetingBrief.error ?? null}
            />
          </div>
        )}

        {activeTab === 'Contacts' &&
          (contactsLoading ? (
            <SkeletonTable rows={3} />
          ) : !contacts?.data || contacts.data.length === 0 ? (
            <EmptyState title="No contacts yet" description="Add a contact to this account" />
          ) : (
            <ContactList contacts={contacts.data} onEdit={() => {}} onDelete={() => {}} />
          ))}

        {activeTab === 'Orders' && (
          <EmptyState title="Orders" description="View orders for this account" />
        )}

        {activeTab === 'Pipeline' &&
          (oppsLoading ? (
            <SkeletonTable rows={3} />
          ) : !opportunities?.data || opportunities.data.length === 0 ? (
            <EmptyState
              title="No opportunities"
              description="No pipeline opportunities for this account"
            />
          ) : (
            <div className="space-y-2">
              {opportunities.data.map((opp) => (
                <div key={opp.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/pipeline`} className="font-medium text-blue-600 hover:underline">
                      {opp.name}
                    </Link>
                    <span className="text-sm text-gray-500">{opp.stage}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    ${opp.estimatedValue.toLocaleString()} &middot; {opp.probability}% probability
                  </p>
                </div>
              ))}
            </div>
          ))}

        {activeTab === 'Emails' &&
          (emailsLoading ? (
            <SkeletonTable rows={3} />
          ) : !emails?.data || emails.data.length === 0 ? (
            <EmptyState title="No emails" description="No emails associated with this account" />
          ) : (
            <EmailThread emails={emails.data} />
          ))}
      </div>
    </div>
  );
}
