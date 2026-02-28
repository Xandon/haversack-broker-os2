'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonTable } from '@/components/shared/skeleton';
import { useBusinessRules, useToggleBusinessRule } from '@/hooks/use-business-rules';

export default function BusinessRulesPage() {
  const { data, isLoading, error, refetch } = useBusinessRules();
  const toggleRule = useToggleBusinessRule();

  if (error) {
    return <ErrorBanner message="Unable to load rules" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Business Rules</h1>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No business rules configured"
          description="Create a rule to automate workflows"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rule.entityType}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        rule.isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={rule.isActive}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          rule.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(rule.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
