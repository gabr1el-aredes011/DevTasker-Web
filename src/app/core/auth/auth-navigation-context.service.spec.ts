import { TestBed } from '@angular/core/testing';

import { AuthNavigationContextService } from './auth-navigation-context.service';

describe('AuthNavigationContextService', () => {
  let service: AuthNavigationContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthNavigationContextService);
  });

  it('should keep a normalized verification context in memory for a single consumption', () => {
    service.setEmailVerificationContext(
      ' User@Example.com ',
      'registration',
      ' 2026-08-20T20:00:00Z ',
    );

    expect(service.consumeEmailVerificationContext()).toEqual({
      kind: 'email-verification',
      email: 'user@example.com',
      origin: 'registration',
      verificationExpiresAt: '2026-08-20T20:00:00Z',
    });
    expect(service.consumeEmailVerificationContext()).toBeNull();
  });

  it('should reject malformed verification context', () => {
    service.setEmailVerificationContext('not-an-email', 'login');

    expect(service.consumeEmailVerificationContext()).toBeNull();
  });

  it('should keep login feedback in memory for a single consumption', () => {
    service.setLoginContext('email-verified', ' User@Example.com ');

    expect(service.consumeLoginContext()).toEqual({
      kind: 'login-feedback',
      feedback: 'email-verified',
      email: 'user@example.com',
    });
    expect(service.consumeLoginContext()).toBeNull();
  });
});
