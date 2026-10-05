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
  const viewerProject = {
    ...project,
    membershipRole: 'VIEWER' as const,
  };
  const boards = [
    { id: 11, projectId: 7, name: 'Descoberta', defaultBoard: false },
    { id: 12, projectId: 7, name: 'Entrega', defaultBoard: true },
  ];
  const projectService = {
    findAll: vi.fn(),
    findBoardsByProjectId: vi.fn(),
    findMembersByProjectId: vi.fn(),
  };
  const kanbanService = {
    findByBoardId: vi.fn(),
  };
  const taskService = {
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    move: vi.fn(),
    findById: vi.fn(),
    addChecklistItem: vi.fn(),
    updateChecklistItem: vi.fn(),
    removeChecklistItem: vi.fn(),
    findCollaboration: vi.fn(),
    addComment: vi.fn(),
    editComment: vi.fn(),
    removeComment: vi.fn(),
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
    projectService.findMembersByProjectId.mockReturnValue(of([]));
    kanbanService.findByBoardId.mockReturnValue(
      of({ id: 12, projectId: 7, name: 'Entrega', columns: [] }),
    );
    taskService.findById.mockReturnValue(
      of({
        id: 19,
        columnId: 31,
        title: 'Revisar permissões',
        description: 'Validar a experiência do visualizador.',
        priority: 'MEDIUM' as const,
        dueDate: null,
        position: 0,
        creator: { id: 2, name: 'Gabriel', profileImageUrl: null },
        assignee: null,
        labels: ['Backend'],
        checklistItems: [
          {
            id: 8,
            title: 'Validar cenário de permissão',
            completed: false,
            position: 0,
            createdAt: '2026-08-31T10:00:00Z',
            updatedAt: '2026-08-31T10:00:00Z',
          },
        ],
        createdAt: '2026-08-31T10:00:00Z',
        updatedAt: '2026-08-31T10:00:00Z',
      }),
    );
    taskService.findCollaboration.mockReturnValue(of({ comments: [], activities: [] }));

    await TestBed.configureTestingModule({
      imports: [KanbanComponent],
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: KanbanService, useValue: kanbanService },
        { provide: TaskService, useValue: taskService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();
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

  it('should present a viewer board as read-only', () => {
    queryParams.set('projectId', '7');
    projectService.findAll.mockReturnValue(of([viewerProject]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));
    kanbanService.findByBoardId.mockReturnValue(
      of({
        id: 12,
        projectId: 7,
        name: 'Entrega',
        columns: [
          {
            id: 31,
            name: 'Backlog',
            category: 'BACKLOG' as const,
            position: 0,
            tasks: [
              {
                id: 19,
                title: 'Revisar permissões',
                priority: 'MEDIUM',
                dueDate: null,
                position: 0,
                assigneeId: null,
                assigneeName: null,
                labels: ['Permissões'],
                completedChecklistItems: 0,
                totalChecklistItems: 0,
              },
            ],
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(component.isReadOnly()).toBe(true);
    expect(component.canWriteTasks()).toBe(false);
    expect(component.taskMovementDisabled()).toBe(true);
    expect(projectService.findMembersByProjectId).not.toHaveBeenCalled();
    expect(element.querySelector('.read-only-badge')?.textContent).toContain('Somente leitura');
    expect(element.querySelector('.new-task-button')).toBeNull();
    expect(element.querySelector('.task-drag-handle')).toBeNull();

    component.openCreateTaskForm();
    component.submitCreateTask();

    expect(component.taskFormOpen()).toBe(false);
    expect(taskService.create).not.toHaveBeenCalled();

    component.openTaskDetails(19);
    fixture.detectChanges();

    expect(element.querySelector('.task-details-actions')).toBeNull();
    expect(element.querySelector('.task-checklist__form')).toBeNull();
    expect(element.querySelector('.task-comment-form')).toBeNull();
    expect(
      (element.querySelector('.task-checklist__items input') as HTMLInputElement).disabled,
    ).toBe(true);
    component.startTaskEdit();
    component.requestTaskArchive();
    component.toggleChecklistItem(component.selectedTask()!.checklistItems[0]);
    component.removeChecklistItem(component.selectedTask()!.checklistItems[0]);
    component.commentForm.setValue({ content: 'Tentativa bloqueada' });
    component.addComment();

    expect(component.editingTask()).toBe(false);
    expect(component.archiveConfirmationOpen()).toBe(false);
    expect(taskService.update).not.toHaveBeenCalled();
    expect(taskService.archive).not.toHaveBeenCalled();
    expect(taskService.updateChecklistItem).not.toHaveBeenCalled();
    expect(taskService.removeChecklistItem).not.toHaveBeenCalled();
    expect(taskService.addComment).not.toHaveBeenCalled();
  });

  it.each(['OWNER', 'ADMIN', 'MEMBER'] as const)(
    'should retain task write access for the %s role',
    (membershipRole) => {
      const fixture = TestBed.createComponent(KanbanComponent);
      const component = fixture.componentInstance;

      component.selectedProject.set({ ...project, membershipRole });

      expect(component.canWriteTasks()).toBe(true);
      expect(component.isReadOnly()).toBe(false);
    },
  );

  it('should publish a trimmed comment and refresh the collaboration state', () => {
    const collaboration = {
      comments: [
        {
          id: 4,
          content: 'Contexto da entrega.',
          author: { id: 2, name: 'Gabriel', profileImageUrl: null },
          canEdit: true,
          canDelete: true,
          edited: false,
          createdAt: '2026-09-25T15:00:00Z',
          updatedAt: '2026-09-25T15:00:00Z',
        },
      ],
      activities: [],
    };
    taskService.addComment.mockReturnValue(of(collaboration));

    const fixture = TestBed.createComponent(KanbanComponent);
    const component = fixture.componentInstance;
    component.selectedProject.set(project);
    component.selectedTaskId.set(19);
    component.commentForm.setValue({ content: '  Contexto da entrega.  ' });

    component.addComment();

    expect(taskService.addComment).toHaveBeenCalledWith(19, {
      content: 'Contexto da entrega.',
    });
    expect(component.taskCollaboration()).toEqual(collaboration);
    expect(component.commentForm.controls.content.value).toBe('');
    expect(component.commentActionSuccess()).toContain('publicado');
  });

  it('should load operational members and send the selected assignee when creating a task', () => {
    queryParams.set('projectId', '7');
    projectService.findAll.mockReturnValue(of([project]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));
    projectService.findMembersByProjectId.mockReturnValue(
      of([
        {
          id: 41,
          userId: 3,
          name: 'Bianca',
          email: 'bianca@example.com',
          profileImageUrl: null,
          role: 'MEMBER' as const,
          joinedAt: '2026-08-31T10:00:00Z',
          currentUser: false,
        },
        {
          id: 42,
          userId: 4,
          name: 'Visitante',
          email: 'viewer@example.com',
          profileImageUrl: null,
          role: 'VIEWER' as const,
          joinedAt: '2026-08-31T10:00:00Z',
          currentUser: false,
        },
      ]),
    );
    kanbanService.findByBoardId.mockReturnValue(
      of({
        id: 12,
        projectId: 7,
        name: 'Entrega',
        columns: [
          {
            id: 31,
            name: 'Backlog',
            category: 'BACKLOG' as const,
            position: 0,
            tasks: [],
          },
        ],
      }),
    );
    taskService.create.mockReturnValue(of({}));

    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.assignableMembers().map((member) => member.userId)).toEqual([3]);

    component.openCreateTaskForm();
    component.createTaskForm.patchValue({
      title: 'Preparar publicação',
      assigneeId: 3,
      labelsText: ' Backend, urgente, backend ',
    });
    component.submitCreateTask();

    expect(taskService.create).toHaveBeenCalledWith(
      31,
      expect.objectContaining({
        title: 'Preparar publicação',
        assigneeId: 3,
        labels: ['Backend', 'urgente'],
      }),
    );
  });
});
