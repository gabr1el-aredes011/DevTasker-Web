import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthNavigationContextService } from '../../../../core/auth/auth-navigation-context.service';
import { EmailVerificationService } from '../../../../core/auth/email-verification.service';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
  const verificationService = {
    confirm: vi.fn(),
    resend: vi.fn(),
  };

  const navigationContext = {
    consumeEmailVerificationContext: vi.fn().mockReturnValue(null),
    setLoginContext: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    navigationContext.consumeEmailVerificationContext.mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        { provide: EmailVerificationService, useValue: verificationService },
        { provide: AuthNavigationContextService, useValue: navigationContext },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    })
      .overrideComponent(VerifyEmailComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should render a safe state and never call the API without navigation context', () => {
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    const component = fixture.componentInstance;

    component.ngOnInit();
    component.submit();
    component.resend();

    expect(component.contextMissing).toBe(true);
    expect(component.resendCooldown()).toBe(0);
    expect(verificationService.confirm).not.toHaveBeenCalled();
    expect(verificationService.resend).not.toHaveBeenCalled();

    fixture.destroy();
  });
});
