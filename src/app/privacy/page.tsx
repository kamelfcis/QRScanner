'use client';

import { SiteFooter, SiteHeader } from '@/components/landing/SiteChrome';
import { useI18n } from '@/lib/i18n';

export default function PrivacyPage() {
  const { locale, t } = useI18n();
  const ar = locale === 'ar';

  return (
    <div>
      <SiteHeader solid />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-sm leading-relaxed">
        <h1 className="font-heading text-3xl font-bold">{ar ? 'سياسة الخصوصية' : 'Privacy policy'}</h1>
        <p className="text-muted-foreground">{t.legalUpdated}</p>
        {ar ? (
          <>
            <p>
              Engaz منتج من ILC Soft. هذه الصفحة توضح كيف نتعامل مع بيانات طلب الانضمام على موقع التعريف.
            </p>
            <p>
              عند إرسال طلب من صفحة التسجيل نجمع الاسم، البريد، رقم الهاتف، اسم النشاط، العنوان، وكلمة مرور تُحفظ مشفّرة لاستخدامها لاحقًا على لوحة موقع المطعم بعد التجهيز. لا نستخدم هذه الكلمة لدخول لوحة Engaz Admin.
            </p>
            <p>
              ملفات اللوجو أو المنيو الاختيارية تُرفع إلى مشروع Engaz على Supabase. ملفات المنيو الخاصة لا تُعرض للعامة.
            </p>
            <p>
              لا نبيع البيانات. الوصول للمراجعة محصور بفريق Engaz. لا نذكر هنا عنوان شركة أو رقم هاتف للتواصل لأنهما غير منشورين على هذا الموقع.
            </p>
          </>
        ) : (
          <>
            <p>
              Engaz is a product of ILC Soft. This page describes how the marketing site handles join requests.
            </p>
            <p>
              When you submit the registration form we collect name, email, phone, business name, address, and a
              password stored encrypted for the future restaurant admin — not for Engaz Admin.
            </p>
            <p>
              Optional logo or menu files are uploaded to the Engaz Supabase project. Private menu files are not public.
            </p>
            <p>
              We do not sell this data. Review access is limited to the Engaz team. This page does not list a company
              address or phone number because those details are not published here.
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
