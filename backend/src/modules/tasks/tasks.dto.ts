import { z } from 'zod';
import { ASSIGNEE_TYPES } from './tasks.model.js';
import { TASK_PRIORITY, TASK_STATUS } from './tasks.model.js';
import { DIVISIONS } from '../../core/config/constants.js';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Noto'g'ri ID");
const isoDate = z.string().datetime({ offset: true }).or(z.string().min(10));

export const createTaskDto = z
  .object({
    title: z.string().trim().min(3, 'Sarlavha kamida 3 belgi').max(200),
    description: z.string().trim().max(2000).optional().default(''),
    assigneeType: z.enum(ASSIGNEE_TYPES),
    targetDivision: z.enum(DIVISIONS).nullable().optional(),
    targetStoreId: objectIdSchema.nullable().optional(),
    assignees: z.array(objectIdSchema).optional().default([]),
    startAt: isoDate.optional(),
    deadline: isoDate,
    priority: z.enum(TASK_PRIORITY).optional().default('normal'),
  })
  .refine(
    (d) =>
      d.assigneeType !== 'user' || (d.assignees && d.assignees.length > 0),
    { message: 'Kamida bitta xodim tanlang', path: ['assignees'] },
  )
  .refine((d) => d.assigneeType !== 'division' || !!d.targetDivision, {
    message: "Bo'lim tanlang",
    path: ['targetDivision'],
  })
  .refine((d) => d.assigneeType !== 'store' || !!d.targetStoreId, {
    message: "Do'kon tanlang",
    path: ['targetStoreId'],
  });
export type CreateTaskDto = z.infer<typeof createTaskDto>;

export const updateStatusDto = z.object({
  status: z.enum(TASK_STATUS),
});
export type UpdateStatusDto = z.infer<typeof updateStatusDto>;

export const requestExtensionDto = z.object({
  requestedDeadline: isoDate,
  reason: z.string().trim().min(3, 'Sabab kamida 3 belgi').max(500),
});
export type RequestExtensionDto = z.infer<typeof requestExtensionDto>;

export const decideExtensionDto = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(500).optional().default(''),
});
export type DecideExtensionDto = z.infer<typeof decideExtensionDto>;
