'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasDailyOps, isAlaKeefakTenant } from '@/i18n/config';
import { isValidStaffUsername, normalizeStaffUsername } from '@/lib/staff/username';
import { useStaffProfile } from '@/hooks/useStaffProfile';
import {
  ALL_ACTIONS,
  STAFF_RESOURCES,
  can,
  type PermissionMap,
  type StaffAction,
  type StaffResource,
  type StaffRole,
} from '@/lib/staff/permissions';

type StaffUserRow = {
  user_id: string;
  email: string;
  username?: string | null;
  role: StaffRole;
  full_name: string;
  permissions: PermissionMap;
  is_active: boolean;
};

const emptyForm = {
  email: '',
  username: '',
  password: '',
  full_name: '',
  role: 'cashier' as StaffRole,
  is_active: true,
  permissions: {} as PermissionMap,
};

function toggleAction(
  map: PermissionMap,
  resource: StaffResource,
  action: StaffAction
): PermissionMap {
  const current = new Set(map[resource] ?? []);
  if (current.has(action)) current.delete(action);
  else current.add(action);
  if (action !== 'view' && current.has(action)) current.add('view');
  const next = { ...map };
  if (current.size === 0) delete next[resource];
  else next[resource] = ALL_ACTIONS.filter((item) => current.has(item));
  return next;
}

export default function StaffUsersPage() {
  const t = useTranslations('staffUsers');
  const tCommon = useTranslations('common');
  const tSidebar = useTranslations('sidebar');
  const { data: profile, isLoading: roleLoading } = useStaffProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<StaffUserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = can(profile, 'users', 'view');

  const listQuery = useQuery({
    queryKey: ['staff-users'],
    enabled: hasDailyOps && isAdmin,
    queryFn: async () => {
      const res = await fetch('/api/staff');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || tCommon('error'));
      return (body.users ?? []) as StaffUserRow[];
    },
  });

  const users = listQuery.data ?? [];
  const loading = listQuery.isLoading;
  const error = listQuery.error instanceof Error ? listQuery.error : null;
  const load = () => {
    void listQuery.refetch();
  };

  const activeAdmins = useMemo(
    () => users.filter((row) => row.role === 'admin' && row.is_active).length,
    [users]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: StaffUserRow) => {
    setEditing(row);
    setForm({
      email: row.email,
      username: row.username ?? '',
      password: '',
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      permissions: row.permissions ?? {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing && (!form.email.trim() || form.password.length < 8)) {
      toast.error(t('validation'));
      return;
    }
    if (editing && form.password && form.password.length < 8) {
      toast.error(t('validation'));
      return;
    }
    if (isAlaKeefakTenant && form.username.trim()) {
      const normalized = normalizeStaffUsername(form.username);
      if (!normalized || !isValidStaffUsername(normalized)) {
        toast.error(t('usernameInvalid'));
        return;
      }
    }

    setSaving(true);
    try {
      const usernamePayload = isAlaKeefakTenant ? { username: form.username.trim() } : {};

      const payload = editing
        ? {
            user_id: editing.user_id,
            role: form.role,
            full_name: form.full_name,
            is_active: form.is_active,
            permissions: form.permissions,
            password: form.password || undefined,
            ...usernamePayload,
          }
        : {
            email: form.email.trim(),
            password: form.password,
            full_name: form.full_name,
            role: form.role === 'admin' ? 'admin' : form.role,
            permissions: form.permissions,
            ...usernamePayload,
          };

      const res = await fetch('/api/staff', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || tCommon('error'));
      toast.success(editing ? t('updated') : t('created'));
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: deleteTarget.user_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || tCommon('error'));
      toast.success(t('deleted'));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setSaving(false);
    }
  };

  if (!hasDailyOps || roleLoading) return <LoadingPage />;
  if (!isAdmin) return <LoadingPage />;
  if (loading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground font-heading text-xs uppercase tracking-[0.18em]">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-6 w-6" aria-hidden="true" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
        <Button className="min-h-11" onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" aria-hidden="true" />
          {t('invite')}
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className="grid gap-3">
          {users.map((row) => (
            <Card key={row.user_id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{row.full_name || row.email}</CardTitle>
                  <p className="text-muted-foreground text-sm">{row.email}</p>
                  {isAlaKeefakTenant && row.username ? (
                    <p className="text-muted-foreground text-sm">@{row.username}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{tCommon('edit')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={() => setDeleteTarget(row)}
                    disabled={row.role === 'admin' && row.is_active && activeAdmins < 2}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{tCommon('delete')}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-wrap gap-3 text-sm">
                <span>{t(`roles.${row.role}`)}</span>
                <span>{row.is_active ? t('active') : t('disabled')}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editUser') : t('invite')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing ? (
              <div className="space-y-2">
                <Label htmlFor="staff-email">{t('email')}</Label>
                <Input
                  id="staff-email"
                  type="email"
                  className="min-h-11"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="staff-name">{t('fullName')}</Label>
              <Input
                id="staff-name"
                className="min-h-11"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            {isAlaKeefakTenant ? (
              <div className="space-y-2">
                <Label htmlFor="staff-username">{t('username')}</Label>
                <Input
                  id="staff-username"
                  className="min-h-11"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t('usernamePlaceholder')}
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <p className="text-muted-foreground text-xs">{t('usernameHint')}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="staff-password">{editing ? t('resetPassword') : t('password')}</Label>
              <Input
                id="staff-password"
                type="password"
                className="min-h-11"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">{t('role')}</Label>
              <select
                id="staff-role"
                className="border-input bg-background min-h-11 w-full rounded-md border px-3"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value as StaffRole }))
                }
              >
                {(['admin', 'cashier', 'kitchen', 'custom'] as StaffRole[]).map((role) => (
                  <option key={role} value={role}>
                    {t(`roles.${role}`)}
                  </option>
                ))}
              </select>
            </div>
            {editing ? (
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                {t('active')}
              </label>
            ) : null}
            {form.role === 'custom' ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('permissions')}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead>
                      <tr>
                        <th className="p-2">{t('page')}</th>
                        {ALL_ACTIONS.map((action) => (
                          <th key={action} className="p-2 font-medium">
                            {t(`actions.${action}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {STAFF_RESOURCES.filter((resource) => resource !== 'users').map(
                        (resource) => (
                          <tr key={resource} className="border-t">
                            <td className="p-2">{tSidebar(resource)}</td>
                            {ALL_ACTIONS.map((action) => {
                              const checked = (form.permissions[resource] ?? []).includes(action);
                              return (
                                <td key={action} className="p-2">
                                  <input
                                    type="checkbox"
                                    className="size-4"
                                    checked={checked}
                                    aria-label={`${tSidebar(resource)} ${t(`actions.${action}`)}`}
                                    onChange={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        permissions: toggleAction(
                                          prev.permissions,
                                          resource,
                                          action
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button className="min-h-11" onClick={handleSave} disabled={saving}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
}
