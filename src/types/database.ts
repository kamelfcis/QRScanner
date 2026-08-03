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

export interface MenuData {
  categories: CategoryWithProducts[];
}
