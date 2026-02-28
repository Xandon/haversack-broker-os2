import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function OpportunitiesLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-[280px] rounded-lg border bg-muted/30 p-3">
            <Skeleton className="mb-3 h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Card key={j}>
                  <CardContent className="p-3">
                    <Skeleton className="mb-2 h-4 w-3/4" />
                    <Skeleton className="mb-2 h-3 w-1/2" />
                    <Skeleton className="h-5 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
