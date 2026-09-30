'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OstolGate } from '@/components/dashboard/OstolGate';
import { PosPageHeader } from '@/components/dashboard/pos/PosPageHeader';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function LoyaltyPage() {
  const t = useTranslations('loyalty');
  const tCommon = useTranslations('common');
  const [form, setForm] = useState({ enabled: true, earn_per_100_egp: '1' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'loyalty')
        .maybeSingle();
      const value = (data?.value ?? {}) as { enabled?: boolean; earn_per_100_egp?: number };
      setForm({
        enabled: value.enabled !== false,
        earn_per_100_egp: String(value.earn_per_100_egp ?? 1),
      });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const earn = Number(form.earn_per_100_egp);
    if (Number.isNaN(earn) || earn < 0) {
      toast.error(t('validation'));
      return;
    }
    const { error } = await supabase.from('settings').upsert({
      key: 'loyalty',
      value: { enabled: form.enabled, earn_per_100_egp: earn },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t('saved'));
  };

  return (
    <OstolGate adminOnly>
      <div className="max-w-lg space-y-6">
        <PosPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />

        {!loading ? (
          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))}
              />
              <Label htmlFor="enabled">{t('enabled')}</Label>
            </div>
            <div>
              <Label htmlFor="earn">{t('earnPer100')}</Label>
              <Input
                id="earn"
                type="number"
                min="0"
                value={form.earn_per_100_egp}
                onChange={(e) => setForm((s) => ({ ...s, earn_per_100_egp: e.target.value }))}
              />
            </div>
            <Button type="button" className="min-h-11" onClick={() => void handleSave()}>
              {tCommon('save')}
            </Button>
          </div>
        ) : null}
      </div>
    </OstolGate>
  );
}
