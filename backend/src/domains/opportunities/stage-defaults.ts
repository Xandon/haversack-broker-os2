export const PIPELINE_STAGES = [
  'prospect',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_PROBABILITY_DEFAULTS: Record<PipelineStage, number> = {
  prospect: 10,
  qualified: 40,
  proposal: 60,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

export const CLOSED_STAGES: readonly PipelineStage[] = ['closed_won', 'closed_lost'];
export const OPEN_STAGES: readonly PipelineStage[] = ['prospect', 'qualified', 'proposal', 'negotiation'];
