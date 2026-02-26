import { z } from 'zod';

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string(),
  requestId: z.string().uuid(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const validationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ValidationErrorDetail = z.infer<typeof validationErrorDetailSchema>;

export const validationErrorSchema = errorResponseSchema.extend({
  details: z.array(validationErrorDetailSchema),
});

export type ValidationErrorResponse = z.infer<typeof validationErrorSchema>;
