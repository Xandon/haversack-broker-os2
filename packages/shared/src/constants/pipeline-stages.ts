/**
 * Pipeline stage definitions for opportunity tracking.
 * Stages follow the OpportunityStage enum from the Prisma schema.
 * Default probabilities align with standard B2B sales methodology.
 */

export interface PipelineStageDefinition {
  readonly id: string;
  readonly label: string;
  readonly order: number;
  readonly defaultProbability: number;
  readonly description: string;
  readonly isClosed: boolean;
}

export const PIPELINE_STAGES: readonly PipelineStageDefinition[] = [
  {
    id: 'prospecting',
    label: 'Prospecting',
    order: 1,
    defaultProbability: 10,
    description: 'Initial contact and qualification of potential opportunity',
    isClosed: false,
  },
  {
    id: 'qualified',
    label: 'Qualified',
    order: 2,
    defaultProbability: 25,
    description: 'Opportunity confirmed with budget and decision-maker identified',
    isClosed: false,
  },
  {
    id: 'proposal',
    label: 'Proposal',
    order: 3,
    defaultProbability: 50,
    description: 'Pricing and product selection presented to buyer',
    isClosed: false,
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    order: 4,
    defaultProbability: 75,
    description: 'Terms under discussion, pending final commitment',
    isClosed: false,
  },
  {
    id: 'closed_won',
    label: 'Closed Won',
    order: 5,
    defaultProbability: 100,
    description: 'Deal finalized and order placed',
    isClosed: true,
  },
  {
    id: 'closed_lost',
    label: 'Closed Lost',
    order: 6,
    defaultProbability: 0,
    description: 'Opportunity did not convert to an order',
    isClosed: true,
  },
] as const;

/**
 * Mapping of stage ID to default probability percentage (0-100).
 */
export const STAGE_PROBABILITIES: Record<string, number> = Object.fromEntries(
  PIPELINE_STAGES.map((stage) => [stage.id, stage.defaultProbability]),
);
