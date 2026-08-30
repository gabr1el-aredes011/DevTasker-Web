import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { BoardSummary, ProjectDetails, ProjectMemberSummary } from '../../models/project.models';
import { ProjectService } from '../../services/project.service';
import { ProjectDetailsComponent } from './project-details.component';

describe('ProjectDetailsComponent', () => {
  const project: ProjectDetails = {
    id: 42,
    name: 'DevTasker Web',
    description: 'Experiência web para gestão de entregas.',
    membershipRole: 'ADMIN',
    ownerId: 7,
    ownerName: 'Gabriel Silva',
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-20T14:30:00Z',
  };

  const boards: readonly BoardSummary[] = [
    { id: 5, projectId: 42, name: 'Quadro Principal', defaultBoard: true },
    { id: 8, projectId: 42, name: 'Descoberta', defaultBoard: false },
  ];

  const members: readonly ProjectMemberSummary[] = [
    {
      id: 21,
      userId: 7,
      name: 'Gabriel Silva',
      email: 'gabriel@example.com',
      profileImageUrl: null,
      role: 'ADMIN',
      joinedAt: '2026-08-18T10:00:00Z',
      currentUser: true,
    },
    {
      id: 22,
      userId: 8,
      name: 'Bianca Costa',
      email: 'bianca@example.com',
      profileImageUrl: null,
      role: 'MEMBER',
      joinedAt: '2026-08-19T10:00:00Z',
      currentUser: false,
    },
  ];

  const projectService = {
    findById: vi.fn(),
    findBoardsByProjectId: vi.fn(),
    findMembersByProjectId: vi.fn(),
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    archiveBoard: vi.fn(),
    setDefaultBoard: vi.fn(),
  };

  const dialog = {
    open: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    projectService.findById.mockReturnValue(of(project));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));
    projectService.findMembersByProjectId.mockReturnValue(of(members));
    dialog.open.mockReturnValue({ closed: of(undefined) });

    await TestBed.configureTestingModule({
      imports: [ProjectDetailsComponent],
      providers: [
        provideRouter([
          {
            path: 'app/projetos/:projectId',
            component: ProjectDetailsComponent,
          },
        ]),
        { provide: ProjectService, useValue: projectService },
        { provide: Dialog, useValue: dialog },
      ],
    }).compileComponents();
  });

  it('should load project details and boards from the route projectId', async () => {
    const { component, element } = await renderPage('/app/projetos/42');

    expect(projectService.findById).toHaveBeenCalledWith(42);
    expect(projectService.findBoardsByProjectId).toHaveBeenCalledWith(42);
    expect(projectService.findMembersByProjectId).toHaveBeenCalledWith(42);
    expect(component.project()).toEqual(project);
    expect(component.boards()).toEqual(boards);
    expect(element.querySelector('h1')?.textContent).toContain('DevTasker Web');
    expect(element.querySelector('dt-badge')?.textContent).toContain('Administrador');
    expect(element.querySelector('dt-badge')?.getAttribute('data-tone')).toBe('info');
    expect(element.querySelector('.owner-profile')?.textContent).toContain('Gabriel Silva');
  });

  it('should preserve a members deep link and render the project directory', async () => {
    const { component, element } = await renderPage('/app/projetos/42?tab=members');

    expect(component.activeTab()).toBe('members');
    expect(component.members()).toEqual(members);
    expect((element.querySelector('#project-panel-members') as HTMLElement).hidden).toBe(false);
    expect((element.querySelector('#project-panel-overview') as HTMLElement).hidden).toBe(true);
    expect(element.querySelector('.members-list')?.textContent).toContain('Gabriel Silva');
    expect(element.querySelector('.members-list')?.textContent).toContain('gabriel@example.com');
    expect(element.querySelector('.members-list')?.textContent).toContain('Você');
  });

  it('should preserve a boards deep link and build Kanban links with projectId and boardId', async () => {
    const { component, element } = await renderPage('/app/projetos/42?tab=boards');

    expect(component.activeTab()).toBe('boards');
    expect((element.querySelector('#project-panel-boards') as HTMLElement).hidden).toBe(false);
    expect((element.querySelector('#project-panel-overview') as HTMLElement).hidden).toBe(true);

    const boardLink = element.querySelector('.board-card .dt-button') as HTMLAnchorElement;
    expect(boardLink.getAttribute('href')).toContain('/app/kanban');
    expect(boardLink.getAttribute('href')).toContain('projectId=42');
    expect(boardLink.getAttribute('href')).toContain('boardId=5');
  });

  it('should render the shared empty feedback when the project has no boards', async () => {
    projectService.findBoardsByProjectId.mockReturnValue(of([]));

    const { element } = await renderPage('/app/projetos/42?tab=boards');
    const emptyState = element.querySelector(
      'dt-feedback-state[data-state="empty"]',
    ) as HTMLElement;

    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('Nenhum quadro disponível');
  });

  it('should open board creation for managers and apply the returned board locally', async () => {
    const createdBoard: BoardSummary = {
      id: 13,
      projectId: 42,
      name: 'Entrega',
      defaultBoard: false,
    };
    dialog.open.mockReturnValueOnce({
      closed: of({ action: 'created', board: createdBoard }),
    });

    const { component } = await renderPage('/app/projetos/42?tab=boards');

    component.openCreateBoardDialog();

    expect(dialog.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        data: { mode: 'create', projectId: 42 },
        panelClass: 'dt-dialog-panel',
        backdropClass: 'dt-dialog-backdrop',
      }),
    );
    expect(component.boards()).toEqual([...boards, createdBoard]);
  });

  it('should set a managed board as the project default', async () => {
    projectService.setDefaultBoard.mockReturnValue(of({ ...boards[1], defaultBoard: true }));

    const { component } = await renderPage('/app/projetos/42?tab=boards');

    component.setDefaultBoard(boards[1]);

    expect(projectService.setDefaultBoard).toHaveBeenCalledWith(8);
    expect(component.boards()).toEqual([
      { ...boards[1], defaultBoard: true },
      { ...boards[0], defaultBoard: false },
    ]);
    expect(component.boardActionSuccess()).toContain('Descoberta');
  });

  it('should hide board management actions from viewers', async () => {
    projectService.findById.mockReturnValue(of({ ...project, membershipRole: 'VIEWER' }));

    const { component, element } = await renderPage('/app/projetos/42?tab=boards');

    component.openCreateBoardDialog();

    expect(component.canManageBoards()).toBe(false);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(element.querySelector('.board-card__actions button')).toBeNull();
  });

  it('should update the tab query param and support keyboard tab navigation', async () => {
    const { component, element, harness } = await renderPage('/app/projetos/42?tab=overview');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const overviewTab = element.querySelector('#project-tab-overview') as HTMLButtonElement;

    overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    harness.detectChanges();

    expect(component.activeTab()).toBe('boards');
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { tab: 'boards' },
        queryParamsHandling: 'merge',
      }),
    );
    expect((element.querySelector('#project-tab-boards') as HTMLButtonElement).tabIndex).toBe(0);
  });

  it('should normalize an invalid tab to overview using replaceUrl', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const { component } = await renderPage('/app/projetos/42?tab=unknown');

    expect(component.activeTab()).toBe('overview');
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { tab: 'overview' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('should preserve project details when boards fail and allow retry', async () => {
    projectService.findBoardsByProjectId
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 503,
              error: { message: 'Serviço temporariamente indisponível.' },
            }),
        ),
      )
      .mockReturnValueOnce(of(boards));

    const { component, element, harness } = await renderPage('/app/projetos/42?tab=boards');

    expect(component.loadError()).toBeNull();
    expect(component.boardsLoadError()).toBe('Serviço temporariamente indisponível.');
    expect(component.project()).toEqual(project);
    expect(element.querySelector('.details-hero__meta')?.textContent).toContain(
      'Quadros indisponíveis',
    );
    expect(element.querySelector('.details-hero__meta')?.textContent).not.toContain('0 quadros');
    expect(element.querySelector('dt-feedback-state[data-state="error"]')).toBeTruthy();

    component.retry();
    harness.detectChanges();

    expect(projectService.findById).toHaveBeenCalledTimes(2);
    expect(projectService.findBoardsByProjectId).toHaveBeenCalledTimes(2);
    expect(component.boardsLoadError()).toBeNull();
    expect(component.project()).toEqual(project);
  });

  it('should preserve project details when members fail', async () => {
    projectService.findMembersByProjectId.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { message: 'Diretório temporariamente indisponível.' },
          }),
      ),
    );

    const { component, element } = await renderPage('/app/projetos/42?tab=members');

    expect(component.loadError()).toBeNull();
    expect(component.membersLoadError()).toBe('Diretório temporariamente indisponível.');
    expect(component.project()).toEqual(project);
    expect(
      element.querySelector('#project-panel-members dt-feedback-state[data-state="error"]'),
    ).toBeTruthy();
  });

  it('should reject an invalid projectId without calling the API', async () => {
    const { component, element } = await renderPage('/app/projetos/not-a-number');

    expect(projectService.findById).not.toHaveBeenCalled();
    expect(projectService.findBoardsByProjectId).not.toHaveBeenCalled();
    expect(projectService.findMembersByProjectId).not.toHaveBeenCalled();
    expect(component.loadError()).toContain('identificador');
    expect(element.querySelector('dt-feedback-state[data-state="error"]')).toBeTruthy();
  });

  async function renderPage(url: string): Promise<{
    component: ProjectDetailsComponent;
    element: HTMLElement;
    harness: RouterTestingHarness;
  }> {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, ProjectDetailsComponent);
    harness.detectChanges();

    return {
      component,
      element: harness.routeNativeElement as HTMLElement,
      harness,
    };
  }
});
