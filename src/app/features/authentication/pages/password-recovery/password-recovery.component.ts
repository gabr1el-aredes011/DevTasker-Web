import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  evaluatePasswordCriteria,
  evaluatePasswordStrength,
  passwordsMatchValidator,
} from '../../../../core/auth/password-validation';
import { PasswordRecoveryService } from '../../../../core/auth/password-recovery.service';
import { ApiError } from '../../../../core/http/api-error.model';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';

export type PasswordRecoveryStep =
  | 'request-email'
  | 'verify-code'
  | 'new-password'
  | 'success';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoveryComponent implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly recoveryService = inject(PasswordRecoveryService);

  private readonly challengeId = signal<string | null>(null);
  private readonly resetToken = signal<string | null>(null);
  private resendInterval?: ReturnType<typeof setInterval>;

  readonly codeLength = 6;
  readonly step = signal<PasswordRecoveryStep>('request-email');
  readonly recoveryEmail = signal('');
  readonly apiError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly requesting = signal(false);
  readonly verifying = signal(false);
  readonly resending = signal(false);
  readonly resetting = signal(false);
  readonly resendCooldown = signal(0);

  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  readonly requestForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  readonly codeControls = Array.from({ length: this.codeLength }, () =>
    this.formBuilder.nonNullable.control('', [Validators.required, Validators.pattern(/^\d$/)]),
  );

  readonly codeForm = this.formBuilder.nonNullable.group({
    code: this.formBuilder.nonNullable.array(this.codeControls),
  });

  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordsMatchValidator],
    },
  );

  readonly passwordValue = toSignal(this.passwordForm.controls.password.valueChanges, {
    initialValue: this.passwordForm.controls.password.value,
  });

  readonly confirmPasswordValue = toSignal(
    this.passwordForm.controls.confirmPassword.valueChanges,
    {
      initialValue: this.passwordForm.controls.confirmPassword.value,
    },
  );

  readonly passwordCriteria = computed(() =>
    evaluatePasswordCriteria(this.passwordValue()),
  );

  readonly passwordStrength = computed(() =>
    evaluatePasswordStrength(this.passwordValue()),
  );

  readonly passwordsMatch = computed(() => {
    const password = this.passwordValue();
    const confirmation = this.confirmPasswordValue();

    return confirmation.length > 0 && password === confirmation;
  });

  readonly maskedEmail = computed(() => this.maskEmail(this.recoveryEmail()));

  readonly stepAnnouncement = computed(() => {
    switch (this.step()) {
      case 'request-email':
        return 'Etapa 1 de 3: informe o e-mail da conta.';
      case 'verify-code':
        return 'Etapa 2 de 3: informe o código de recuperação.';
      case 'new-password':
        return 'Etapa 3 de 3: crie uma nova senha.';
      case 'success':
        return 'Recuperação concluída. Sua senha foi redefinida.';
    }
  });

  @ViewChildren('codeInput')
  private codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  ngOnDestroy(): void {
    this.clearResendInterval();
    this.challengeId.set(null);
    this.resetToken.set(null);
    this.clearCode();
    this.passwordForm.reset();
  }

  requestRecovery(): void {
    if (this.requesting()) {
      return;
    }

    const email = this.requestForm.controls.email.value.trim().toLowerCase();

    this.requestForm.controls.email.setValue(email);
    this.requestForm.controls.email.updateValueAndValidity();

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.apiError.set(null);
    this.statusMessage.set(null);
    this.requesting.set(true);

    this.recoveryService
      .request({ email })
      .pipe(finalize(() => this.requesting.set(false)))
      .subscribe({
        next: (response) => {
          const challengeId = response.challengeId?.trim();

          if (!challengeId) {
            this.apiError.set('O servidor não iniciou uma recuperação válida. Tente novamente.');
            return;
          }

          this.challengeId.set(challengeId);
          this.recoveryEmail.set(email);
          this.clearCode();
          this.step.set('verify-code');
          this.statusMessage.set(
            'Se existir uma conta com este e-mail, enviaremos um código de recuperação.',
          );
          this.startResendCooldown(response.resendAvailableAt);
          this.focusCodeInput(0);
        },
        error: (error: unknown) => {
          this.apiError.set(
            this.extractErrorMessage(
              error,
              'Não foi possível iniciar a recuperação de senha.',
            ),
          );
        },
      });
  }

  verifyCode(): void {
    if (this.verifying() || this.resending()) {
      return;
    }

    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      this.apiError.set('Digite os 6 números do código de recuperação.');
      return;
    }

    const challengeId = this.challengeId();
    const code = this.codeControls.map((control) => control.value).join('');

    if (!challengeId || code.length !== this.codeLength) {
      this.apiError.set('A sessão de recuperação expirou. Solicite um novo código.');
      return;
    }

    this.apiError.set(null);
    this.statusMessage.set(null);
    this.verifying.set(true);

    this.recoveryService
      .verify({ challengeId, code })
      .pipe(finalize(() => this.verifying.set(false)))
      .subscribe({
        next: (response) => {
          const resetToken = response.resetToken?.trim();

          if (!resetToken) {
            this.apiError.set('O servidor não autorizou a criação de uma nova senha.');
            return;
          }

          this.resetToken.set(resetToken);
          this.challengeId.set(null);
          this.clearResendInterval();
          this.clearCode();
          this.passwordForm.reset({ password: '', confirmPassword: '' });
          this.step.set('new-password');
        },
        error: (error: unknown) => {
          this.apiError.set(
            this.extractErrorMessage(error, 'O código informado é inválido ou expirou.'),
          );
          this.focusCodeInput(0);
        },
      });
  }

  resendCode(): void {
    const challengeId = this.challengeId();

    if (
      !challengeId ||
      this.resending() ||
      this.verifying() ||
      this.resendCooldown() > 0
    ) {
      return;
    }

    this.apiError.set(null);
    this.statusMessage.set(null);
    this.resending.set(true);

    this.recoveryService
      .resend({ challengeId })
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: () => {
          this.clearCode();
          this.statusMessage.set(
            'Se a recuperação continuar válida, um novo código será enviado.',
          );
          this.startResendCooldown(new Date(Date.now() + 60_000).toISOString());
          this.focusCodeInput(0);
        },
        error: (error: unknown) => {
          this.apiError.set(
            this.extractErrorMessage(error, 'Não foi possível solicitar um novo código.'),
          );
        },
      });
  }

  submitNewPassword(): void {
    if (this.resetting()) {
      return;
    }

    this.passwordForm.updateValueAndValidity();
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid) {
      this.apiError.set('Revise a nova senha e sua confirmação.');
      return;
    }

    const resetToken = this.resetToken();

    if (!resetToken) {
      this.apiError.set('A autorização para redefinir a senha expirou. Comece novamente.');
      return;
    }

    const { password } = this.passwordForm.getRawValue();

    this.apiError.set(null);
    this.statusMessage.set(null);
    this.resetting.set(true);

    this.recoveryService
      .reset({ resetToken, newPassword: password })
      .pipe(finalize(() => this.resetting.set(false)))
      .subscribe({
        next: () => {
          this.resetToken.set(null);
          this.recoveryEmail.set('');
          this.passwordForm.reset({ password: '', confirmPassword: '' });
          this.step.set('success');
        },
        error: (error: unknown) => {
          this.apiError.set(
            this.extractErrorMessage(error, 'Não foi possível salvar sua nova senha.'),
          );
        },
      });
  }

  restart(): void {
    this.clearResendInterval();
    this.challengeId.set(null);
    this.resetToken.set(null);
    this.recoveryEmail.set('');
    this.apiError.set(null);
    this.statusMessage.set(null);
    this.resendCooldown.set(0);
    this.clearCode();
    this.requestForm.reset({ email: '' });
    this.passwordForm.reset({ password: '', confirmPassword: '' });
    this.step.set('request-email');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
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

    this.focusCodeInput(Math.min(clipboardData.length, this.codeLength) - 1);
  }

  private clearCode(): void {
    this.codeControls.forEach((control) => {
      control.setValue('');
      control.markAsUntouched();
    });
  }

  private focusCodeInput(index: number): void {
    setTimeout(() => {
      const input = this.codeInputs?.get(Math.max(index, 0))?.nativeElement;

      input?.focus();
      input?.select();
    });
  }

  private startResendCooldown(resendAvailableAt: string): void {
    this.clearResendInterval();

    const availableAt = Date.parse(resendAvailableAt);
    const initialSeconds = Number.isFinite(availableAt)
      ? Math.max(0, Math.ceil((availableAt - Date.now()) / 1000))
      : 60;

    this.resendCooldown.set(initialSeconds);

    if (initialSeconds === 0) {
      return;
    }

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
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = undefined;
    }
  }

  private maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@');

    if (!localPart || !domain) {
      return '';
    }

    const visibleStart = localPart.slice(0, Math.min(2, localPart.length));
    const hiddenLength = Math.max(localPart.length - visibleStart.length, 2);

    return `${visibleStart}${'•'.repeat(Math.min(hiddenLength, 8))}@${domain}`;
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error as Partial<ApiError> | string | null;

    if (response && typeof response === 'object') {
      const firstFieldError = Object.values(response.fields ?? {}).find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );

      if (firstFieldError) {
        return firstFieldError;
      }

      if (typeof response.message === 'string' && response.message.trim()) {
        return response.message;
      }
    }

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    return fallbackMessage;
  }
}
