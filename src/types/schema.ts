import { z } from 'zod';

export const categorySchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required').max(255),
  name_en: z.string().min(1, 'English name is required').max(255),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const subcategorySchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  name_ar: z.string().min(1, 'Arabic name is required').max(255),
  name_en: z.string().min(1, 'English name is required').max(255),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
});

export type SubcategoryInput = z.infer<typeof subcategorySchema>;

export const productSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  subcategory_id: z.string().uuid().optional().nullable(),
  name_ar: z.string().min(1, 'Arabic name is required').max(255),
  name_en: z.string().min(1, 'English name is required').max(255),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  dining_price: z.number().min(0, 'Price must be positive'),
  takeaway_price: z.number().min(0, 'Price must be positive'),
  is_available: z.boolean().default(true),
  is_popular: z.boolean().default(false),
  is_new: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  is_spicy: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
});

export type ProductInput = z.infer<typeof productSchema>;

export const offerSchema = z
  .object({
    title_ar: z.string().min(1, 'Arabic title is required').max(255),
    title_en: z.string().min(1, 'English title is required').max(255),
    description_ar: z.string().optional(),
    description_en: z.string().optional(),
    image_url: z.string().url().optional().nullable(),
    discount_type: z.enum(['percentage', 'fixed']).default('percentage'),
    discount_value: z.number().min(0, 'Discount must be positive'),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discount_type === 'percentage' && data.discount_value > 100) {
        return false;
      }
      return true;
    },
    { message: 'Percentage discount cannot exceed 100%', path: ['discount_value'] }
  );

export type OfferInput = z.infer<typeof offerSchema>;

export const gallerySchema = z.object({
  image_url: z.string().url('Image URL is required'),
  caption_ar: z.string().max(500).optional(),
  caption_en: z.string().max(500).optional(),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
});

export type GalleryInput = z.infer<typeof gallerySchema>;

export const testimonialSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(200),
  customer_avatar_url: z.string().url('Invalid URL').nullable().optional(),
  rating: z.number().int().min(1).max(5).default(5),
  review_ar: z.string().nullable().optional(),
  review_en: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  is_visible: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export type TestimonialInput = z.infer<typeof testimonialSchema>;

export const searchAnalyticSchema = z.object({
  search_term: z.string().min(1),
  results_count: z.number().int().min(0).default(0),
  category_id: z.string().uuid().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
});

export type SearchAnalyticInput = z.input<typeof searchAnalyticSchema>;

export const notificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().nullable().optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  is_read: z.boolean().default(false),
});

export type NotificationInput = z.input<typeof notificationSchema>;

export const qrCodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  url: z.string().url('URL is required'),
  foreground_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color')
    .default('#000000'),
  background_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color')
    .default('#FFFFFF'),
  logo_url: z.string().url().optional().nullable(),
  template: z.enum(['classic', 'luxury', 'minimal', 'golden', 'dark']).default('classic'),
  size: z.number().int().min(100).max(1000).default(300),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color')
    .default('#000000'),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color')
    .default('#B8860B'),
  rounded_style: z.enum(['square', 'rounded', 'circle']).default('square'),
  eye_style: z.enum(['square', 'rounded', 'circle']).default('square'),
  margin: z.number().int().min(0).max(10).default(4),
  error_correction: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  table_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type QrCodeInput = z.infer<typeof qrCodeSchema>;

export const restaurantTableSchema = z.object({
  table_number: z.number().int().positive('Table number must be positive'),
  internal_name: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type RestaurantTableInput = z.infer<typeof restaurantTableSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const settingsSchema = z.object({
  restaurant: z.object({
    name_ar: z.string().min(1),
    name_en: z.string().min(1),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
    address_ar: z.string().optional(),
    address_en: z.string().optional(),
    currency: z.string().default('EGP'),
    tax_rate: z.number().min(0).max(100).default(15),
    service_charge_rate: z.number().min(0).max(100).default(10),
    prep_time_minutes: z.number().int().min(0).max(240).default(25),
    minimum_order: z.number().min(0).default(0),
    max_order_notes_length: z.number().int().min(0).max(1000).default(200),
    apply_tax: z.boolean().default(true),
    apply_service_charge: z.boolean().default(true),
    hero_image_url: z.string().url().optional().nullable(),
    story_image_url: z.string().url().optional().nullable(),
  }),
  theme: z.object({
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
