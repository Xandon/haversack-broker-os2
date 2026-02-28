'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/patterns/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { useImports } from '@/hooks/use-imports';
import type { ImportStatus } from '@/hooks/use-imports';
import { useRouter } from 'next/navigation';
import { Plus, FileSpreadsheet } from 'lucide-react';

function statusColor(status: ImportStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    case 'processing':
    case 'validating':
      return 'bg-blue-100 text-blue-700';
    case 'previewed':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportsPage(): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useImports();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Data Imports" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Data Imports" />
        <ErrorState
          title="Failed to load imports"
          message="There was an error loading the import history."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const imports = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Imports"
        actions={
          <Link href="/admin/imports/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Import
            </Button>
          </Link>
        }
      />

      {imports.length === 0 ? (
        <EmptyState
          title="No imports yet"
          description="Import data from CSV or Excel files to populate your system."
          actionLabel="Start Import"
          onAction={() => router.push('/admin/imports/new')}
        />
      ) : (
        <div className="space-y-3">
          {imports.map((imp) => (
            <Card key={imp.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{imp.filename}</div>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{imp.entityType}</span>
                      <span>&middot;</span>
                      <span>{formatFileSize(imp.fileSize)}</span>
                      <span>&middot;</span>
                      <span>{new Date(imp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {imp.status === 'completed' && (
                    <div className="text-right text-sm">
                      <div className="text-green-600">{imp.createdRows} created</div>
                      {imp.updatedRows > 0 && <div>{imp.updatedRows} updated</div>}
                      {imp.skippedRows > 0 && (
                        <div className="text-muted-foreground">{imp.skippedRows} skipped</div>
                      )}
                    </div>
                  )}
                  <Badge className={statusColor(imp.status)}>
                    {imp.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
