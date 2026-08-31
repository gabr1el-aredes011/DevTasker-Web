import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../../core/http/api-error.model';
import { TokenStorageService } from '../../../../core/auth/token-storage.service';
import { DtButtonDirective, DtFeedbackStateComponent } from '../../../../shared/ui';
import { ProjectInvitationAcceptance } from '../../models/project.models';
import { ProjectInvitationNavigationService } from '../../services/project-invitation-navigation.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-accept-project-invitation',
  standalone: true,
  imports: [RouterLink, DtButtonDirective, DtFeedbackStateComponent],
  templateUrl: './accept-project-invitation.component.html',
  styleUrl: './accept-project-invitation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptProjectInvitationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly invitationNavigation = inject(ProjectInvitationNavigationService);

  readonly loading = signal(true);
  readonly acceptance = signal<ProjectInvitationAcceptance | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const fragment = this.route.snapshot.fragment ?? '';
    const fragmentToken = new URLSearchParams(fragment).get('token')?.trim();

    if (fragmentToken) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
      this.invitationNavigation.preserve(fragmentToken);

      if (this.tokenStorage.isAuthenticated()) {
        void this.router.navigateByUrl('/app/convites/aceitar', { replaceUrl: true });
      } else {
        void this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/app/convites/aceitar' },
          replaceUrl: true,
        });
      }
      return;
    }

    const token = this.invitationNavigation.consume();

    if (!token) {
      this.loading.set(false);
      this.error.set('O link do convite está incompleto ou não está mais disponível.');
      return;
    }

    if (!this.tokenStorage.isAuthenticated()) {
      this.error.set('Sua sessão expirou. Abra novamente o link enviado por e-mail.');
      this.loading.set(false);
      return;
    }

    this.projectService.acceptInvitation(token).subscribe({
      next: (result) => {
        this.acceptance.set(result);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(this.extractErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Não foi possível aceitar o convite.';
    if (error.status === 0) return 'Não foi possível conectar ao servidor.';
    const response = error.error as Partial<ApiError> | string | null;
    if (response && typeof response === 'object' && response.message?.trim())
      return response.message;
    if (typeof response === 'string' && response.trim()) return response;
    return 'Não foi possível aceitar o convite.';
  }
}
