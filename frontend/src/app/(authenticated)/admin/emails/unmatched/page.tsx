'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { useUnmatchedEmails, useLinkEmail } from '@/hooks/use-email-records';
import { useAccounts } from '@/hooks/use-accounts';
import { Mail, Link2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function UnmatchedEmailsPage(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useUnmatchedEmails({ limit: 50 });
  const linkEmail = useLinkEmail();
  const [linkingEmailId, setLinkingEmailId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: accountsData } = useAccounts({ search: searchQuery, limit: 10 });
  const accounts = accountsData?.data ?? [];

  function handleLink(emailId: string, contactId: string): void {
    linkEmail.mutate(
      { emailId, contactId },
      {
        onSuccess: () => {
          toast.success('Email linked to account');
          setLinkingEmailId(null);
          setSearchQuery('');
        },
        onError: () => {
          toast.error('Failed to link email');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unmatched Emails"
        description="Link unmatched emails to accounts manually"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Unmatched Emails' },
        ]}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="Failed to load emails"
          message="Could not load unmatched emails. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          title="No unmatched emails"
          description="All emails have been linked to accounts."
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {data.pagination.total} unmatched email{data.pagination.total !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {data.data.map((email) => (
              <Card key={email.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{email.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        To: {email.recipientEmail}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(email.sentAt).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {email.direction}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkingEmailId(linkingEmailId === email.id ? null : email.id)}
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    Link to Account
                  </Button>
                </div>

                {linkingEmailId === email.id && (
                  <div className="mt-3 rounded border bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setLinkingEmailId(null);
                          setSearchQuery('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {searchQuery.length > 0 && accounts.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {accounts.map((account) => (
                          <button
                            key={account.id}
                            type="button"
                            className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                            onClick={() => handleLink(email.id, account.id)}
                          >
                            {account.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.length > 0 && accounts.length === 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">No accounts found</p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
