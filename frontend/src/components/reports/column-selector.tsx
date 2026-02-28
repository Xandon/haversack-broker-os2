'use client';

interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnSelectorProps {
  columns: ColumnOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ColumnSelector({ columns, selected, onChange }: ColumnSelectorProps) {
  const toggleColumn = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((s) => s !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const toggleAll = () => {
    if (selected.length === columns.length) {
      onChange([]);
    } else {
      onChange(columns.map((c) => c.key));
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Columns</label>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {selected.length === columns.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {columns.map((col) => (
          <label
            key={col.key}
            className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs transition-colors ${
              selected.includes(col.key)
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(col.key)}
              onChange={() => toggleColumn(col.key)}
              className="sr-only"
            />
            {col.label}
          </label>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="mt-1 text-xs text-red-500">Select at least one column</p>
      )}
    </div>
  );
}
