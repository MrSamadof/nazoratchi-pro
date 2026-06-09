'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/format';
import {
  useGetUnreadCountQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type ApiNotification,
} from '@/services/notificationsApi';

export function NotificationBell(): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // O'qilmaganlar soni — 30 soniyada bir yangilanadi (yengil so'rov).
  const { data: unread = 0 } = useGetUnreadCountQuery(undefined, { pollingInterval: 30_000 });
  // To'liq ro'yxat faqat dropdown ochilganda yuklanadi.
  const { data, isLoading } = useGetNotificationsQuery(undefined, { skip: !open });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const list = data?.notifications ?? [];

  function onItemClick(n: ApiNotification) {
    if (!n.isRead) void markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Bildirishnomalar"
          className="relative size-9 grid place-items-center rounded-[10px] hover:bg-[color:var(--background-2)] transition-colors"
        >
          <Bell className="size-[18px] text-[color:var(--ink-2)]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-[color:var(--rose)] text-white text-[10px] font-semibold tabular">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <span className="text-[13px] font-semibold">Bildirishnomalar</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-[11.5px] text-[color:var(--ink-3)] hover:text-foreground transition-colors"
            >
              <CheckCheck className="size-3.5" />
              Hammasini o&apos;qildim
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="size-4 mx-auto animate-spin text-[color:var(--ink-3)]" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-[12.5px] text-[color:var(--ink-3)]">
              Bildirishnoma yo&apos;q
            </div>
          ) : (
            list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onItemClick(n)}
                className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-[color:var(--background-2)] transition-colors ${
                  n.isRead ? '' : 'bg-[color:var(--accent)]/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && (
                    <span className="mt-1.5 size-1.5 rounded-full bg-[color:var(--rose)] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate">{n.title}</div>
                    {n.body && (
                      <div className="text-[11.5px] text-[color:var(--ink-2)] line-clamp-2">{n.body}</div>
                    )}
                    <div className="text-[10.5px] text-[color:var(--ink-3)] tabular mt-0.5">
                      {formatDateTime(n.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
