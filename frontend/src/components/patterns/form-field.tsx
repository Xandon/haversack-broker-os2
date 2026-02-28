import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FormField({
  label,
  htmlFor,
  error,
  description,
  required = false,
  className,
  children,
}: FormFieldProps): React.ReactElement {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className={cn(error && 'text-destructive')}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {description && !error && <p className="text-small text-muted-foreground">{description}</p>}
      {error && (
        <p className="text-small text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
