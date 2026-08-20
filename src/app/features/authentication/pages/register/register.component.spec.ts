import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthNavigationContextService } from '../../../../core/auth/auth-navigation-context.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { RegisterResponse } from '../../../../core/auth/auth.models';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  const authService = {
    register: vi.fn(),
  };

  const navigationContext = {
    setEmailVerificationContext: vi.fn(),
    setLoginContext: vi.fn(),
  };

  const router = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const response: RegisterResponse = {
    id: 1,
    name: 'Dev User',
    email: 'user@example.com',
    role: 'USER',
    createdAt: '2026-08-20T20:00:00Z',
    emailVerificationRequired: true,
    verificationExpiresAt: '2026-08-20T20:10:00Z',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthNavigationContextService, useValue: navigationContext },
        { provide: Router, useValue: router },
      ],
    })
      .overrideComponent(RegisterComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should keep the email in memory and navigate to verification without URL state', () => {
    authService.register.mockReturnValue(of(response));
    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      name: ' Dev User ',
      email: ' USER@Example.com ',
      password: 'NovaSenha1!',
      confirmPassword: 'NovaSenha1!',
    });
    component.submit();

    expect(authService.register).toHaveBeenCalledWith({
      name: 'Dev User',
      email: 'user@example.com',
      password: 'NovaSenha1!',
    });
    expect(navigationContext.setEmailVerificationContext).toHaveBeenCalledWith(
      'user@example.com',
      'registration',
      '2026-08-20T20:10:00Z',
    );
    expect(router.navigate).toHaveBeenCalledWith(['/verify-email'], {
      replaceUrl: true,
    });
  });

  it('should return to login with in-memory feedback and no query parameters', () => {
    authService.register.mockReturnValue(
      of({ ...response, emailVerificationRequired: false }),
    );
    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      name: 'Dev User',
      email: 'user@example.com',
      password: 'NovaSenha1!',
      confirmPassword: 'NovaSenha1!',
    });
    component.submit();

    expect(navigationContext.setLoginContext).toHaveBeenCalledWith(
      'registered',
      'user@example.com',
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      replaceUrl: true,
    });
  });
});
