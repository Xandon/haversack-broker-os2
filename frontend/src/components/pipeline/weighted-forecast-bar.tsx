'use client';

interface WeightedForecastBarProps {
  totalWeightedForecast: number;
  totalOpportunities: number;
}

export function WeightedForecastBar({
  totalWeightedForecast,
  totalOpportunities,
}: WeightedForecastBarProps) {
  const formattedForecast = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalWeightedForecast);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Weighted Forecast</p>
          <p className="text-2xl font-bold text-gray-900">{formattedForecast}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Opportunities</p>
          <p className="text-2xl font-bold text-gray-900">{totalOpportunities}</p>
        </div>
      </div>
    </div>
  );
}
