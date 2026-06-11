import { requireCeoSession } from '@/lib/session';
import { AttendanceMonitor } from '@/components/ceo/attendance-monitor';

export const dynamic = 'force-dynamic';

export default async function CeoAttendancePage(): Promise<React.ReactElement> {
  await requireCeoSession();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">
          Xodimlar davomati
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
          Har bir xodim qachon keldi, qachon ketdi — kunlik nazorat va jarimalar
        </p>
      </div>

      <AttendanceMonitor />
    </div>
  );
}
