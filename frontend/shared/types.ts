/**
 * Frontend bo'ylab bo'lishiladigan domen tiplari va yorliqlar.
 * Backend'dagi enum/konstantalar bilan mos bo'lishi kerak
 * (backend/src/core/config/constants.ts, users.model.ts).
 */

export type Role = 'employee' | 'manager' | 'ceo';
export type Division = 'dubai_house' | 'amir';
export type ShiftType = 'morning' | 'evening' | 'flexible' | 'day_off' | 'custom';
export type ApprovalType = 'late_arrival' | 'early_leave' | 'day_off';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type AttendanceStatus = 'present' | 'late' | 'left_early' | 'absent';

export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Xodim',
  manager: 'Menejer',
  ceo: 'CEO',
};

export const DIVISION_LABELS: Record<Division, string> = {
  dubai_house: 'Dubai House',
  amir: 'Amir',
};

export interface ShiftMeta {
  label: string;
  short: string;
  startTime: string | null;
  endTime: string | null;
  /** UI rang tokeni (badge tone). */
  tone: 'accent' | 'amber' | 'neutral' | 'rose' | 'emerald';
}

export const SHIFT_META: Record<ShiftType, ShiftMeta> = {
  morning: { label: 'Ertalabki', short: '08–18', startTime: '08:00', endTime: '18:00', tone: 'accent' },
  evening: { label: 'Kechki', short: '13–23', startTime: '13:00', endTime: '23:00', tone: 'amber' },
  flexible: { label: "O'zgaruvchan", short: '10 soat', startTime: null, endTime: null, tone: 'emerald' },
  day_off: { label: 'Dam olish', short: 'Dam', startTime: null, endTime: null, tone: 'neutral' },
  custom: { label: "Qo'lda", short: 'Maxsus', startTime: null, endTime: null, tone: 'accent' },
};

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  late_arrival: 'Kech kelish',
  early_leave: 'Erta ketish',
  day_off: 'Dam olish',
};

export type RewardType = 'manual' | 'auto_store' | 'auto_employee';
export type RewardStatus = 'pending' | 'approved' | 'rejected';

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  manual: "Qo'lda",
  auto_store: "Do'kon (avto)",
  auto_employee: 'Xodim (avto)',
};

export const REWARD_STATUS_META: Record<
  RewardStatus,
  { label: string; tone: 'amber' | 'emerald' | 'rose' }
> = {
  pending: { label: 'Kutilmoqda', tone: 'amber' },
  approved: { label: 'Tasdiqlandi', tone: 'emerald' },
  rejected: { label: 'Rad etildi', tone: 'rose' },
};

export type SuggestionStatus = 'new' | 'reviewing' | 'accepted' | 'rejected';

export const SUGGESTION_STATUS_META: Record<
  SuggestionStatus,
  { label: string; tone: 'accent' | 'amber' | 'emerald' | 'rose' }
> = {
  new: { label: 'Yangi', tone: 'accent' },
  reviewing: { label: "Ko'rib chiqilmoqda", tone: 'amber' },
  accepted: { label: 'Qabul qilindi', tone: 'emerald' },
  rejected: { label: 'Rad etildi', tone: 'rose' },
};
