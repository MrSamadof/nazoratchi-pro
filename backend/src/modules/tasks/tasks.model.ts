import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';
import { DIVISIONS } from '../../core/config/constants.js';

export const TASK_STATUS = ['todo', 'in_progress', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const TASK_PRIORITY = ['low', 'normal', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITY)[number];

/** Topshiriq kimga: shaxs / bo'lim / do'kon / hamma. */
export const ASSIGNEE_TYPES = ['user', 'division', 'store', 'all'] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

export const EXTENSION_STATUS = ['pending', 'approved', 'rejected'] as const;
export type ExtensionStatus = (typeof EXTENSION_STATUS)[number];

const extensionSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedDeadline: { type: Date, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: EXTENSION_STATUS, default: 'pending' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    comment: { type: String, default: '' },
  },
  { timestamps: true },
);

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    assigneeType: { type: String, enum: ASSIGNEE_TYPES, required: true },
    targetDivision: { type: String, enum: [...DIVISIONS, null], default: null },
    targetStoreId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    // Hisoblangan bajaruvchilar (yaratish paytidagi snapshot) — "mening topshiriqlarim" uchun.
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    startAt: { type: Date, default: () => new Date() },
    deadline: { type: Date, required: true },

    status: { type: String, enum: TASK_STATUS, default: 'todo', index: true },
    priority: { type: String, enum: TASK_PRIORITY, default: 'normal' },

    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Muddatni surish so'rovlari (Trello'dagi kabi — deadline o'zgarishi mumkin).
    extensions: { type: [extensionSchema], default: [] },
  },
  { timestamps: true },
);

taskSchema.index({ status: 1, deadline: 1 });
taskSchema.index({ assignees: 1, status: 1 });

export type TaskType = InferSchemaType<typeof taskSchema>;
export type TaskDoc = HydratedDocument<TaskType>;
export const Task = mongoose.models.Task ?? model('Task', taskSchema);
