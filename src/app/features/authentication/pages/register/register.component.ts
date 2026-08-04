import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  Router,
  RouterLink,
} from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiError } from '../../../../core/http/api-error.model';
import {
  AuthLayoutComponent,
} from '../../layouts/auth-layout/auth-layout.component';

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password =
    control.get('password')?.value;

  const confirmPassword =
    control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword
    ? null
    : {
      passwordMismatch: true,
    };
};

type PasswordStrengthLevel =
  | 'empty'
  | 'weak'
  | 'medium'
  | 'strong';

interface PasswordStrength {
  readonly level: PasswordStrengthLevel;
  readonly label: string;
  readonly percentage: number;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  readonly submitting = signal(false);

  readonly apiError =
    signal<string | null>(null);

  readonly passwordVisible =
    signal(false);

  readonly confirmPasswordVisible =
    signal(false);

  readonly form =
    this.formBuilder.nonNullable.group(
      {
        name: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(100),
          ],
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.maxLength(255),
          ],
        ],

        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(72),
          ],
        ],

        confirmPassword: [
          '',
          [
            Validators.required,
          ],
        ],
      },
      {
        validators: [
          passwordsMatchValidator,
        ],
      },
    );

  readonly passwordValue = toSignal(
    this.form.controls.password.valueChanges,
    {
      initialValue:
        this.form.controls.password.value,
    },
  );

  readonly confirmPasswordValue = toSignal(
    this.form.controls.confirmPassword
      .valueChanges,
    {
      initialValue:
        this.form.controls.confirmPassword
          .value,
    },
  );

  readonly passwordCriteria = computed(
    () => {
      const password = this.passwordValue();

      return {
        minimumLength:
          password.length >= 8,

        uppercase:
          /[A-Z]/.test(password),

        lowercase:
          /[a-z]/.test(password),

        number:
          /\d/.test(password),

        symbol:
          /[^A-Za-z0-9]/.test(password),
      };
    },
  );

  readonly passwordStrength =
    computed<PasswordStrength>(() => {
      const password = this.passwordValue();

      if (!password) {
        return {
          level: 'empty',
          label: 'Não avaliada',
          percentage: 0,
        };
      }

      const criteria =
        this.passwordCriteria();

      const score = Object.values(
        criteria,
      ).filter(Boolean).length;

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

  readonly passwordsMatch = computed(
    () => {
      const password =
        this.passwordValue();

      const confirmation =
        this.confirmPasswordValue();

      return (
        confirmation.length > 0 &&
        password === confirmation
      );
    },
  );

  togglePasswordVisibility(): void {
    this.passwordVisible.update(
      (visible) => !visible,
    );
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update(
      (visible) => !visible,
    );
  }

  submit(): void {
    this.apiError.set(null);

    /*
     * Recalcula inclusive o validador
     * aplicado ao formulário completo.
     */
    this.form.updateValueAndValidity();

    const formValue =
      this.form.getRawValue();

    /*
     * Proteção explícita contra o envio
     * de duas senhas diferentes.
     */
    if (
      formValue.password !==
      formValue.confirmPassword
    ) {
      this.form.controls.confirmPassword
        .markAsTouched();

      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const normalizedEmail =
      formValue.email
        .trim()
        .toLowerCase();

    this.authService
      .register({
        name: formValue.name.trim(),
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
          void this.router.navigate(
            ['/login'],
            {
              queryParams: {
                registered: 'true',
                email: normalizedEmail,
              },
            },
          );
        },

        error: (error: unknown) => {
          this.apiError.set(
            this.extractErrorMessage(error),
          );
        },
      });
  }

  private extractErrorMessage(
    error: unknown,
  ): string {
    if (
      error instanceof HttpErrorResponse
    ) {
      const response =
        error.error as Partial<ApiError>;

      const firstFieldError =
        Object.values(
          response.fields ?? {},
        )[0];

      if (firstFieldError) {
        return firstFieldError;
      }

      if (response.message) {
        return response.message;
      }
    }

    return 'Não foi possível criar a conta. Tente novamente.';
  }
}