import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { PasswordRecoveryService } from '../../../../core/auth/password-recovery.service';
import { PasswordRecoveryComponent } from './password-recovery.component';

describe('PasswordRecoveryComponent', () => {
  const recoveryService = {
    request: vi.fn(),
    resend: vi.fn(),
    verify: vi.fn(),
    reset: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    recoveryService.request.mockReturnValue(
      of({
        challengeId: 'challenge-1',
        expiresAt: '2026-08-20T20:10:00Z',
        resendAvailableAt: '1970-01-01T00:00:00Z',
      }),
    );
    recoveryService.verify.mockReturnValue(
      of({ resetToken: 'reset-token', expiresAt: '2026-08-20T20:10:00Z' }),
    );
    recoveryService.reset.mockReturnValue(of(void 0));
    recoveryService.resend.mockReturnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [PasswordRecoveryComponent],
      providers: [{ provide: PasswordRecoveryService, useValue: recoveryService }],
    })
      .overrideComponent(PasswordRecoveryComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should complete the recovery flow while keeping credentials in component memory', () => {
    const fixture = TestBed.createComponent(PasswordRecoveryComponent);
    const component = fixture.componentInstance;

    component.requestForm.setValue({ email: ' User@Example.com ' });
    component.requestRecovery();

    expect(recoveryService.request).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(component.step()).toBe('verify-code');

    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      component.codeControls[index].setValue(digit);
    });
    component.verifyCode();

    expect(recoveryService.verify).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(component.step()).toBe('new-password');

    component.passwordForm.setValue({
      password: 'NovaSenha1!',
      confirmPassword: 'NovaSenha1!',
    });
    component.submitNewPassword();

    expect(recoveryService.reset).toHaveBeenCalledWith({
      resetToken: 'reset-token',
      newPassword: 'NovaSenha1!',
    });
    expect(component.step()).toBe('success');

    fixture.destroy();
  });

  it('should prevent verify and resend requests from running simultaneously', () => {
    const resendRequest = new Subject<void>();
    const verifyRequest = new Subject<{ resetToken: string; expiresAt: string }>();

    recoveryService.resend.mockReturnValue(resendRequest);

    const fixture = TestBed.createComponent(PasswordRecoveryComponent);
    const component = fixture.componentInstance;

    component.requestForm.setValue({ email: 'user@example.com' });
    component.requestRecovery();
    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      component.codeControls[index].setValue(digit);
    });

    component.resendCode();
    component.verifyCode();

    expect(component.resending()).toBe(true);
    expect(recoveryService.verify).not.toHaveBeenCalled();

    resendRequest.complete();
    recoveryService.verify.mockReturnValue(verifyRequest);

    component.verifyCode();
    component.resendCode();

    expect(component.verifying()).toBe(true);
    expect(recoveryService.verify).toHaveBeenCalledOnce();
    expect(recoveryService.resend).toHaveBeenCalledOnce();

    verifyRequest.next({
      resetToken: 'reset-token',
      expiresAt: '2026-08-20T20:10:00Z',
    });
    verifyRequest.complete();
    fixture.destroy();
  });
});
