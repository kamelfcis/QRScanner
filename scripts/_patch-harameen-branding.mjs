#!/usr/bin/env node
/** Patch Harameen restaurant settings: hero image + story copy. */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://twaiccdmimujrbumwrck.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YWljY2RtaW11anJidW13cmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzMTY5MCwiZXhwIjoyMTAyMDA3NjkwfQ.CB-b-6yIXSxe03nQ4xw0xcfmHFShsqrY1xIOgJhOwlQ';

const HERO_AND_STORY_IMAGE =
  'https://twaiccdmimujrbumwrck.supabase.co/storage/v1/object/public/covers/1786529934997-0qaol7.jpeg';

const patch = {
  hero_image_url: HERO_AND_STORY_IMAGE,
  story_image_url: HERO_AND_STORY_IMAGE,
  story_title_en: 'Our Story',
  story_title_ar: 'قصتنا',
  story_p1_en:
    'Harameen Wholesale Market is your destination for everyday groceries and wholesale supplies at competitive prices. We offer a wide range of food, household, and personal care products for families and retailers.',
  story_p1_ar:
    'سوق الجملة شركة الحرمين هو وجهتكم لشراء احتياجاتكم اليومية والجملة بجودة عالية وأسعار منافسة. نوفر تشكيلة واسعة من المنتجات الغذائية والمنزلية والعناية الشخصية لتلبية احتياجات الأسر والتجار.',
  story_p2_en:
    'From dairy and meat to bakery and beverages, we are committed to fresh, reliable products — with fast service and convenient WhatsApp ordering.',
  story_p2_ar:
    'من الألبان واللحوم إلى المخبوزات والمشروبات، نلتزم بتوفير منتجات طازجة وموثوقة — مع خدمة سريعة وطلب مريح عبر واتساب.',
};

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: existing, error: readError } = await sb
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();
if (readError) throw readError;

const updated = { ...(existing.value ?? {}), ...patch };
const { data, error } = await sb
  .from('settings')
  .update({ value: updated, updated_at: new Date().toISOString() })
  .eq('key', 'restaurant')
  .select('value')
  .single();
if (error) throw error;

console.log('Patched Harameen restaurant settings:');
console.log('  hero_image_url:', data.value.hero_image_url);
console.log('  story_image_url:', data.value.story_image_url);
console.log('  story_p1_ar:', data.value.story_p1_ar?.slice(0, 60) + '…');
