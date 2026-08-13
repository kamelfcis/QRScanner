'use client';

import { SiteFooter, SiteHeader } from '@/components/landing/SiteChrome';
import { useI18n } from '@/lib/i18n';

export default function TermsPage() {
  const { locale, t } = useI18n();
  const ar = locale === 'ar';

  return (
    <div>
      <SiteHeader solid />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-sm leading-relaxed">
        <h1 className="font-heading text-3xl font-bold">{ar ? 'شروط الاستخدام' : 'Terms of use'}</h1>
        <p className="text-muted-foreground">{t.legalUpdated}</p>
        {ar ? (
          <>
            <p>
              استخدام موقع Engaz التعريفي يعني الموافقة على أن إرسال النموذج هو طلب انضمام للمراجعة، وليس إنشاء حساب لوحة تحكم فوري، وليس تفعيلًا تلقائيًا لموقع المطعم.
            </p>
            <p>
              المنتج يوفّر قوائم QR ثنائية اللغة، طلب واتساب، تحليلات، واستيراد بالذكاء الاصطناعي. لا يشمل بوابات دفع أو حجوزات أو برامج ولاء.
            </p>
            <p>
              بعد الموافقة والتجهيز، دخول صاحب المطعم يكون على رابط موقعه الخاص. لوحة Engaz Admin مخصصة لفريق ILC Soft فقط.
            </p>
            <p>هذه الشروط لا تستبدل عقدًا تجاريًا مفصلًا إن وُقّع لاحقًا.</p>
          </>
        ) : (
          <>
            <p>
              Using the Engaz marketing site means you agree that submitting the form is a join request for review — not
              an instant dashboard account and not automatic restaurant provisioning.
            </p>
            <p>
              The product provides bilingual QR menus, WhatsApp ordering, analytics, and AI import. It does not include
              payments, reservations, or loyalty.
            </p>
            <p>
              After approval and setup, restaurant owners sign in on their own live URL. Engaz Admin is for ILC Soft
              staff only.
            </p>
            <p>These terms do not replace a later commercial agreement if one is signed.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
