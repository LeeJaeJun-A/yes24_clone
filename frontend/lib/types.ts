export interface Category {
  id: number;
  code: string;
  name_ko: string;
  name_en: string | null;
  parent_code: string | null;
  depth: number;
  display_order: number;
  is_active: boolean;
  icon_url: string | null;
  children?: Category[];
}

export interface Product {
  id: number;
  goods_no: number;
  title: string;
  subtitle?: string;
  author: string;
  translator?: string;
  publisher: string;
  publish_date?: string;
  isbn?: string;
  category_code?: string;
  product_type: string;
  original_price: number;
  sale_price: number;
  discount_rate: number;
  point_rate?: number;
  description?: string;
  toc?: string;
  cover_image: string | null;
  page_count?: number;
  weight_grams?: number;
  dimensions?: string;
  sales_index: number;
  review_count: number;
  rating_avg: number;
  is_available: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title?: string;
  content: string;
  likes: number;
  created_at?: string;
  username?: string;
}

export interface Banner {
  id: number;
  slot: string;
  title?: string;
  image_url?: string;
  link_url?: string;
  display_order: number;
}

export interface EventItem {
  id: number;
  event_no: number;
  title: string;
  description?: string;
  banner_image?: string;
  content_html?: string;
  is_active: boolean;
}

export interface User {
  id: number;
  email: string;
  username: string;
  phone?: string;
  point_balance: number;
  grade: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  title?: string;
  cover_image?: string;
  sale_price?: number;
}
