export type UserRole = 'USER' | 'ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}