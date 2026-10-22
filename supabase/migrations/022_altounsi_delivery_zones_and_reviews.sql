-- AlTounsi Store: Egyptian wallet reviews and governorate delivery fees
-- Version: 022
-- Apply on AlTounsi Supabase only (scehlfaghliioenwbipx)
--
-- testimonials has no unique constraint on review text.
-- delivery_locations has no unique constraint on name_ar (primary key is id only).
-- Re-runs skip an existing Arabic review and an existing Arabic zone name.
-- An existing zone with a different fee has that fee updated.

UPDATE public.delivery_locations AS existing
SET
  delivery_fee = incoming.delivery_fee,
  updated_at = now()
FROM (
  VALUES
    ('القاهرة', 65::numeric),
    ('الجيزة', 65::numeric),
    ('القليوبية', 75::numeric),
    ('الإسكندرية', 75::numeric),
    ('البحيرة', 90::numeric),
    ('مطروح', 120::numeric),
    ('دمياط', 90::numeric),
    ('الدقهلية', 75::numeric),
    ('كفر الشيخ', 90::numeric),
    ('الغربية', 75::numeric),
    ('المنوفية', 75::numeric),
    ('الشرقية', 75::numeric),
    ('بورسعيد', 75::numeric),
    ('الإسماعيلية', 75::numeric),
    ('السويس', 90::numeric),
    ('شمال سيناء', 120::numeric),
    ('جنوب سيناء', 120::numeric),
    ('بني سويف', 90::numeric),
    ('الفيوم', 90::numeric),
    ('المنيا', 90::numeric),
    ('أسيوط', 90::numeric),
    ('سوهاج', 90::numeric),
    ('قنا', 90::numeric),
    ('الأقصر', 120::numeric),
    ('أسوان', 120::numeric),
    ('البحر الأحمر', 120::numeric),
    ('الوادي الجديد', 120::numeric)
) AS incoming(name_ar, delivery_fee)
WHERE existing.name_ar = incoming.name_ar
  AND existing.delivery_fee IS DISTINCT FROM incoming.delivery_fee;

INSERT INTO public.delivery_locations (name_ar, name_en, delivery_fee, is_active, sort_order)
SELECT incoming.name_ar, incoming.name_en, incoming.delivery_fee, true, incoming.sort_order
FROM (
  VALUES
    ('القاهرة', 'Cairo', 65::numeric, 1),
    ('الجيزة', 'Giza', 65::numeric, 2),
    ('القليوبية', 'Qalyubia', 75::numeric, 3),
    ('الإسكندرية', 'Alexandria', 75::numeric, 4),
    ('البحيرة', 'Beheira', 90::numeric, 5),
    ('مطروح', 'Matrouh', 120::numeric, 6),
    ('دمياط', 'Damietta', 90::numeric, 7),
    ('الدقهلية', 'Dakahlia', 75::numeric, 8),
    ('كفر الشيخ', 'Kafr El Sheikh', 90::numeric, 9),
    ('الغربية', 'Gharbia', 75::numeric, 10),
    ('المنوفية', 'Monufia', 75::numeric, 11),
    ('الشرقية', 'Sharqia', 75::numeric, 12),
    ('بورسعيد', 'Port Said', 75::numeric, 13),
    ('الإسماعيلية', 'Ismailia', 75::numeric, 14),
    ('السويس', 'Suez', 90::numeric, 15),
    ('شمال سيناء', 'North Sinai', 120::numeric, 16),
    ('جنوب سيناء', 'South Sinai', 120::numeric, 17),
    ('بني سويف', 'Beni Suef', 90::numeric, 18),
    ('الفيوم', 'Faiyum', 90::numeric, 19),
    ('المنيا', 'Minya', 90::numeric, 20),
    ('أسيوط', 'Asyut', 90::numeric, 21),
    ('سوهاج', 'Sohag', 90::numeric, 22),
    ('قنا', 'Qena', 90::numeric, 23),
    ('الأقصر', 'Luxor', 120::numeric, 24),
    ('أسوان', 'Aswan', 120::numeric, 25),
    ('البحر الأحمر', 'Red Sea', 120::numeric, 26),
    ('الوادي الجديد', 'New Valley', 120::numeric, 27)
) AS incoming(name_ar, name_en, delivery_fee, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.delivery_locations AS existing
  WHERE existing.name_ar = incoming.name_ar
);

INSERT INTO public.testimonials (
  customer_name,
  rating,
  review_ar,
  review_en,
  is_featured,
  is_visible,
  sort_order
)
SELECT
  incoming.customer_name,
  incoming.rating,
  incoming.review_ar,
  incoming.review_en,
  true,
  true,
  incoming.sort_order
FROM (
  VALUES
    (
      'أحمد عبد الرحمن',
      5,
      'الخامة تقيلة والخياطة مظبوطة، والمحفظة وصلتني القاهرة في يومين.',
      'The leather is thick and the stitching is neat. The wallet reached me in Cairo in two days.',
      1
    ),
    (
      'فاطمة علي',
      5,
      'جبت اتنين محفظة، المقاس مطابق للصور والتغليف كان مترتب.',
      'I ordered two wallets. The size matches the photos and the packaging was neat.',
      2
    ),
    (
      'محمود حسين',
      5,
      'السعر مناسب للجلد ده، وفودافون كاش اتنفذ بسهولة.',
      'The price is fair for this leather, and Vodafone Cash went through easily.',
      3
    ),
    (
      'هدى سمير',
      5,
      'من الجيزة، مصاريف الشحن كانت باينة قبل ما أأكد الطلب.',
      'I am in Giza. The shipping fee was clear before I confirmed the order.',
      4
    ),
    (
      'عمر خالد',
      5,
      'عدى عليها أسبوع، السوستة شغالة ومفيش ريحة جلد وحشة.',
      'After a week of use, the zipper still works and there is no bad leather smell.',
      5
    ),
    (
      'دينا مصطفى',
      5,
      'المتابعة على واتساب كانت سريعة من أول الرسالة لحد الاستلام.',
      'WhatsApp follow-up was quick from the first message until the order arrived.',
      6
    )
) AS incoming(customer_name, rating, review_ar, review_en, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.testimonials AS existing
  WHERE existing.review_ar = incoming.review_ar
);
