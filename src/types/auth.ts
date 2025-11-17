export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  role?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface MFAVerification {
  user_id: string;
  totp_code: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  requires_mfa?: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ requiresMFA?: boolean; userId?: string }>;
  verifyMFA: (data: MFAVerification) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
