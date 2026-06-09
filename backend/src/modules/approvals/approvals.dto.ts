import type { Types } from 'mongoose';
import type { ApprovalType } from './approvals.model.js';

/**
 * Service `create` metodi qabul qiladigan kirish shakli.
 * REST route'lar yana `zod` bilan tashqi inputni validatsiya qiladi.
 */
export interface CreateApprovalDto {
  userId: Types.ObjectId | string;
  storeId: Types.ObjectId | string;
  type: ApprovalType;
  requestedDate: Date;
  requestedTime?: string;
  reason: string;
}
