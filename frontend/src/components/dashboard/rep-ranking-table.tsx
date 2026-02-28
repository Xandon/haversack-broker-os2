'use client';

import type { RepRanking } from '@/hooks/use-dashboard';

interface RepRankingTableProps {
  rankings: RepRanking[];
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function RepRankingTable({ rankings }: RepRankingTableProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Rep Performance Rankings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" role="table">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500">
              <th className="px-4 py-2">Rank</th>
              <th className="px-4 py-2">Rep</th>
              <th className="px-4 py-2 text-right">Revenue</th>
              <th className="px-4 py-2 text-right">Orders</th>
              <th className="px-4 py-2 text-right">Activities</th>
              <th className="px-4 py-2 text-right">Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((rep, index) => (
              <tr
                key={rep.repId}
                className={`border-b border-gray-100 ${!rep.isActive ? 'text-gray-400 italic' : ''}`}
              >
                <td className="px-4 py-2 font-medium">{index + 1}</td>
                <td className="px-4 py-2">
                  {rep.repName}
                  {!rep.isActive && (
                    <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 not-italic">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{formatCurrency(rep.revenue)}</td>
                <td className="px-4 py-2 text-right">{rep.orderCount}</td>
                <td className="px-4 py-2 text-right">{rep.activityCount}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(rep.pipelineValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rankings.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No data available for the selected period
          </p>
        )}
      </div>
    </div>
  );
}
