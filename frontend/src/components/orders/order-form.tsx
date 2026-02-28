'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { SearchCombobox } from '@/components/patterns/search-combobox';
import { StatusBadge } from '@/components/patterns/status-badge';
import { formatCurrency } from '@/lib/utils';
import { searchProducts, type ProductResponse } from '@/hooks/use-product-search';
import { Trash2, AlertTriangle } from 'lucide-react';
import type { CreateOrderInput, RevenueModel } from '@haversack/shared';

export interface LineItemDraft {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  revenueModel: RevenueModel;
  commissionRate: number | null;
  discount: number;
  lineTotal: number;
  promotionalPriceApplied: boolean;
  availabilityStatus: string;
}

interface OrderFormProps {
  accountId: string;
  accountName: string;
  onSubmit: (input: CreateOrderInput) => void;
  isSubmitting?: boolean;
}

function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function calculateLineTotal(quantity: number, unitPrice: number, discount: number): number {
  return Math.round((unitPrice * quantity - discount) * 100) / 100;
}

function getEffectivePrice(product: ProductResponse): { price: number; isPromo: boolean } {
  if (
    product.promotionalPrice !== null &&
    product.promotionalPriceStart !== null &&
    product.promotionalPriceEnd !== null
  ) {
    const now = new Date();
    const start = new Date(product.promotionalPriceStart);
    const end = new Date(product.promotionalPriceEnd);
    if (now >= start && now <= end) {
      return { price: product.promotionalPrice, isPromo: true };
    }
  }
  return { price: product.unitPrice, isPromo: false };
}

const APPROVAL_THRESHOLD = 5000;

export function OrderForm({
  accountId,
  accountName,
  onSubmit,
  isSubmitting = false,
}: OrderFormProps): React.ReactElement {
  const [lineItems, setLineItems] = React.useState<LineItemDraft[]>([]);
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const requiresApproval = subtotal >= APPROVAL_THRESHOLD;

  const vendorGroups = React.useMemo(() => {
    const groups: Record<string, { brandName: string; items: LineItemDraft[]; subtotal: number }> = {};
    for (const item of lineItems) {
      if (!groups[item.brandName]) {
        groups[item.brandName] = { brandName: item.brandName, items: [], subtotal: 0 };
      }
      groups[item.brandName].items.push(item);
      groups[item.brandName].subtotal += item.lineTotal;
    }
    return Object.values(groups);
  }, [lineItems]);

  function handleProductSelect(product: ProductResponse): void {
    const { price, isPromo } = getEffectivePrice(product);
    const newItem: LineItemDraft = {
      id: generateItemId(),
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      brandName: product.brand.name,
      quantity: 1,
      unitPrice: price,
      revenueModel: product.revenueModelDefault,
      commissionRate: product.commissionRate,
      discount: 0,
      lineTotal: calculateLineTotal(1, price, 0),
      promotionalPriceApplied: isPromo,
      availabilityStatus: product.availabilityStatus,
    };
    setLineItems((prev) => [...prev, newItem]);
    setError(null);
  }

  function handleQuantityChange(itemId: string, quantity: number): void {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const q = Math.max(1, quantity);
        return { ...item, quantity: q, lineTotal: calculateLineTotal(q, item.unitPrice, item.discount) };
      }),
    );
  }

  function handleUnitPriceChange(itemId: string, unitPrice: number): void {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const p = Math.max(0, unitPrice);
        return { ...item, unitPrice: p, lineTotal: calculateLineTotal(item.quantity, p, item.discount) };
      }),
    );
  }

  function handleRevenueModelChange(itemId: string, revenueModel: RevenueModel): void {
    setLineItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, revenueModel } : item)),
    );
  }

  function handleDiscountChange(itemId: string, discount: number): void {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const d = Math.max(0, discount);
        return { ...item, discount: d, lineTotal: calculateLineTotal(item.quantity, item.unitPrice, d) };
      }),
    );
  }

  function handleRemoveItem(itemId: string): void {
    setLineItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);

    if (lineItems.length === 0) {
      setError('Order must have at least one line item.');
      return;
    }

    const input: CreateOrderInput = {
      accountId,
      notes: notes.trim() || null,
      lineItems: lineItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        revenueModel: item.revenueModel,
        commissionRate: item.commissionRate,
        discount: item.discount,
      })),
    };

    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Account</p>
            <p className="font-medium">{accountName}</p>
          </div>
          {requiresApproval && (
            <StatusBadge status="Requires Approval" variantMap={{ requires_approval: 'warning' }} />
          )}
        </div>
      </Card>

      {/* Product Search */}
      <Card className="p-4">
        <Label className="mb-2 block text-sm font-medium">Add Products</Label>
        <SearchCombobox<ProductResponse>
          onSearch={searchProducts}
          placeholder="Search products by name, SKU, or brand..."
          onSelect={handleProductSelect}
          renderItem={(product) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.sku} &middot; {product.brand.name}
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <p className="text-sm font-medium">{formatCurrency(product.unitPrice)}</p>
                {product.availabilityStatus !== 'active' && (
                  <StatusBadge
                    status={product.availabilityStatus}
                    variantMap={{
                      seasonal: 'warning',
                      discontinued: 'destructive',
                    }}
                  />
                )}
              </div>
            </div>
          )}
        />
      </Card>

      {/* Line Items */}
      {lineItems.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium">Line Items ({lineItems.length})</h3>
          <div className="space-y-3">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.productSku} &middot; {item.brandName}
                    </p>
                    {item.availabilityStatus !== 'active' && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        Product is {item.availabilityStatus} — order may be delayed
                      </div>
                    )}
                    {item.promotionalPriceApplied && (
                      <p className="mt-1 text-xs text-success">Promotional price applied</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] min-w-[44px] text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label={`Remove ${item.productName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => handleUnitPriceChange(item.id, parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    <Select
                      value={item.revenueModel}
                      onChange={(e) => handleRevenueModelChange(item.id, e.target.value as RevenueModel)}
                      className="mt-1"
                      aria-label="Revenue model"
                    >
                      <option value="broker">Broker</option>
                      <option value="wholesale">Wholesale</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Discount</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.discount}
                      onChange={(e) => handleDiscountChange(item.id, parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-2 text-right text-sm font-medium">
                  Line total: {formatCurrency(item.lineTotal)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vendor Split Preview */}
      {vendorGroups.length > 1 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium">
            Vendor Split Preview ({vendorGroups.length} vendors)
          </h3>
          <div className="space-y-2">
            {vendorGroups.map((group) => (
              <div
                key={group.brandName}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span className="font-medium">{group.brandName}</span>
                <span>
                  {group.items.length} items &middot; {formatCurrency(group.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-4">
        <Label htmlFor="order-notes" className="mb-2 block text-sm font-medium">
          Notes
        </Label>
        <Textarea
          id="order-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional order notes..."
          maxLength={5000}
          rows={3}
        />
      </Card>

      {/* Order Summary */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-medium">Order Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {requiresApproval && (
            <p className="mt-2 text-xs text-warning">
              Orders over {formatCurrency(APPROVAL_THRESHOLD)} require manager approval before confirmation.
            </p>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          className="min-h-[44px]"
          disabled={isSubmitting || lineItems.length === 0}
        >
          {isSubmitting ? 'Creating Order...' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
}
