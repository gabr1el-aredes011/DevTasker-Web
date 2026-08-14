import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiError } from '../../../../core/http/api-error.model';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;

  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword
    ? null
    : {
        passwordMismatch: true,
      };
};

type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

interface PasswordStrength {
  readonly level: PasswordStrengthLevel;
  readonly label: string;
  readonly percentage: number;
}

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
    const password = this.passwordValue();

    return {
      minimumLength: password.length >= 8,

      uppercase: /[A-Z]/.test(password),

      lowercase: /[a-z]/.test(password),

      number: /\d/.test(password),

      symbol: /[^A-Za-z0-9]/.test(password),
    };
  });

  readonly passwordStrength = computed<PasswordStrength>(() => {
    const password = this.passwordValue();

    if (!password) {
      return {
        level: 'empty',
        label: 'Não avaliada',
        percentage: 0,
      };
    }

    const criteria = this.passwordCriteria();

    const score = Object.values(criteria).filter(Boolean).length;

    if (score <= 2) {
      return {
        level: 'weak',
        label: 'Fraca',
        percentage: 34,
      };
    }

    if (score <= 4) {
      return {
        level: 'medium',
        label: 'Boa',
        percentage: 67,
      };
    }

    return {
      level: 'strong',
      label: 'Forte',
      percentage: 100,
    };
  });

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
        next: () => {
          void this.router.navigate(['/verify-email'], {
            queryParams: {
              email: normalizedEmail,
            },
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
