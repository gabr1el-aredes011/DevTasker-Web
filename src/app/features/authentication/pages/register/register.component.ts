import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiError } from '../../../../core/http/api-error.model';

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
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

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
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

  readonly form = this.formBuilder.nonNullable.group(
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
      validators: [passwordsMatchValidator],
    },
  );

  submit(): void {
  this.apiError.set(null);

  const formValue = this.form.getRawValue();

  if (formValue.password !== formValue.confirmPassword) {
    this.form.setErrors({
      ...this.form.errors,
      passwordMismatch: true,
    });

    this.form.controls.confirmPassword.markAsTouched();

    return;
  }

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.submitting.set(true);

  this.authService
    .register({
      name: formValue.name.trim(),
      email: formValue.email.trim().toLowerCase(),
      password: formValue.password,
    })
    .pipe(
      finalize(() => {
        this.submitting.set(false);
      }),
    )
    .subscribe({
      next: () => {
        void this.router.navigateByUrl('/login');
      },

      error: (error: unknown) => {
        this.apiError.set(
          this.extractErrorMessage(error),
        );
      },
    });
}

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as Partial<ApiError>;

      if (response.message) {
        return response.message;
      }

      const firstFieldError = Object.values(
        response.fields ?? {},
      )[0];

      if (firstFieldError) {
        return firstFieldError;
      }
    }

    return 'Não foi possível criar a conta. Tente novamente.';
  }
}