import { HttpErrorResponse } from '@angular/common/http';
import {
  AuthLayoutComponent,
} from '../../layouts/auth-layout/auth-layout.component';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiError } from '../../../../core/http/api-error.model';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly registrationMessage =
    this.route.snapshot.queryParamMap.get(
      'registered',
    ) === 'true'
      ? 'Conta criada com sucesso. Faça seu primeiro login.'
      : null;

  readonly form = this.formBuilder.nonNullable.group({
    email: [
      this.route.snapshot.queryParamMap.get(
        'email',
      ) ?? '',
      [
        Validators.required,
        Validators.email,
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
      ],
    ],
  });

  readonly passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.update(
      (visible) => !visible,
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    const request = {
      email: formValue.email
        .trim()
        .toLowerCase(),
      password: formValue.password,
    };

    this.apiError.set(null);
    this.submitting.set(true);

    this.authService
      .login(request)
      .pipe(
        finalize(() => {
          this.submitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          const returnUrl =
            this.route.snapshot.queryParamMap.get(
              'returnUrl',
            ) ?? '/kanban';

          void this.router.navigateByUrl(returnUrl);
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
    if (!(error instanceof HttpErrorResponse)) {
      return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    if (error.status === 401) {
      return 'E-mail ou senha inválidos.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error;

    if (
      response &&
      typeof response === 'object'
    ) {
      const apiError = response as {
        message?: unknown;
        fields?: Record<string, unknown>;
      };

      if (
        typeof apiError.message === 'string' &&
        apiError.message.trim()
      ) {
        return apiError.message;
      }

      const firstFieldError = Object.values(
        apiError.fields ?? {},
      ).find(
        (value): value is string =>
          typeof value === 'string' &&
          value.trim().length > 0,
      );

      if (firstFieldError) {
        return firstFieldError;
      }
    }

    if (
      typeof response === 'string' &&
      response.trim()
    ) {
      return response;
    }

    return 'Não foi possível realizar o login. Tente novamente.';
  }
}