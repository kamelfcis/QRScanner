'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { hasDailyOps } from '@/i18n/config';
import { useStaffRole } from '@/hooks/useStaffRole';
import { canAccessExpenses } from '@/lib/staff/roles';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpensesForMonth,
  useUpdateExpense,
  sumExpenses,
  type Expense,
} from '@/hooks/useExpenses';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';

const emptyForm = {
  amount: '',
  category: '',
  description: '',
  expense_date: format(new Date(), 'yyyy-MM-dd'),
};

export default function ExpensesPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { data: role, isLoading: roleLoading } = useStaffRole();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: expenses, isLoading, error, refetch } = useExpensesForMonth(year, month);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const currency = settings?.currency ?? 'EGP';
  const currencyLocale = toCurrencyLocale(locale);
  const monthTotal = useMemo(() => sumExpenses(expenses), [expenses]);
  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy');

  useEffect(() => {
    if (!hasDailyOps) {
      router.replace('/dashboard');
      return;
    }
    if (!roleLoading && !canAccessExpenses(role)) {
      router.replace('/dashboard/orders');
    }
  }, [role, roleLoading, router]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: Expense) => {
    setEditing(row);
    setForm({
      amount: String(row.amount),
      category: row.category,
      description: row.description ?? '',
      expense_date: row.expense_date,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!form.category.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error(t('validation'));
      return;
    }

    try {
      const payload = {
        amount,
        category: form.category.trim(),
        description: form.description.trim() || null,
        expense_date: form.expense_date,
      };
      if (editing) {
        await updateExpense.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('updated'));
      } else {
        await createExpense.mutateAsync(payload);
        toast.success(t('created'));
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      toast.success(t('deleted'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  if (!hasDailyOps || roleLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground font-heading text-xs uppercase tracking-[0.18em]">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Wallet className="h-6 w-6" aria-hidden="true" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
        <Button className="min-h-11" onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" aria-hidden="true" />
          {t('addExpense')}
        </Button>
      </div>

      <div className="bg-card rounded-xl border p-4 shadow-sm">
        <p className="text-muted-foreground text-sm">{t('monthTotal', { month: monthLabel })}</p>
        <p className="font-heading mt-1 text-3xl font-semibold tabular-nums">
          {formatCurrencyAmount(monthTotal, currency, { locale: currencyLocale })}
        </p>
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : !expenses?.length ? (
        <EmptyState title={t('empty')} description={t('emptyDescription')} />
      ) : (
        <ul className="divide-y rounded-xl border">
          {expenses.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{row.category}</p>
                <p className="text-muted-foreground text-sm">
                  {format(new Date(row.expense_date), 'yyyy-MM-dd')}
                  {row.description ? ` · ${row.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-semibold tabular-nums">
                  {formatCurrencyAmount(row.amount, currency, { locale: currencyLocale })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  onClick={() => openEdit(row)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{tCommon('edit')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive min-h-11 min-w-11"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{tCommon('delete')}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('editExpense') : t('addExpense')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">{t('amount')}</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">{t('category')}</Label>
              <Input
                id="expense-category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">{t('date')}</Label>
              <Input
                id="expense-date"
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">{t('descriptionLabel')}</Label>
              <Textarea
                id="expense-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('deleteExpense')}
        description={t('deleteConfirm')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        loading={deleteExpense.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
