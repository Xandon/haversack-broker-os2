export const PIPELINE_STAGES = {
  prospect: { label: 'Prospect', probability: 0.2 },
  qualified: { label: 'Qualified', probability: 0.4 },
  proposal: { label: 'Proposal', probability: 0.6 },
  negotiation: { label: 'Negotiation', probability: 0.75 },
  closed_won: { label: 'Closed Won', probability: 1.0 },
  closed_lost: { label: 'Closed Lost', probability: 0.0 },
} as const;
