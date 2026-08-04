import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AuthTypewriterComponent,
} from './typewriter/auth-typewriter.component';

import {
  AuthParticlesComponent,
} from './particles/auth-particles.component';

export type AuthLayoutContext =
  | 'login'
  | 'register';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [
    RouterLink,
    AuthParticlesComponent,
    AuthTypewriterComponent,
  ],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  @Input()
  context: AuthLayoutContext = 'login';
}