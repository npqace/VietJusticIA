// User Types
export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'user' | 'lawyer' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Lawyer Types
export interface Lawyer {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  specialization: string;
  bio: string;
  city?: string;
  province?: string;
  rating: number;
  total_reviews: number;
  consultation_fee: number;
  is_available: boolean;
  years_of_experience: number;
  bar_license_number: string;
  languages: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  user?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

// Service Request Types
export interface ServiceRequest {
  id: number;
  user_id: number;
  lawyer_id?: number;
  title: string;
  description: string;
  category?: string;  // Optional - not in database model
  status: string;  // Backend returns UPPERCASE: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  urgency?: 'low' | 'medium' | 'high';  // Optional - not in database model
  lawyer_response?: string;  // Lawyer's response/notes
  rejected_reason?: string;  // Reason if rejected
  created_at: string;
  updated_at: string;
  user?: User;
  lawyer?: Lawyer;
}

// Admin Service Request View (simplified for admin lists)
export interface AdminServiceRequest {
  id: number;
  user_id: number;
  user_name: string;
  lawyer_id?: number;
  lawyer_name?: string;
  title: string;
  description: string;
  status: string;  // Backend returns UPPERCASE
  created_at: string;
  updated_at: string;
}

// Auth Types
export interface LoginRequest {
  identifier: string;
  pwd: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
