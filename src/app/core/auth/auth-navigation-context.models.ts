export type EmailVerificationOrigin = 'registration' | 'login';

export interface EmailVerificationNavigationState {
  readonly kind: 'email-verification';
  readonly email: string;
  readonly origin: EmailVerificationOrigin;
  readonly verificationExpiresAt?: string;
}

export type LoginFeedback = 'email-verified' | 'registered';

export interface LoginNavigationState {
  readonly kind: 'login-feedback';
  readonly feedback: LoginFeedback;
  readonly email?: string;
}
