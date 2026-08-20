import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

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

  beforeEach(async () => {
    vi.clearAllMocks();
    navigationContext.consumeLoginContext.mockReturnValue(null);

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
              queryParamMap: {
                get: vi.fn().mockReturnValue(null),
              },
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
});
