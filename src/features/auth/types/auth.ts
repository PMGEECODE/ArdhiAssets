import type { User, LoginCredentials } from "../../../shared/types";

export type { User, LoginCredentials };

export interface MFAVerification {
  email: string;
  code: string;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  requires2FA?: boolean;
  message?: string;
  email?: string;
  user_id?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials
  ) => Promise<{ requiresMFA?: boolean; email?: string }>;
  verifyMFA: (data: MFAVerification) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export interface EmailValidationForm {
  email: string;
}

export interface PasswordForm {
  password: string;
}
