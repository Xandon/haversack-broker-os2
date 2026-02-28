'use client';

interface CompositeScoreProps {
  score: number;
  calculatedAt: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 50) return 'Needs Improvement';
  return 'Critical';
}

export function CompositeScore({ score, calculatedAt }: CompositeScoreProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
      <h3 className="mb-1 text-sm font-medium uppercase text-gray-500">Data Quality Score</h3>
      <div className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</div>
      <div className={`mt-1 text-sm font-medium ${getScoreColor(score)}`}>
        {getScoreLabel(score)}
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Last calculated: {new Date(calculatedAt).toLocaleString()}
      </div>
    </div>
  );
}
