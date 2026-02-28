'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export interface DemoEntry {
  productId: string;
  productName?: string;
  quantitySampled?: number;
  buyerFeedback?: string;
  outcome?: 'positive' | 'neutral' | 'negative';
}

interface DemoFieldsProps {
  demos: DemoEntry[];
  onChange: (demos: DemoEntry[]) => void;
}

function DemoFields({ demos, onChange }: DemoFieldsProps): React.ReactElement {
  const addDemo = (): void => {
    onChange([
      ...demos,
      { productId: '', quantitySampled: undefined, buyerFeedback: '', outcome: undefined },
    ]);
  };

  const removeDemo = (index: number): void => {
    onChange(demos.filter((_, i) => i !== index));
  };

  const updateDemo = (index: number, updates: Partial<DemoEntry>): void => {
    onChange(
      demos.map((demo, i) => (i === index ? { ...demo, ...updates } : demo)),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Demo Products</Label>
        <Button type="button" variant="outline" size="sm" onClick={addDemo}>
          Add Product
        </Button>
      </div>

      {demos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add at least one product for this demo activity.
        </p>
      )}

      {demos.map((demo, index) => (
        <div
          key={index}
          className="space-y-2 rounded-md border p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Product {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeDemo(index)}
            >
              Remove
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`demo-product-${index}`}>Product ID</Label>
            <Input
              id={`demo-product-${index}`}
              placeholder="Enter product ID"
              value={demo.productId}
              onChange={(e) => updateDemo(index, { productId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`demo-qty-${index}`}>Quantity Sampled</Label>
              <Input
                id={`demo-qty-${index}`}
                type="number"
                min={0}
                placeholder="0"
                value={demo.quantitySampled ?? ''}
                onChange={(e) =>
                  updateDemo(index, {
                    quantitySampled: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`demo-outcome-${index}`}>Outcome</Label>
              <Select
                id={`demo-outcome-${index}`}
                value={demo.outcome ?? ''}
                onChange={(e) =>
                  updateDemo(index, {
                    outcome: (e.target.value || undefined) as DemoEntry['outcome'],
                  })
                }
              >
                <option value="">Select…</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`demo-feedback-${index}`}>Buyer Feedback</Label>
            <Textarea
              id={`demo-feedback-${index}`}
              placeholder="Enter buyer feedback…"
              rows={2}
              value={demo.buyerFeedback ?? ''}
              onChange={(e) => updateDemo(index, { buyerFeedback: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export { DemoFields };
