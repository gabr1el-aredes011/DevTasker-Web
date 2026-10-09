import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { DashboardSummary } from '../../models/dashboard.models';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const summary: DashboardSummary = {
    projectCount: 2,
    boardCount: 3,
    taskMetrics: {
      total: 8,
      active: 5,
      doing: 2,
      completed: 3,
      overdue: 1,
    },
    recentProjects: [
      {
        id: 7,
        name: 'DevTasker',
        description: 'Workspace para desenvolvimento.',
        membershipRole: 'OWNER',
        createdAt: '2026-10-08T12:00:00Z',
      },
    ],
    attentionTasks: [
      {
        id: 19,
        title: 'Corrigir prazo',
        priority: 'URGENT',
        dueDate: '2026-10-08',
        columnName: 'Em desenvolvimento',
        boardId: 11,
        boardName: 'Principal',
        projectId: 7,
        projectName: 'DevTasker',
        overdue: true,
      },
    ],
    workflow: { backlog: 1, todo: 2, doing: 2, review: 0, done: 3 },
  };
  const dashboardService = { getSummary: vi.fn() };
  const currentUser = signal({
    id: 2,
    name: 'Gabriel Teste',
    email: 'gabriel@example.com',
    role: 'USER' as const,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    dashboardService.getSummary.mockReturnValue(of(summary));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardService },
        { provide: AuthService, useValue: { currentUser: currentUser.asReadonly() } },
      ],
    }).compileComponents();
  });

  it('should translate overdue work into a visible operational risk', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(dashboardService.getSummary).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.workspacePulse()).toEqual(
      expect.objectContaining({ tone: 'danger', title: 'Risco de prazo detectado' }),
    );
    expect(element.querySelector('.workspace-pulse')?.getAttribute('data-tone')).toBe('danger');
    expect(element.querySelector('.workspace-pulse')?.textContent).toContain('1 tarefa vencida');
  });

  it('should expose recent projects as direct navigation targets', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const projectLink = fixture.nativeElement.querySelector(
      '.recent-project',
    ) as HTMLAnchorElement;

    expect(projectLink.getAttribute('href')).toBe('/app/projetos/7');
    expect(projectLink.textContent).toContain('Explorar projeto');
  });

  it('should report a healthy active flow when there are no attention items', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.summary.set({
      ...summary,
      taskMetrics: { ...summary.taskMetrics, overdue: 0 },
      attentionTasks: [],
    });

    expect(fixture.componentInstance.workspacePulse()).toEqual(
      expect.objectContaining({ tone: 'active', title: 'Operação saudável' }),
    );
  });
});
