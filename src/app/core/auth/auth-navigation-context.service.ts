import { Injectable } from '@angular/core';

import {
  EmailVerificationNavigationState,
  EmailVerificationOrigin,
  LoginFeedback,
  LoginNavigationState,
} from './auth-navigation-context.models';

@Injectable({
  providedIn: 'root',
})
export class AuthNavigationContextService {
  private emailVerificationContext: EmailVerificationNavigationState | null = null;
  private loginContext: LoginNavigationState | null = null;

  setEmailVerificationContext(
    email: string,
    origin: EmailVerificationOrigin,
    verificationExpiresAt?: string,
  ): void {
    const normalizedEmail = this.readValidEmail(email);

    if (!normalizedEmail) {
      this.emailVerificationContext = null;
      return;
    }

    this.emailVerificationContext = {
      kind: 'email-verification',
      email: normalizedEmail,
      origin,
      ...(verificationExpiresAt?.trim()
        ? { verificationExpiresAt: verificationExpiresAt.trim() }
        : {}),
    };
  }

  consumeEmailVerificationContext(): EmailVerificationNavigationState | null {
    const context = this.emailVerificationContext;

    this.emailVerificationContext = null;

    return context;
  }

  setLoginContext(feedback: LoginFeedback, email?: string): void {
    const normalizedEmail = email ? this.readValidEmail(email) : null;

    this.loginContext = {
      kind: 'login-feedback',
      feedback,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
    };
  }

  consumeLoginContext(): LoginNavigationState | null {
    const context = this.loginContext;

    this.loginContext = null;

    return context;
  }

  private readValidEmail(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const email = value.trim().toLowerCase();

    if (
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return null;
    }

    return email;
  }
}
