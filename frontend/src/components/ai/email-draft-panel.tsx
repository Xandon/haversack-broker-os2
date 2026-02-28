'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailDraft } from '@/hooks/use-ai';
import type { EmailPurpose, EmailDraftResponse } from '@/hooks/use-ai';
import type { ContactItem } from '@/hooks/use-account-detail';
import { AlertTriangle, Mail, RefreshCw, Sparkles } from 'lucide-react';

interface EmailDraftPanelProps {
  accountId: string;
  contacts: ContactItem[];
}

const PURPOSE_OPTIONS: { value: EmailPurpose; label: string }[] = [
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'introduction', label: 'Introduction' },
  { value: 'product_pitch', label: 'Product Pitch' },
  { value: 'meeting_request', label: 'Meeting Request' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'custom', label: 'Custom' },
];

function DraftContent({ data }: { data: EmailDraftResponse }): React.ReactElement {
  const { draft } = data;
  const [editedSubject, setEditedSubject] = React.useState(draft.subject);
  const [editedBody, setEditedBody] = React.useState(draft.body);

  return (
    <div className="space-y-3">
      <div className="text-sm">
        <span className="text-muted-foreground">To:</span>{' '}
        {draft.to_name} &lt;{draft.to_email}&gt;
      </div>
      <div>
        <Label htmlFor="email-subject">Subject</Label>
        <input
          id="email-subject"
          className="w-full rounded border p-2 text-sm"
          value={editedSubject}
          onChange={(e) => setEditedSubject(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="email-body">Body</Label>
        <textarea
          id="email-body"
          className="w-full rounded border p-2 text-sm"
          rows={8}
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
        />
      </div>
      {draft.suggested_send_time && (
        <p className="text-xs text-muted-foreground">
          Suggested send time:{' '}
          {new Date(draft.suggested_send_time).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}

export function EmailDraftPanel({ accountId, contacts }: EmailDraftPanelProps): React.ReactElement {
  const emailDraft = useEmailDraft();
  const [selectedContactId, setSelectedContactId] = React.useState('');
  const [purpose, setPurpose] = React.useState<EmailPurpose>('follow_up');

  const contactsWithEmail = contacts.filter((c) => c.email);

  function handleGenerate(): void {
    if (!selectedContactId) return;
    emailDraft.mutate({
      accountId,
      contactId: selectedContactId,
      purpose,
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Email Draft</CardTitle>
        {emailDraft.data && (
          <Badge variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Generated
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="contact-select">Contact</Label>
            <Select
              id="contact-select"
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
            >
              <option value="">Select contact...</option>
              {contactsWithEmail.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="purpose-select">Purpose</Label>
            <Select
              id="purpose-select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as EmailPurpose)}
            >
              {PURPOSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={emailDraft.isPending || !selectedContactId}
        >
          {emailDraft.isPending ? (
            <>
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Mail className="mr-1 h-3 w-3" />
              Generate Draft
            </>
          )}
        </Button>

        {emailDraft.isPending && (
          <div className="space-y-3">
            <Badge variant="secondary" className="animate-pulse">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Generated
            </Badge>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {emailDraft.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>AI service temporarily unavailable — please try again in a few minutes</span>
            <Button size="sm" variant="outline" onClick={handleGenerate}>
              Retry
            </Button>
          </div>
        )}

        {emailDraft.data && !emailDraft.isPending && (
          <DraftContent data={emailDraft.data} />
        )}

        {contactsWithEmail.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No contacts with email addresses found. Add a contact with an email to use this feature.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
