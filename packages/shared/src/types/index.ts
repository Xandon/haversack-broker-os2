export type Role = 'admin' | 'manager' | 'rep' | 'logistics' | 'viewer';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'pending_approval'
  | 'confirmed'
  | 'exported'
  | 'rejected';

export type PipelineStage =
  | 'prospect'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';
