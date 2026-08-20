import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';

import { EmailVerificationService } from '../../../../core/auth/email-verification.service';
import { AuthNavigationContextService } from '../../../../core/auth/auth-navigation-context.service';
import { ApiError } from '../../../../core/http/api-error.model';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);

  private readonly verificationService = inject(EmailVerificationService);

  private readonly router = inject(Router);
  private readonly navigationContext = inject(AuthNavigationContextService);

  private resendInterval?: ReturnType<typeof setInterval>;
  private redirectTimeout?: ReturnType<typeof setTimeout>;

  readonly codeLength = 6;

  readonly verificationContext = this.navigationContext.consumeEmailVerificationContext();

  readonly contextMissing = this.verificationContext === null;

  readonly email = this.verificationContext?.email ?? '';

  readonly maskedEmail = this.maskEmail(this.email);

  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly verified = signal(false);

  readonly apiError = signal<string | null>(null);

  readonly resendMessage = signal<string | null>(null);

  readonly resendCooldown = signal(60);

  readonly codeControls = Array.from({ length: this.codeLength }, () =>
    this.formBuilder.nonNullable.control('', [Validators.required, Validators.pattern(/^\d$/)]),
  );

  readonly form = this.formBuilder.nonNullable.group({
    code: this.formBuilder.nonNullable.array(this.codeControls),
  });

  @ViewChildren('codeInput')
  private codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  ngOnInit(): void {
    if (this.contextMissing) {
      this.resendCooldown.set(0);
      return;
    }

    this.startResendCooldown();
  }

  ngOnDestroy(): void {
    this.clearResendInterval();

    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }
  }

  submit(): void {
    this.apiError.set(null);
    this.resendMessage.set(null);

    if (!this.email) {
      this.apiError.set('Não foi possível identificar o e-mail da conta.');

      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.apiError.set('Digite os 6 números do código de verificação.');

      return;
    }

    const code = this.codeControls.map((control) => control.value).join('');

    if (code.length !== this.codeLength) {
      this.apiError.set('O código deve possuir 6 números.');

      return;
    }

    this.submitting.set(true);

    this.verificationService
      .confirm({
        email: this.email,
        code,
      })
      .pipe(
        finalize(() => {
          this.submitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.verified.set(true);
          this.apiError.set(null);

          this.redirectTimeout = setTimeout(() => {
            this.navigationContext.setLoginContext('email-verified', this.email);

            void this.router.navigate(['/login'], {
              replaceUrl: true,
            });
          }, 1400);
        },

        error: (error: unknown) => {
          this.apiError.set(this.extractErrorMessage(error));

          this.selectFirstCodeInput();
        },
      });
  }

  resend(): void {
    if (!this.email || this.resending() || this.resendCooldown() > 0) {
      return;
    }

    this.apiError.set(null);
    this.resendMessage.set(null);
    this.resending.set(true);

    this.verificationService
      .resend(this.email)
      .pipe(
        finalize(() => {
          this.resending.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.resendMessage.set('Novo código enviado. Verifique sua caixa de entrada.');

          this.clearCode();
          this.startResendCooldown();
        },

        error: (error: unknown) => {
          this.apiError.set(this.extractErrorMessage(error));
        },
      });
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;

    const sanitizedValue = input.value.replace(/\D/g, '').slice(-1);

    this.codeControls[index].setValue(sanitizedValue);

    input.value = sanitizedValue;

    this.apiError.set(null);

    if (sanitizedValue && index < this.codeLength - 1) {
      this.focusCodeInput(index + 1);
    }
  }

  onDigitKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.codeControls[index].value && index > 0) {
      this.focusCodeInput(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusCodeInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < this.codeLength - 1) {
      event.preventDefault();
      this.focusCodeInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData
      ?.getData('text')
      .replace(/\D/g, '')
      .slice(0, this.codeLength);

    if (!clipboardData) {
      return;
    }

    event.preventDefault();

    this.apiError.set(null);

    for (let index = 0; index < this.codeLength; index++) {
      this.codeControls[index].setValue(clipboardData[index] ?? '');
    }

    const finalIndex = Math.min(clipboardData.length, this.codeLength) - 1;

    this.focusCodeInput(Math.max(finalIndex, 0));
  }

  private clearCode(): void {
    this.codeControls.forEach((control) => {
      control.setValue('');
      control.markAsUntouched();
    });

    setTimeout(() => {
      this.focusCodeInput(0);
    });
  }

  private selectFirstCodeInput(): void {
    setTimeout(() => {
      this.focusCodeInput(0);
    });
  }

  private focusCodeInput(index: number): void {
    const input = this.codeInputs?.get(index)?.nativeElement;

    if (!input) {
      return;
    }

    input.focus();
    input.select();
  }

  private startResendCooldown(): void {
    this.clearResendInterval();

    this.resendCooldown.set(60);

    this.resendInterval = setInterval(() => {
      const current = this.resendCooldown();

      if (current <= 1) {
        this.resendCooldown.set(0);
        this.clearResendInterval();
        return;
      }

      this.resendCooldown.set(current - 1);
    }, 1000);
  }

  private clearResendInterval(): void {
    if (!this.resendInterval) {
      return;
    }

    clearInterval(this.resendInterval);

    this.resendInterval = undefined;
  }

  private maskEmail(email: string): string {
    if (!email.includes('@')) {
      return email;
    }

    const [localPart, domain] = email.split('@');

    if (localPart.length <= 2) {
      return `${localPart[0] ?? ''}••@${domain}`;
    }

    const visibleStart = localPart.slice(0, 2);

    const visibleEnd = localPart.slice(-1);

    return `${visibleStart}${'•'.repeat(
      Math.min(Math.max(localPart.length - 3, 3), 8),
    )}${visibleEnd}@${domain}`;
  }

  private extractErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Ocorreu um erro inesperado.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error as Partial<ApiError>;

    if (response?.message) {
      return response.message;
    }

    const firstFieldError = Object.values(response?.fields ?? {})[0];

    if (typeof firstFieldError === 'string' && firstFieldError.trim()) {
      return firstFieldError;
    }

    if (error.status === 400) {
      return 'O código informado é inválido ou expirou.';
    }

    return 'Não foi possível verificar o código.';
  }
}
