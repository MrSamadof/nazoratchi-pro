'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Edit2,
  KeyRound,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { formatDateTime } from '@/lib/format';
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useRestoreUserMutation,
  useResetPinMutation,
  type ApiUser,
} from '@/services/usersApi';
import { ROLE_LABELS, DIVISION_LABELS, SHIFT_META, type Role, type ShiftType } from '@/shared/types';

export type UserRow = ApiUser;

export interface StoreOption {
  id: string;
  name: string;
}

type FilterKey = 'all' | 'managers' | 'employees' | 'pending' | 'inactive';

interface Props {
  stores: StoreOption[];
  currentUserId: string;
  scope?: 'ceo' | 'admin';
  allowedRoles?: Role[];
}

export function UsersManager({
  stores,
  currentUserId,
  scope = 'ceo',
  allowedRoles = ['employee', 'manager', 'ceo'],
}: Props): React.ReactElement {
  const { data: users = [], isLoading } = useListUsersQuery({ includeDeleted: true, scope });
  const [restoreUser] = useRestoreUserMutation();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [pinTarget, setPinTarget] = useState<UserRow | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'managers' && u.role === 'employee') return false;
      if (filter === 'employees' && u.role !== 'employee') return false;
      if (filter === 'pending' && u.isApproved) return false;
      if (filter === 'inactive' && u.isActive) return false;
      if (filter === 'all' && !u.isActive) return false;
      if (!term) return true;
      const name = `${u.lastName ?? ''} ${u.firstName}`.toLowerCase();
      return name.includes(term) || u.phone.includes(term);
    });
  }, [users, filter, search]);

  async function restore(u: UserRow) {
    try {
      await restoreUser({ id: u.id, scope }).unwrap();
      toast.success('Foydalanuvchi tiklandi');
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Tiklab boʻlmadi');
    }
  }

  const counts = {
    all: users.filter((u) => u.isActive).length,
    managers: users.filter((u) => u.isActive && (u.role === 'manager' || u.role === 'ceo')).length,
    employees: users.filter((u) => u.isActive && u.role === 'employee').length,
    pending: users.filter((u) => u.isActive && !u.isApproved).length,
    inactive: users.filter((u) => !u.isActive).length,
  };

  return (
    <>
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-[color:var(--ink-2)]" />
            <h2 className="text-[14px] font-semibold">
              Foydalanuvchilar ({filtered.length})
            </h2>
          </div>
          <Modal open={createOpen} onOpenChange={setCreateOpen}>
            <ModalTrigger asChild>
              <Button>
                <Plus />
                Yangi foydalanuvchi
              </Button>
            </ModalTrigger>
            <UserFormModal
              mode="create"
              stores={stores}
              scope={scope}
              allowedRoles={allowedRoles}
              onClose={() => setCreateOpen(false)}
              onSuccess={() => setCreateOpen(false)}
            />
          </Modal>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
            Faol
          </FilterTab>
          <FilterTab
            active={filter === 'managers'}
            onClick={() => setFilter('managers')}
            count={counts.managers}
          >
            Menejer/CEO
          </FilterTab>
          <FilterTab
            active={filter === 'employees'}
            onClick={() => setFilter('employees')}
            count={counts.employees}
          >
            Xodimlar
          </FilterTab>
          <FilterTab
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            count={counts.pending}
          >
            Tasdiq kutmoqda
          </FilterTab>
          <FilterTab
            active={filter === 'inactive'}
            onClick={() => setFilter('inactive')}
            count={counts.inactive}
          >
            Faolsiz
          </FilterTab>
          <div className="flex-1" />
          <div className="relative w-full sm:w-64">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ink-3)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki telefon..."
              className="pl-8 h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-[color:var(--ink-3)]">
            <Loader2 className="size-5 mx-auto animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-[color:var(--ink-3)]">
            Hech narsa topilmadi.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const fullName = `${u.lastName ?? ''} ${u.firstName}`.trim();
              const isSelf = u.id === currentUserId;
              return (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 p-3 rounded-[12px] border bg-card hover:bg-[color:var(--background-2)]/40 transition-colors sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1 sm:items-center">
                  <Avatar name={fullName} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-semibold truncate">{fullName}</span>
                      <Badge tone={u.role === 'ceo' ? 'ink' : u.role === 'manager' ? 'accent' : 'neutral'}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      {!u.isApproved && (
                        <Badge tone="amber" dot>
                          Tasdiq kutmoqda
                        </Badge>
                      )}
                      {!u.isActive && (
                        <Badge tone="rose" dot>
                          Faolsiz
                        </Badge>
                      )}
                      {u.division && (
                        <Badge tone="outline">{DIVISION_LABELS[u.division]}</Badge>
                      )}
                      {isSelf && <Badge tone="outline">Siz</Badge>}
                    </div>
                    <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5 tabular">
                      +{u.phone}
                      {u.storeName && <span className="ml-2">· {u.storeName}</span>}
                      {u.lastLoginAt && (
                        <span className="ml-2">· kirgan: {formatDateTime(u.lastLoginAt)}</span>
                      )}
                    </div>
                  </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 justify-end border-t pt-2.5 sm:border-t-0 sm:pt-0">
                    <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                      <Edit2 />
                      Tahrirlash
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPinTarget(u)} title="PIN tiklash">
                      <KeyRound />
                    </Button>
                    {u.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(u)}
                        disabled={isSelf}
                        title={isSelf ? "O'zingizni o'chira olmaysiz" : "O'chirish"}
                      >
                        <Trash2 className="text-[color:var(--rose)]" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restore(u)}
                        title="Tiklash"
                      >
                        <RotateCcw className="text-[color:var(--emerald)]" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {editing && (
        <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <UserFormModal
            mode="edit"
            user={editing}
            stores={stores}
            scope={scope}
            allowedRoles={allowedRoles}
            isSelf={editing.id === currentUserId}
            onClose={() => setEditing(null)}
            onSuccess={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <DeleteConfirm
            user={deleting}
            scope={scope}
            onClose={() => setDeleting(null)}
            onSuccess={() => setDeleting(null)}
          />
        </Modal>
      )}

      {pinTarget && (
        <Modal open={!!pinTarget} onOpenChange={(o) => !o && setPinTarget(null)}>
          <ResetPinModal
            user={pinTarget}
            scope={scope}
            onClose={() => setPinTarget(null)}
            onSuccess={() => setPinTarget(null)}
          />
        </Modal>
      )}
    </>
  );
}

function FilterTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] text-[12.5px] font-medium transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'bg-[color:var(--background-2)] text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)]/80'
      }`}
    >
      {children}
      <span
        className={`text-[11px] tabular ${
          active ? 'opacity-70' : 'text-[color:var(--ink-3)]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function UserFormModal({
  mode,
  user,
  stores,
  scope = 'ceo',
  allowedRoles = ['employee', 'manager', 'ceo'],
  isSelf,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  user?: UserRow;
  stores: StoreOption[];
  scope?: 'ceo' | 'admin';
  allowedRoles?: Role[];
  isSelf?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'employee');
  const [storeId, setStoreId] = useState<string>(user?.storeId ?? '');
  const [division, setDivision] = useState<string>(user?.division ?? '');
  const [defaultShiftType, setDefaultShiftType] = useState<string>(user?.defaultShiftType ?? '');
  const [defaultShiftStartTime, setDefaultShiftStartTime] = useState<string>(
    user?.defaultShiftStartTime ?? '09:00',
  );
  const [defaultShiftEndTime, setDefaultShiftEndTime] = useState<string>(
    user?.defaultShiftEndTime ?? '18:00',
  );
  const [isApproved, setIsApproved] = useState(user?.isApproved ?? true);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const submitting = creating || updating;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (firstName.trim().length < 2) {
      toast.error("Ism kamida 2 belgi bo'lishi kerak");
      return;
    }
    if (!/^\d{9,20}$/.test(phone)) {
      toast.error("Telefon faqat raqamlardan iborat (9-20)");
      return;
    }
    if (mode === 'create' && !/^\d{4}$/.test(password)) {
      toast.error('PIN 4 raqamdan iborat');
      return;
    }
    if (role !== 'ceo' && defaultShiftType === 'custom') {
      if (defaultShiftStartTime >= defaultShiftEndTime) {
        toast.error("Boshlanish vaqti tugashdan oldin bo'lishi kerak");
        return;
      }
    }

    const base = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      role,
      // Faqat CEO do'kon/ofisga biriktirilmaydi. Menejer ham do'kon/ofisga ulanadi
      // (kelish/ketish davomati uchun).
      storeId: role === 'ceo' ? null : storeId || null,
      division: (division || null) as ApiUser['division'],
      // Smena CEO uchun emas; sotuvchi va menejerga mumkin.
      defaultShiftType: role === 'ceo'
        ? null
        : ((defaultShiftType || null) as ApiUser['defaultShiftType']),
      defaultShiftStartTime:
        role !== 'ceo' && defaultShiftType === 'custom' ? defaultShiftStartTime : null,
      defaultShiftEndTime:
        role !== 'ceo' && defaultShiftType === 'custom' ? defaultShiftEndTime : null,
      isApproved,
      isActive,
    };

    try {
      if (mode === 'create') {
        await createUser({ ...base, password, scope }).unwrap();
      } else {
        await updateUser({ id: user!.id, body: base, scope }).unwrap();
      }
      toast.success(mode === 'create' ? "Foydalanuvchi qo'shildi" : 'Saqlandi');
      onSuccess();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Saqlanmadi');
    }
  }

  return (
    <ModalContent
      icon={mode === 'create' ? <Plus /> : <Edit2 />}
      iconTone={mode === 'create' ? 'emerald' : 'accent'}
      title={mode === 'create' ? 'Yangi foydalanuvchi' : 'Foydalanuvchini tahrirlash'}
      subtitle={
        mode === 'create'
          ? "Telefon va PIN bilan tizimga kira oladi. CEO yaratgan foydalanuvchi avtomatik tasdiqlanadi."
          : user
            ? `${user.lastName ?? ''} ${user.firstName}`.trim()
            : undefined
      }
      width={520}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form="user-form" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {mode === 'create' ? "Qo'shish" : 'Saqlash'}
          </Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ism">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Aziz" />
          </Field>
          <Field label="Familiya" optional>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Karimov" />
          </Field>
        </div>
        <Field label="Telefon" hint="Faqat raqamlar, masalan 998901234567">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="998901234567"
            className="tabular"
            inputMode="numeric"
          />
        </Field>
        {mode === 'create' && (
          <Field label="PIN" hint="4 raqamli">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
              maxLength={4}
              className="tabular"
              inputMode="numeric"
              placeholder="1234"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rol">
            <NativeSelect
              value={role}
              onChange={(v) => setRole(v as Role)}
              disabled={isSelf && mode === 'edit'}
              options={[
                { value: 'employee', label: 'Xodim' },
                { value: 'manager', label: 'Menejer' },
                { value: 'ceo', label: 'CEO' },
              ].filter((o) => allowedRoles.includes(o.value as Role))}
            />
          </Field>
          {role !== 'ceo' ? (
            <Field
              label="Doʻkon / ofis"
              hint={role === 'manager' ? 'Menejer kelish/ketish davomati uchun do\'kon yoki ofisga ulanadi' : undefined}
              optional
            >
              <NativeSelect
                value={storeId}
                onChange={setStoreId}
                options={[
                  { value: '', label: "Biriktirilmagan" },
                  ...stores.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </Field>
          ) : (
            <Field label="Doʻkon" hint="CEO ofisda — do'kon biriktirilmaydi">
              <div className="flex h-10 w-full items-center rounded-[10px] border border-[color:var(--border-2)] bg-[color:var(--background-2)] px-3 text-[13.5px] text-[color:var(--ink-3)]">
                Ofis
              </div>
            </Field>
          )}
        </div>

        {role !== 'ceo' && (
          <>
            <Field
              label="Smena"
              hint="Doimiy smena — kech kelish/erta ketish shu ish vaqtiga nisbatan hisoblanadi. 'Qo'lda' tanlansa, soatni o'zingiz kiritasiz."
              optional
            >
              <NativeSelect
                value={defaultShiftType}
                onChange={setDefaultShiftType}
                options={[
                  { value: '', label: 'Smena tanlanmagan' },
                  ...(['morning', 'evening', 'flexible', 'day_off'] as ShiftType[]).map((s) => ({
                    value: s,
                    label: SHIFT_META[s].startTime
                      ? `${SHIFT_META[s].label} (${SHIFT_META[s].short})`
                      : SHIFT_META[s].label,
                  })),
                  { value: 'custom', label: "Qo'lda (soatni kiriting)" },
                ]}
              />
            </Field>
            {defaultShiftType === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Boshlanish" hint="HH:mm">
                  <Input
                    type="time"
                    value={defaultShiftStartTime}
                    onChange={(e) => setDefaultShiftStartTime(e.target.value)}
                    className="tabular"
                  />
                </Field>
                <Field label="Tugash" hint="HH:mm">
                  <Input
                    type="time"
                    value={defaultShiftEndTime}
                    onChange={(e) => setDefaultShiftEndTime(e.target.value)}
                    className="tabular"
                  />
                </Field>
              </div>
            )}
          </>
        )}

        <Field label="Boʻlim" hint="Savdo xodimlari uchun — rag'bat shu bo'lim bo'yicha hisoblanadi" optional>
          <NativeSelect
            value={division}
            onChange={setDivision}
            options={[
              { value: '', label: "Boʻlim yoʻq" },
              { value: 'dubai_house', label: 'Dubai House' },
              { value: 'amir', label: 'Amir' },
            ]}
          />
        </Field>

        <div className="rounded-[10px] bg-[color:var(--background-2)] p-3 flex items-start gap-2.5">
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold">Tasdiqlangan</div>
            <div className="text-[11px] text-[color:var(--ink-3)]">
              Tasdiqlanmagan foydalanuvchi tizimga kira olmaydi
            </div>
          </div>
          <Toggle on={isApproved} onChange={setIsApproved} />
        </div>

        <div className="rounded-[10px] bg-[color:var(--background-2)] p-3 flex items-start gap-2.5">
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold">Faol</div>
            <div className="text-[11px] text-[color:var(--ink-3)]">
              Faolsizlantirilganlar tizimga kira olmaydi, sessiyalari bekor qilinadi
            </div>
          </div>
          <Toggle
            on={isActive}
            onChange={setIsActive}
            disabled={isSelf}
          />
        </div>
      </form>
    </ModalContent>
  );
}

function DeleteConfirm({
  user,
  scope = 'ceo',
  onClose,
  onSuccess,
}: {
  user: UserRow;
  scope?: 'ceo' | 'admin';
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [deactivateUser, { isLoading: submitting }] = useDeactivateUserMutation();
  async function del() {
    try {
      await deactivateUser({ id: user.id, scope }).unwrap();
      toast.success('Foydalanuvchi faolsizlantirildi');
      onSuccess();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? "Oʻchirib boʻlmadi");
    }
  }
  const fullName = `${user.lastName ?? ''} ${user.firstName}`.trim();
  return (
    <ModalContent
      icon={<Trash2 />}
      iconTone="rose"
      title="Foydalanuvchini faolsizlantirish?"
      subtitle="Foydalanuvchi tizimga kira olmay qoladi va aktiv sessiyalari bekor qilinadi. Keyinchalik tiklash mumkin."
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="button" variant="destructive" onClick={del} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            <Trash2 />
            Faolsizlantirish
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[color:var(--background-2)]">
        <Avatar name={fullName} size={40} />
        <div>
          <div className="text-[13px] font-semibold">{fullName}</div>
          <div className="text-[11.5px] text-[color:var(--ink-3)] tabular">+{user.phone}</div>
        </div>
      </div>
    </ModalContent>
  );
}

function ResetPinModal({
  user,
  scope = 'ceo',
  onClose,
  onSuccess,
}: {
  user: UserRow;
  scope?: 'ceo' | 'admin';
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [pin, setPin] = useState('');
  const [resetPin, { isLoading: submitting }] = useResetPinMutation();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN 4 raqamdan iborat');
      return;
    }
    try {
      await resetPin({ id: user.id, password: pin, scope }).unwrap();
      toast.success('PIN yangilandi');
      onSuccess();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? "Oʻzgartirib boʻlmadi");
    }
  }
  const fullName = `${user.lastName ?? ''} ${user.firstName}`.trim();
  return (
    <ModalContent
      icon={<KeyRound />}
      iconTone="amber"
      title="PIN tiklash"
      subtitle={`${fullName} uchun yangi PIN o‘rnatish`}
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form="reset-pin-form" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Saqlash
          </Button>
        </div>
      }
    >
      <form id="reset-pin-form" onSubmit={submit} className="space-y-3">
        <Field label="Yangi PIN" hint="4 raqamli. Foydalanuvchini ogohlantiring.">
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            maxLength={4}
            className="tabular"
            inputMode="numeric"
            placeholder="1234"
            autoFocus
          />
        </Field>
      </form>
    </ModalContent>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</Label>
        {optional && <span className="text-[11px] text-[color:var(--ink-3)]">ixtiyoriy</span>}
      </div>
      {children}
      {hint && <div className="text-[11.5px] text-[color:var(--ink-3)]">{hint}</div>}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full rounded-[10px] border border-[color:var(--border-2)] bg-card px-3 py-2 text-[13.5px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-primary' : 'bg-[color:var(--border-2)]'
      }`}
      aria-pressed={on}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          on ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
