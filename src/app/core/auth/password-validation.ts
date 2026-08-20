import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordCriteria {
  readonly minimumLength: boolean;
  readonly uppercase: boolean;
  readonly lowercase: boolean;
  readonly number: boolean;
  readonly symbol: boolean;
}

export interface PasswordStrength {
  readonly level: PasswordStrengthLevel;
  readonly label: string;
  readonly percentage: number;
}

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

export function evaluatePasswordCriteria(password: string): PasswordCriteria {
  return {
    minimumLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      level: 'empty',
      label: 'Não avaliada',
      percentage: 0,
    };
  }

  const score = Object.values(evaluatePasswordCriteria(password)).filter(Boolean).length;

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
}
