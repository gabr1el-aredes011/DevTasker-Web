import { HttpErrorResponse } from '@angular/common/http';
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
  imports: [ReactiveFormsModule, RouterLink],
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError.set(null);
    this.submitting.set(true);

    this.authService
      .login(this.form.getRawValue())
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

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as Partial<ApiError>;

      if (response.message) {
        return response.message;
      }
    }

    return 'Não foi possível realizar o login. Tente novamente.';
  }
}