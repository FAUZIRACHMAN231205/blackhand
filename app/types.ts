// Shared types for BLACKHAND Art

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  role: 'user' | 'admin';
  created_at?: string;
  last_sign_in_at?: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  featured_image_url: string;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface WorkImage {
  id: string;
  work_id: string;
  image_url: string;
  display_order: number;
  is_featured: boolean;
  created_at?: string;
}

export interface WorkRating {
  id: string;
  work_id: string;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at?: string;
}

export interface WorkComment {
  id: string;
  work_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  content: string;
  created_at: string;
}
