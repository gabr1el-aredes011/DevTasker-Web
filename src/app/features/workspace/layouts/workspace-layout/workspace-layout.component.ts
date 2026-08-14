import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  readonly loadingUser = signal(false);

  readonly sidebarOpen = signal(false);

  readonly userInitials = computed(() => {
    const user = this.currentUser();

    if (!user?.name) {
      return 'DT';
    }

    const parts = user.name.trim().split(/\s+/).filter(Boolean);

    const first = parts[0]?.[0] ?? '';

    const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';

    return `${first}${last}`.toUpperCase();
  });

  ngOnInit(): void {
    if (this.currentUser()) {
      return;
    }

    this.loadingUser.set(true);

    this.authService
      .loadCurrentUser()
      .pipe(
        finalize(() => {
          this.loadingUser.set(false);
        }),
      )
      .subscribe({
        error: () => {
          this.logout();
        },
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();

    void this.router.navigateByUrl('/login');
  }
}
