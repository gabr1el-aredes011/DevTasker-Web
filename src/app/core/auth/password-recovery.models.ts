export interface RequestPasswordRecoveryRequest {
  readonly email: string;
}

export interface PasswordRecoveryChallengeResponse {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly resendAvailableAt: string;
}

export interface ResendPasswordRecoveryRequest {
  readonly challengeId: string;
}

export interface VerifyPasswordRecoveryRequest {
  readonly challengeId: string;
  readonly code: string;
}

export interface VerifyPasswordRecoveryResponse {
  readonly resetToken: string;
  readonly expiresAt: string;
}

export interface ResetPasswordRequest {
  readonly resetToken: string;
  readonly newPassword: string;
}
