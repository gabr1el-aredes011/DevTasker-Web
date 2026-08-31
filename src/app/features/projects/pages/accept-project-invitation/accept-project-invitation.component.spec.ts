import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { TokenStorageService } from '../../../../core/auth/token-storage.service';
import { ProjectInvitationNavigationService } from '../../services/project-invitation-navigation.service';
import { ProjectService } from '../../services/project.service';
import { AcceptProjectInvitationComponent } from './accept-project-invitation.component';

describe('AcceptProjectInvitationComponent', () => {
  const route = { snapshot: { fragment: null as string | null } };
  const router = {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
    createUrlTree: vi.fn().mockReturnValue({}),
    serializeUrl: vi.fn().mockReturnValue('/'),
    events: of(),
  };
  const tokenStorage = { isAuthenticated: vi.fn() };
  const projectService = { acceptInvitation: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    route.snapshot.fragment = null;
    tokenStorage.isAuthenticated.mockReturnValue(true);
    projectService.acceptInvitation.mockReturnValue(
      of({
        projectId: 42,
        projectName: 'DevTasker',
        membership: {
          id: 8,
          userId: 3,
          name: 'Bianca',
          email: 'bianca@example.com',
          profileImageUrl: null,
          role: 'MEMBER',
          joinedAt: '2026-08-31T12:00:00Z',
          currentUser: true,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [AcceptProjectInvitationComponent],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: ProjectService, useValue: projectService },
        ProjectInvitationNavigationService,
      ],
    }).compileComponents();
  });

  it('should remove the token from navigation and send guests to login without exposing it', () => {
    route.snapshot.fragment = 'token=private-token';
    tokenStorage.isAuthenticated.mockReturnValue(false);

    TestBed.createComponent(AcceptProjectInvitationComponent).detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/app/convites/aceitar' },
      replaceUrl: true,
    });
    expect(JSON.stringify(router.navigate.mock.calls)).not.toContain('private-token');
    expect(projectService.acceptInvitation).not.toHaveBeenCalled();
    expect(TestBed.inject(ProjectInvitationNavigationService).consume()).toBe('private-token');
  });

  it('should consume the in-memory token after authentication', () => {
    TestBed.inject(ProjectInvitationNavigationService).preserve('private-token');

    const fixture = TestBed.createComponent(AcceptProjectInvitationComponent);
    fixture.detectChanges();

    expect(projectService.acceptInvitation).toHaveBeenCalledWith('private-token');
    expect(fixture.componentInstance.acceptance()?.projectId).toBe(42);
  });
});
