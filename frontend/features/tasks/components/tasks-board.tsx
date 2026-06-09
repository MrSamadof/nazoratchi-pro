'use client';

import { Loader2 } from 'lucide-react';
import { useListTasksQuery, type TaskStatus } from '@/services/tasksApi';
import { TaskCard } from './task-card';
import { TaskCreateForm } from './task-create-form';
import type { Role } from '@/shared/types';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: 'todo', label: 'Bajarilmoqda' },
  { status: 'in_progress', label: 'Jarayonda' },
  { status: 'done', label: 'Bajarildi' },
];

export function TasksBoard({ role }: { role: Role }): React.ReactElement {
  const canManage = role === 'manager' || role === 'ceo';
  const { data: tasks = [], isLoading } = useListTasksQuery();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <TaskCreateForm />
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="size-6 mx-auto animate-spin text-[color:var(--ink-3)]" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="rounded-[14px] bg-[color:var(--background-2)]/50 p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[12.5px] font-semibold">{col.label}</span>
                  <span className="text-[11px] text-[color:var(--ink-3)] tabular">{items.length}</span>
                </div>
                <div className="space-y-2.5">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-[12px] text-[color:var(--ink-3)]">—</div>
                  ) : (
                    items.map((t) => <TaskCard key={t.id} task={t} canManage={canManage} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
