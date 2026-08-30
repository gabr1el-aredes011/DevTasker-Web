import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthNavigationContextService } from '../../../../core/auth/auth-navigation-context.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const authService = {
    login: vi.fn(),
  };

  const navigationContext = {
    consumeLoginContext: vi.fn().mockReturnValue(null),
    setEmailVerificationContext: vi.fn(),
  };

  const router = {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
  };

  const queryParamMap = {
    get: vi.fn().mockReturnValue(null),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    navigationContext.consumeLoginContext.mockReturnValue(null);
    queryParamMap.get.mockReturnValue(null);
    authService.login.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthNavigationContextService, useValue: navigationContext },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap,
            },
          },
        },
      ],
    })
      .overrideComponent(LoginComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoginComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open email verification with typed state and no query parameters', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.form.controls.email.setValue(' USER@Example.com ');
    component.goToEmailVerification();

    expect(navigationContext.setEmailVerificationContext).toHaveBeenCalledWith(
      'user@example.com',
      'login',
    );
    expect(router.navigate).toHaveBeenCalledWith(['/verify-email'], {
      replaceUrl: true,
    });
  });

  it('should open the Dashboard after a regular successful login', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({
      email: 'user@example.com',
      password: 'password123',
    });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });

  it('should preserve a protected internal destination after login', () => {
    queryParamMap.get.mockImplementation((name: string) =>
      name === 'returnUrl' ? '/app/projetos/42?tab=members' : null,
    );
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({
      email: 'user@example.com',
      password: 'password123',
    });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/projetos/42?tab=members');
  });

  it('should reject an external returnUrl and use the Dashboard', () => {
    queryParamMap.get.mockImplementation((name: string) =>
      name === 'returnUrl' ? '//example.com' : null,
    );
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({
      email: 'user@example.com',
      password: 'password123',
    });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });
});
