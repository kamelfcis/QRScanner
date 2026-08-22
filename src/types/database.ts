export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  banner_url: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  dining_price: number;
  takeaway_price: number;
  is_available: boolean;
  is_popular: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_spicy: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductGallery {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Offer {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Gallery {
  id: string;
  image_url: string;
  caption_ar: string | null;
  caption_en: string | null;
  is_featured: boolean;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  table_number: number;
  internal_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrCode {
  id: string;
  name: string;
  url: string;
  foreground_color: string;
  background_color: string;
  logo_url: string | null;
  template: string;
  size: number;
  image_url: string | null;
  primary_color: string;
  secondary_color: string;
  rounded_style: string;
  eye_style: string;
  margin: number;
  error_correction: string;
  table_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrCodeWithTable extends QrCode {
  table?: RestaurantTable;
}

export interface Analytics {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface RestaurantSettings {
  name_ar: string;
  name_en: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  address_ar: string;
  address_en: string;
  currency: string;
  tax_rate: number;
  service_charge_rate: number;
  prep_time_minutes: number;
  minimum_order: number;
  max_order_notes_length: number;
  apply_tax: boolean;
  apply_service_charge: boolean;
  logo_url: string | null;
  hero_image_url: string | null;
  story_image_url: string | null;
  hero_headline: string | null;
  hero_subtitle: string | null;
  tagline: string | null;
  email: string | null;
  google_maps_url: string | null;
  /** Optional override for QR code base URL (defaults to NEXT_PUBLIC_SITE_URL). */
  qr_site_url?: string | null;
  /** Landing path for QR scans, e.g. `/` or `/welcome`. */
  qr_target_path?: string | null;
}

export interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
}

export interface HoursSettings {
  [key: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
  };
}

export interface CategoryWithProducts extends Category {
  products: Product[];
  subcategories?: Subcategory[];
}

export interface ProductWithGallery extends Product {
  gallery: ProductGallery[];
  category?: Category;
  subcategory?: Subcategory;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  rating: number;
  review_ar: string | null;
  review_en: string | null;
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ImportJob {
  id: string;
  status: 'uploading' | 'processing' | 'parsing' | 'preview' | 'importing' | 'completed' | 'failed';
  file_name: string;
  file_url: string;
  file_type: 'pdf' | 'png' | 'jpeg' | 'webp';
  file_size: number | null;
  raw_text: string | null;
  extracted_data: ImportExtractedData | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportExtractedData {
  restaurant?: {
    name_ar?: string;
    name_en?: string;
    phone?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    address_ar?: string;
    address_en?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    hours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  };
  categories?: ImportExtractedCategory[];
  confidence?: {
    overall: number;
    restaurant: number;
    categories: number;
    products: number;
  };
}

export interface ImportExtractedCategory {
  name_en: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  image_url?: string;
  products: ImportExtractedProduct[];
  confidence?: number;
}

export interface ImportExtractedProduct {
  name_en: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  dining_price?: number;
  takeaway_price?: number;
  image_url?: string;
  confidence?: number;
}

export interface ImportImageClassification {
  url: string;
  type: 'logo' | 'category' | 'food' | 'banner' | 'unknown';
  confidence: number;
  associated_with?: string;
}

export interface SearchAnalytic {
  id: string;
  search_term: string;
  results_count: number;
  category_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalQRCodes: number;
  totalOffers: number;
  totalGallery: number;
  totalTestimonials: number;
  totalTables: number;
  todaysScans: number;
  todaysVisitors: number;
  activeUsers: number;
  diningPercent: number;
  takeawayPercent: number;
  /** Additional metrics for operator dashboards (optional presence). */
  todaysOrders?: number;
  todaysDiningOrders?: number;
  todaysTakeawayOrders?: number;
}

export interface AnalyticsSummary {
  date: string;
  visitors: number;
  scans: number;
  dining: number;
  takeaway: number;
}

export interface HourlyVisitors {
  time: string;
  hour: number;
  visitors: number;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

export interface TopItem {
  id: string;
  name: string;
  name_ar: string | null;
  views: number;
}

export interface SearchTerm {
  term: string;
  count: number;
  avgResults: number;
}

export interface PeakHour {
  hour: number;
  count: number;
}

export interface TableUsage {
  table_number: number;
  scans: number;
  name: string;
}

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

export interface MenuData {
  categories: CategoryWithProducts[];
}
