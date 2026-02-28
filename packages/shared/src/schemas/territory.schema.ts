import { z } from 'zod';

export const territoryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  region: z.string(),
});

export type TerritoryResponse = z.infer<typeof territoryResponseSchema>;
