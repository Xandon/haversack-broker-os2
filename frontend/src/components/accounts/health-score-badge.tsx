import { cn } from '@/lib/utils';

interface HealthScoreBadgeProps {
  score: number | null;
  className?: string;
}

function getScoreConfig(score: number | null): { label: string; colorClasses: string } {
  if (score === null) {
    return { label: '—', colorClasses: 'bg-gray-100 text-gray-500' };
  }
  if (score >= 70) {
    return { label: String(score), colorClasses: 'bg-green-100 text-green-800' };
  }
  if (score >= 40) {
    return { label: String(score), colorClasses: 'bg-yellow-100 text-yellow-800' };
  }
  return { label: String(score), colorClasses: 'bg-red-100 text-red-800' };
}

export function HealthScoreBadge({ score, className }: HealthScoreBadgeProps): React.ReactElement {
  const { label, colorClasses } = getScoreConfig(score);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClasses,
        className,
      )}
    >
      {label}
    </span>
  );
}
