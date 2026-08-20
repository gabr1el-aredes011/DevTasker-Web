import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { AuthNavigationContextService } from '../../../../core/auth/auth-navigation-context.service';
import {
  evaluatePasswordCriteria,
  evaluatePasswordStrength,
  passwordsMatchValidator,
} from '../../../../core/auth/password-validation';
import { ApiError } from '../../../../core/http/api-error.model';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly navigationContext = inject(AuthNavigationContextService);

  private readonly router = inject(Router);

  readonly submitting = signal(false);

  readonly apiError = signal<string | null>(null);

  readonly passwordVisible = signal(false);

  readonly confirmPasswordVisible = signal(false);

  readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],

      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],

      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],

      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordsMatchValidator],
    },
  );

  readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });

  readonly confirmPasswordValue = toSignal(this.form.controls.confirmPassword.valueChanges, {
    initialValue: this.form.controls.confirmPassword.value,
  });

  readonly passwordCriteria = computed(() => {
    return evaluatePasswordCriteria(this.passwordValue());
  });

  readonly passwordStrength = computed(() =>
    evaluatePasswordStrength(this.passwordValue()),
  );

  readonly passwordsMatch = computed(() => {
    const password = this.passwordValue();

    const confirmation = this.confirmPasswordValue();

    return confirmation.length > 0 && password === confirmation;
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    this.apiError.set(null);

    this.form.controls.name.setValue(
      this.form.controls.name.value.trim(),
    );
    this.form.controls.email.setValue(
      this.form.controls.email.value.trim().toLowerCase(),
    );

    /*
     * Garante que todos os validators,
     * inclusive o validator do formulário,
     * sejam recalculados antes do envio.
     */
    this.form.updateValueAndValidity();

    const formValue = this.form.getRawValue();

    /*
     * Ao tentar cadastrar, mostramos
     * imediatamente todos os campos
     * que precisam de atenção.
     */
    this.form.markAllAsTouched();

    if (formValue.password !== formValue.confirmPassword) {
      this.apiError.set('As senhas informadas não coincidem.');

      this.form.controls.confirmPassword.markAsTouched();

      return;
    }

    if (this.form.invalid) {
      this.apiError.set('Revise os campos destacados antes de criar sua conta.');

      return;
    }

    const normalizedName = formValue.name.trim();

    const normalizedEmail = formValue.email.trim().toLowerCase();

    if (!normalizedName) {
      this.apiError.set('Informe seu nome completo.');

      return;
    }

    this.submitting.set(true);

    this.authService
      .register({
        name: normalizedName,
        email: normalizedEmail,
        password: formValue.password,
      })
      .pipe(
        finalize(() => {
          this.submitting.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.emailVerificationRequired) {
            this.navigationContext.setLoginContext('registered', response.email);

            void this.router.navigate(['/login'], {
              replaceUrl: true,
            });
            return;
          }

          this.navigationContext.setEmailVerificationContext(
            response.email,
            'registration',
            response.verificationExpiresAt,
          );

          void this.router.navigate(['/verify-email'], {
            replaceUrl: true,
          });
        },

        error: (error: unknown) => {
          this.apiError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique se a API está em execução.';
    }

    const response = error.error;

    if (response && typeof response === 'object') {
      const apiError = response as Partial<ApiError>;

      const firstFieldError = Object.values(apiError.fields ?? {}).find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );

      if (firstFieldError) {
        return firstFieldError;
      }

      if (typeof apiError.message === 'string' && apiError.message.trim()) {
        return apiError.message;
      }
    }

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    return 'Não foi possível criar a conta. Tente novamente.';
  }
}
