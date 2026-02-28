'use client';

import * as React from 'react';

interface TaskStatusToggleProps {
  status: string;
  onToggle: () => void;
  disabled?: boolean;
}

function TaskStatusToggle({ status, onToggle, disabled }: TaskStatusToggleProps): React.ReactElement {
  const isChecked = status === 'completed';

  return (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={onToggle}
      disabled={disabled}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
      aria-label={isChecked ? 'Mark as pending' : 'Mark as complete'}
    />
  );
}

export { TaskStatusToggle };
