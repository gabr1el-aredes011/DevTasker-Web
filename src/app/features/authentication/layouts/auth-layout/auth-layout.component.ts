import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthTypewriterComponent } from './typewriter/auth-typewriter.component';

import { AuthParticlesComponent } from './particles/auth-particles.component';

export type AuthLayoutContext = 'login' | 'register' | 'verify' | 'recovery';

export type AuthRecoveryStep =
  | 'request-email'
  | 'verify-code'
  | 'new-password'
  | 'success';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterLink, AuthParticlesComponent, AuthTypewriterComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  @Input()
  context: AuthLayoutContext = 'login';

  @Input()
  recoveryStep: AuthRecoveryStep = 'request-email';

  isRecoveryStepActive(step: Exclude<AuthRecoveryStep, 'success'>): boolean {
    return this.recoveryStep === step;
  }

  isRecoveryStepComplete(step: Exclude<AuthRecoveryStep, 'success'>): boolean {
    const order: readonly AuthRecoveryStep[] = [
      'request-email',
      'verify-code',
      'new-password',
      'success',
    ];

    return order.indexOf(this.recoveryStep) > order.indexOf(step);
  }
}
