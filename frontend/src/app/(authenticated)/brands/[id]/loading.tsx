import { Skeleton } from '@/components/ui/skeleton';

export default function BrandDetailLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="col-span-2 h-48 rounded-lg" />
      </div>
    </div>
  );
}
