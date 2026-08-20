import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { PasswordRecoveryService } from './password-recovery.service';

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PasswordRecoveryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should request a recovery challenge', () => {
    const response = {
      challengeId: 'challenge-1',
      expiresAt: '2026-08-20T20:10:00Z',
      resendAvailableAt: '2026-08-20T20:01:00Z',
    };

    service.request({ email: 'user@example.com' }).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const request = http.expectOne(
      `${environment.apiUrl}/auth/password-recovery/request`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'user@example.com' });
    request.flush(response);
  });

  it('should resend using only the challenge id', () => {
    service.resend({ challengeId: 'challenge-1' }).subscribe();

    const request = http.expectOne(
      `${environment.apiUrl}/auth/password-recovery/resend`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ challengeId: 'challenge-1' });
    request.flush(null);
  });

  it('should verify the six-digit code', () => {
    service.verify({ challengeId: 'challenge-1', code: '123456' }).subscribe((result) => {
      expect(result.resetToken).toBe('reset-token');
    });

    const request = http.expectOne(
      `${environment.apiUrl}/auth/password-recovery/verify`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ challengeId: 'challenge-1', code: '123456' });
    request.flush({ resetToken: 'reset-token', expiresAt: '2026-08-20T20:10:00Z' });
  });

  it('should reset the password with the temporary token', () => {
    service.reset({ resetToken: 'reset-token', newPassword: 'NovaSenha1!' }).subscribe();

    const request = http.expectOne(
      `${environment.apiUrl}/auth/password-recovery/reset`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      resetToken: 'reset-token',
      newPassword: 'NovaSenha1!',
    });
    request.flush(null);
  });
});
