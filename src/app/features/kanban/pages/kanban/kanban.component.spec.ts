import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { ProjectService } from '../../../projects/services/project.service';
import { TaskService } from '../../../tasks/services/task.service';
import { KanbanService } from '../../services/kanban.service';
import { KanbanComponent } from './kanban.component';
import { DtToastService } from '../../../../shared/ui';
import { BoardRealtimeService } from '../../services/board-realtime.service';
import { BoardRealtimeEvent } from '../../models/board-realtime.models';

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
    findLabelsByProjectId: vi.fn(),
  };
  const kanbanService = {
    findByBoardId: vi.fn(),
  };
  const stopRealtimeConnection = vi.fn();
  const boardRealtimeService = {
    status: signal<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('connected'),
    connect: vi.fn(
      (_boardId: number, _onEvent: (event: BoardRealtimeEvent) => void) => stopRealtimeConnection,
    ),
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
    findAttachments: vi.fn(),
    uploadAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
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
    boardRealtimeService.status.set('connected');
    queryParams.clear();
    projectService.findAll.mockReturnValue(of([]));
    projectService.findBoardsByProjectId.mockReturnValue(of([]));
    projectService.findMembersByProjectId.mockReturnValue(of([]));
    projectService.findLabelsByProjectId.mockReturnValue(of([]));
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
        assignees: [],
        labels: [{ id: 4, name: 'Backend', color: 'BLUE' as const, archived: false }],
        technologies: ['JAVA'] as const,
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
    taskService.findAttachments.mockReturnValue(
      of([
        {
          id: 5,
          originalFileName: 'evidencia.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1024,
          uploader: { id: 2, name: 'Gabriel', profileImageUrl: null },
          canDelete: false,
          createdAt: '2026-08-31T10:00:00Z',
        },
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [KanbanComponent],
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: KanbanService, useValue: kanbanService },
        { provide: BoardRealtimeService, useValue: boardRealtimeService },
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

  it('should open the filter experience and close it with Escape', () => {
    const fixture = TestBed.createComponent(KanbanComponent);
    const component = fixture.componentInstance;
    const event = new Event('keydown', { cancelable: true });

    component.openFilterPanel();
    expect(component.filterPanelOpen()).toBe(true);

    component.handleModalEscape(event);

    expect(component.filterPanelOpen()).toBe(false);
    expect(event.defaultPrevented).toBe(true);
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
    expect(boardRealtimeService.connect).toHaveBeenCalledWith(12, expect.any(Function));
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { projectId: 7, boardId: 12, taskId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('should silently refresh the selected board after a realtime event', () => {
    queryParams.set('projectId', '7');
    projectService.findAll.mockReturnValue(of([project]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));

    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.detectChanges();
    const onEvent = boardRealtimeService.connect.mock.calls[0][1] as (
      event: BoardRealtimeEvent,
    ) => void;

    onEvent({
      eventId: 'event-1',
      boardId: 12,
      taskId: 19,
      actorUserId: 3,
      type: 'TASK_MOVED',
      occurredAt: '2026-10-05T20:00:00Z',
    });

    expect(kanbanService.findByBoardId).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.loadingKanban()).toBe(false);
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
                assignees: [],
                labels: [{ id: 9, name: 'Permissões', color: 'VIOLET' as const, archived: false }],
                technologies: [],
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
    expect(element.querySelector('#task-attachment-file')).toBeNull();
    expect(element.querySelector('.task-attachments__readonly')?.textContent).toContain(
      'Visualizadores',
    );
    expect(element.querySelector('.task-attachments__metadata')?.textContent).toContain(
      'evidencia.pdf',
    );
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

  it('should replace task details with the edit modal and restore details on cancel', () => {
    const fixture = TestBed.createComponent(KanbanComponent);
    const component = fixture.componentInstance;

    component.selectedProject.set(project);
    component.selectedTask.set({
      id: 19,
      columnId: 31,
      title: 'Revisar permissões',
      description: 'Validar a experiência.',
      priority: 'MEDIUM',
      dueDate: null,
      position: 0,
      creator: { id: 2, name: 'Gabriel', profileImageUrl: null },
      assignees: [],
      labels: [],
      technologies: ['JAVA'],
      checklistItems: [],
      createdAt: '2026-08-31T10:00:00Z',
      updatedAt: '2026-08-31T10:00:00Z',
    });
    component.taskDetailsOpen.set(true);

    component.startTaskEdit();

    expect(component.taskDetailsOpen()).toBe(false);
    expect(component.editingTask()).toBe(true);
    expect(component.taskMovementDisabled()).toBe(true);

    component.cancelTaskEdit();

    expect(component.editingTask()).toBe(false);
    expect(component.taskDetailsOpen()).toBe(true);
  });

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
    expect(TestBed.inject(DtToastService).toasts()).toContainEqual(
      expect.objectContaining({
        message: 'Comentário publicado com sucesso.',
        tone: 'success',
      }),
    );
  });

  it('should publish a contextual reply and keep it grouped with the root comment', () => {
    const rootComment = {
      id: 4,
      content: 'Precisamos revisar esta entrega.',
      author: { id: 3, name: 'Bianca', profileImageUrl: null },
      parentCommentId: null,
      replyToAuthor: null,
      canEdit: false,
      canDelete: false,
      edited: false,
      createdAt: '2026-09-25T15:00:00Z',
      updatedAt: '2026-09-25T15:00:00Z',
    };
    const reply = {
      id: 5,
      content: 'Vou ajustar ainda hoje.',
      author: { id: 2, name: 'Gabriel', profileImageUrl: null },
      parentCommentId: 4,
      replyToAuthor: rootComment.author,
      canEdit: true,
      canDelete: true,
      edited: false,
      createdAt: '2026-09-25T15:05:00Z',
      updatedAt: '2026-09-25T15:05:00Z',
    };
    const collaboration = { comments: [rootComment, reply], activities: [] };
    taskService.addComment.mockReturnValue(of(collaboration));

    const fixture = TestBed.createComponent(KanbanComponent);
    const component = fixture.componentInstance;
    component.selectedProject.set(project);
    component.selectedTaskId.set(19);
    component.taskCollaboration.set({ comments: [rootComment], activities: [] });

    component.startCommentReply(rootComment);
    component.replyCommentForm.setValue({ content: '  Vou ajustar ainda hoje.  ' });
    component.submitCommentReply(rootComment.id);

    expect(taskService.addComment).toHaveBeenCalledWith(19, {
      content: 'Vou ajustar ainda hoje.',
      parentCommentId: rootComment.id,
    });
    expect(component.replyingToCommentId()).toBeNull();
    expect(component.replyCommentForm.controls.content.value).toBe('');
    expect(component.displayedComments()).toEqual([
      { comment: rootComment, isReply: false },
      { comment: reply, isReply: true },
    ]);
    expect(TestBed.inject(DtToastService).toasts()).toContainEqual(
      expect.objectContaining({
        message: 'Resposta publicada com sucesso.',
        tone: 'success',
      }),
    );
  });

  it('should load operational members and send the selected assignee when creating a task', () => {
    queryParams.set('projectId', '7');
    projectService.findAll.mockReturnValue(of([project]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));
    projectService.findMembersByProjectId.mockReturnValue(
      of([
        {
          id: 40,
          userId: 2,
          name: 'Gabriel',
          email: 'gabriel@example.com',
          profileImageUrl: null,
          role: 'ADMIN' as const,
          joinedAt: '2026-08-30T10:00:00Z',
          currentUser: true,
        },
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
    projectService.findLabelsByProjectId.mockReturnValue(
      of([
        {
          id: 4,
          name: 'Backend',
          color: 'BLUE' as const,
          usageCount: 2,
          createdAt: '2026-08-31T10:00:00Z',
          updatedAt: '2026-08-31T10:00:00Z',
        },
        {
          id: 7,
          name: 'Urgente',
          color: 'RED' as const,
          usageCount: 1,
          createdAt: '2026-08-31T10:00:00Z',
          updatedAt: '2026-08-31T10:00:00Z',
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

    expect(component.assignableMembers().map((member) => member.userId)).toEqual([2, 3]);

    component.openCreateTaskForm();
    component.createTaskForm.patchValue({
      title: 'Preparar publicação',
      assigneeIds: [2, 3],
      labelIds: [4, 7],
      technologies: ['JAVA', 'ANGULAR'],
    });
    component.submitCreateTask();

    expect(taskService.create).toHaveBeenCalledWith(
      31,
      expect.objectContaining({
        title: 'Preparar publicação',
        assigneeIds: [2, 3],
        labelIds: [4, 7],
        technologies: ['JAVA', 'ANGULAR'],
      }),
    );
  });

  it('should combine label filters in any and all modes without mutating the board', () => {
    const fixture = TestBed.createComponent(KanbanComponent);
    const component = fixture.componentInstance;
    const board = {
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
              title: 'Integração completa',
              priority: 'HIGH' as const,
              dueDate: null,
              position: 0,
              assignees: [],
              labels: [
                { id: 4, name: 'Backend', color: 'BLUE' as const, archived: false },
                { id: 7, name: 'Urgente', color: 'RED' as const, archived: false },
              ],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
            {
              id: 20,
              title: 'Documentar contrato',
              priority: 'LOW' as const,
              dueDate: null,
              position: 1,
              assignees: [],
              labels: [{ id: 4, name: 'Backend', color: 'BLUE' as const, archived: false }],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
            {
              id: 21,
              title: 'Publicar correção',
              priority: 'URGENT' as const,
              dueDate: null,
              position: 2,
              assignees: [],
              labels: [{ id: 7, name: 'Urgente', color: 'RED' as const, archived: false }],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
          ],
        },
      ],
    };
    component.selectedProject.set(project);
    component.kanban.set(board);

    component.toggleLabelFilter(4);
    component.toggleLabelFilter(7);

    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([
      19, 20, 21,
    ]);
    expect(component.visibleTaskCount()).toBe(3);

    component.setLabelFilterMode('ALL');

    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([19]);
    expect(component.visibleTaskCount()).toBe(1);
    expect(component.taskMovementDisabled()).toBe(true);
    expect(component.kanban()).toBe(board);
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ labels: '4,7', labelMatch: 'all' }),
      }),
    );

    component.clearLabelFilters();

    expect(component.visibleTaskCount()).toBe(3);
    expect(component.taskMovementDisabled()).toBe(false);
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ labels: null, labelMatch: null }),
      }),
    );
  });

  it('should restore an archived label filter from a shared board URL', () => {
    queryParams.set('projectId', '7');
    queryParams.set('boardId', '12');
    queryParams.set('labels', '9');
    queryParams.set('labelMatch', 'all');
    projectService.findAll.mockReturnValue(of([project]));
    projectService.findBoardsByProjectId.mockReturnValue(of(boards));
    projectService.findLabelsByProjectId.mockReturnValue(
      of([
        {
          id: 4,
          name: 'Backend',
          color: 'BLUE' as const,
          usageCount: 1,
          createdAt: '2026-08-31T10:00:00Z',
          updatedAt: '2026-08-31T10:00:00Z',
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
            tasks: [
              {
                id: 19,
                title: 'Preservar histórico',
                priority: 'MEDIUM',
                dueDate: null,
                position: 0,
                assignees: [],
                labels: [{ id: 9, name: 'Legada', color: 'GRAY' as const, archived: true }],
                technologies: [],
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

    expect(component.selectedLabelFilterIds()).toEqual([9]);
    expect(component.labelFilterMode()).toBe('ALL');
    expect(component.availableLabelFilters()).toContainEqual(
      expect.objectContaining({ id: 9, archived: true }),
    );
    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([19]);
  });

  it('should combine priority, assignee and due-date productivity filters', () => {
    const toDateKey = (offsetInDays: number): string => {
      const date = new Date();
      date.setDate(date.getDate() + offsetInDays);
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
    };
    const fixture = TestBed.createComponent(KanbanComponent);
    const component = fixture.componentInstance;
    component.selectedProject.set(project);
    component.kanban.set({
      id: 12,
      projectId: 7,
      name: 'Entrega',
      columns: [
        {
          id: 31,
          name: 'Backlog',
          category: 'BACKLOG',
          position: 0,
          tasks: [
            {
              id: 30,
              title: 'Corrigir produção',
              priority: 'HIGH',
              dueDate: toDateKey(-1),
              position: 0,
              assignees: [{ id: 2, name: 'Gabriel', profileImageUrl: null }],
              labels: [],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
            {
              id: 31,
              title: 'Publicar versão',
              priority: 'HIGH',
              dueDate: toDateKey(3),
              position: 1,
              assignees: [{ id: 3, name: 'Bianca', profileImageUrl: null }],
              labels: [],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
            {
              id: 32,
              title: 'Organizar backlog',
              priority: 'LOW',
              dueDate: null,
              position: 2,
              assignees: [],
              labels: [],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
          ],
        },
      ],
    });

    component.togglePriorityFilter('HIGH');
    component.toggleAssigneeFilter(3);
    component.setDueDateFilter('NEXT_7_DAYS');

    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([31]);
    expect(component.activeFilterCount()).toBe(3);
    expect(component.taskMovementDisabled()).toBe(true);
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          priorities: 'HIGH',
          assignees: '3',
          due: 'next_7_days',
        }),
      }),
    );

    component.clearAllFilters();

    expect(component.visibleTaskCount()).toBe(3);
    expect(component.activeFilterCount()).toBe(0);
    expect(component.taskMovementDisabled()).toBe(false);

    component.setDueDateFilter('OVERDUE');

    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([30]);

    component.clearAllFilters();
    component.toggleAssigneeFilter(null);
    component.setDueDateFilter('NO_DATE');

    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([32]);
  });

  it('should restore productivity filters from the shared URL', () => {
    queryParams.set('projectId', '7');
    queryParams.set('boardId', '12');
    queryParams.set('priorities', 'LOW');
    queryParams.set('assignees', 'none');
    queryParams.set('due', 'no_date');
    projectService.findAll.mockReturnValue(of([project]));
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
                id: 32,
                title: 'Organizar backlog',
                priority: 'LOW' as const,
                dueDate: null,
                position: 0,
                assignees: [],
                labels: [],
                technologies: [],
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

    expect(component.selectedPriorityFilters()).toEqual(['LOW']);
    expect(component.selectedAssigneeFilters()).toEqual([null]);
    expect(component.dueDateFilter()).toBe('NO_DATE');
    expect(component.filteredKanban()?.columns[0].tasks.map((task) => task.id)).toEqual([32]);
  });
});
