export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendEmailVerificationRequest {
  email: string;
}