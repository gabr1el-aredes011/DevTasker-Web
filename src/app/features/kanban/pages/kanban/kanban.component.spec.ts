import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { ProjectService } from '../../../projects/services/project.service';
import { TaskService } from '../../../tasks/services/task.service';
import { KanbanService } from '../../services/kanban.service';
import { KanbanComponent } from './kanban.component';

describe('KanbanComponent', () => {
  const project = {
    id: 7,
    name: 'DevTasker',
    description: 'Gestão de entregas.',
    membershipRole: 'OWNER' as const,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  };
  const boards = [
    { id: 11, projectId: 7, name: 'Descoberta', defaultBoard: false },
    { id: 12, projectId: 7, name: 'Entrega', defaultBoard: true },
  ];
  const projectService = {
    findAll: vi.fn(),
    findBoardsByProjectId: vi.fn(),
  };
  const kanbanService = {
    findByBoardId: vi.fn(),
  };
  const router = {
    navigate: vi.fn().mockResolvedValue(true),
  };
  const queryParams = new Map<string, string>();
  const activatedRoute = {
    snapshot: {
      queryParamMap: {
        get: vi.fn((name: string) => queryParams.get(name) ?? null),
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryParams.clear();
    projectService.findAll.mockReturnValue(of([]));
    projectService.findBoardsByProjectId.mockReturnValue(of([]));
    kanbanService.findByBoardId.mockReturnValue(
      of({ id: 12, projectId: 7, name: 'Entrega', columns: [] }),
    );

    await TestBed.configureTestingModule({
      imports: [KanbanComponent],
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: KanbanService, useValue: kanbanService },
        { provide: TaskService, useValue: {} },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    })
      .overrideComponent(KanbanComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(KanbanComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should automatically open the project default board', () => {
    queryParams.set('projectId', '7');
    projectService.findAll.mockReturnValue(of([project]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));

    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(projectService.findBoardsByProjectId).toHaveBeenCalledWith(7);
    expect(component.selectedBoard()).toEqual(boards[1]);
    expect(kanbanService.findByBoardId).toHaveBeenCalledWith(12);
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { projectId: 7, boardId: 12, taskId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('should keep an explicit board deep link authoritative', () => {
    queryParams.set('projectId', '7');
    queryParams.set('boardId', '11');
    projectService.findAll.mockReturnValue(of([project]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));
    kanbanService.findByBoardId.mockReturnValue(
      of({ id: 11, projectId: 7, name: 'Descoberta', columns: [] }),
    );

    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedBoard()).toEqual(boards[0]);
    expect(kanbanService.findByBoardId).toHaveBeenCalledWith(11);
  });
});
