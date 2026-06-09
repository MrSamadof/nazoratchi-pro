import { Types } from 'mongoose';
import { Task, type TaskDoc, type TaskStatus, type AssigneeType } from './tasks.model.js';
import { User } from '../users/users.model.js';
import type { Division } from '../../core/config/constants.js';

export class TasksError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'NO_ASSIGNEES' | 'EXT_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'TasksError';
  }
}

export class TasksService {
  /** Bajaruvchilarni aniqlash (snapshot). */
  async resolveAssignees(params: {
    assigneeType: AssigneeType;
    assignees?: Array<Types.ObjectId | string>;
    targetDivision?: Division | null;
    targetStoreId?: Types.ObjectId | string | null;
  }): Promise<Types.ObjectId[]> {
    if (params.assigneeType === 'user') {
      return (params.assignees ?? []).map((id) => new Types.ObjectId(id));
    }
    const base: Record<string, unknown> = {
      isActive: true,
      isApproved: true,
      role: { $in: ['employee', 'manager'] },
    };
    if (params.assigneeType === 'division') base.division = params.targetDivision;
    if (params.assigneeType === 'store') base.storeId = params.targetStoreId;
    // 'all' — qo'shimcha filtr yo'q.
    const users = await User.find(base).select('_id').lean();
    return users.map((u) => u._id);
  }

  async create(params: {
    title: string;
    description?: string;
    assigneeType: AssigneeType;
    assignees?: Array<Types.ObjectId | string>;
    targetDivision?: Division | null;
    targetStoreId?: Types.ObjectId | string | null;
    startAt?: Date;
    deadline: Date;
    priority?: string;
    createdBy: Types.ObjectId;
  }): Promise<TaskDoc> {
    const assignees = await this.resolveAssignees({
      assigneeType: params.assigneeType,
      assignees: params.assignees,
      targetDivision: params.targetDivision ?? null,
      targetStoreId: params.targetStoreId ?? null,
    });
    if (assignees.length === 0) {
      throw new TasksError('NO_ASSIGNEES', 'Bajaruvchilar topilmadi');
    }
    return Task.create({
      title: params.title,
      description: params.description ?? '',
      createdBy: params.createdBy,
      assigneeType: params.assigneeType,
      targetDivision: params.targetDivision ?? null,
      targetStoreId: params.targetStoreId ?? null,
      assignees,
      startAt: params.startAt ?? new Date(),
      deadline: params.deadline,
      priority: params.priority ?? 'normal',
      status: 'todo',
    });
  }

  async findById(id: Types.ObjectId | string): Promise<TaskDoc | null> {
    return Task.findById(id);
  }

  /** Barcha topshiriqlar (manager/CEO doskasi). */
  async listAll(): Promise<TaskDoc[]> {
    return Task.find()
      .sort({ deadline: 1 })
      .populate('createdBy', 'firstName lastName')
      .populate('assignees', 'firstName lastName')
      .populate('extensions.requestedBy', 'firstName lastName');
  }

  /** Foydalanuvchiga biriktirilgan topshiriqlar. */
  async listForUser(userId: Types.ObjectId): Promise<TaskDoc[]> {
    return Task.find({ assignees: userId })
      .sort({ deadline: 1 })
      .populate('createdBy', 'firstName lastName')
      .populate('assignees', 'firstName lastName')
      .populate('extensions.requestedBy', 'firstName lastName');
  }

  /**
   * Status o'zgartirish. Faqat bajaruvchi, yaratuvchi yoki rahbar/CEO.
   */
  async updateStatus(
    taskId: Types.ObjectId | string,
    userId: Types.ObjectId,
    status: TaskStatus,
    isManager: boolean,
  ): Promise<TaskDoc> {
    const task = await Task.findById(taskId);
    if (!task) throw new TasksError('NOT_FOUND', 'Topshiriq topilmadi');

    const allowed =
      isManager ||
      task.createdBy.equals(userId) ||
      task.assignees.some((a: Types.ObjectId) => a.equals(userId));
    if (!allowed) throw new TasksError('FORBIDDEN', 'Bu topshiriqni o\'zgartira olmaysiz');

    task.status = status;
    if (status === 'done') {
      task.completedAt = new Date();
      task.completedBy = userId;
    } else {
      task.completedAt = null;
      task.completedBy = null;
    }
    await task.save();
    return task;
  }

  /** Muddatni surish so'rovi (bajaruvchi). */
  async requestExtension(
    taskId: Types.ObjectId | string,
    userId: Types.ObjectId,
    requestedDeadline: Date,
    reason: string,
  ): Promise<TaskDoc> {
    const task = await Task.findById(taskId);
    if (!task) throw new TasksError('NOT_FOUND', 'Topshiriq topilmadi');
    const isAssignee = task.assignees.some((a: Types.ObjectId) => a.equals(userId));
    if (!isAssignee && !task.createdBy.equals(userId)) {
      throw new TasksError('FORBIDDEN', 'Faqat bajaruvchi muddat surishi mumkin');
    }
    task.extensions.push({
      requestedBy: userId,
      requestedDeadline,
      reason,
      status: 'pending',
    });
    await task.save();
    return task;
  }

  /** Muddat surish so'rovini hal qilish (CEO/nazoratchi). Tasdiqlansa deadline yangilanadi. */
  async decideExtension(
    taskId: Types.ObjectId | string,
    extId: string,
    adminId: Types.ObjectId,
    decision: 'approve' | 'reject',
    comment: string,
  ): Promise<TaskDoc> {
    const task = await Task.findById(taskId);
    if (!task) throw new TasksError('NOT_FOUND', 'Topshiriq topilmadi');

    const ext = task.extensions.id(extId);
    if (!ext) throw new TasksError('EXT_NOT_FOUND', 'So\'rov topilmadi');

    ext.status = decision === 'approve' ? 'approved' : 'rejected';
    ext.decidedBy = adminId;
    ext.decidedAt = new Date();
    ext.comment = comment;

    if (decision === 'approve') {
      task.deadline = ext.requestedDeadline;
    }
    await task.save();
    return task;
  }
}

export const tasksService = new TasksService();
