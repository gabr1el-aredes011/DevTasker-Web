import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { A11yModule } from '@angular/cdk/a11y';
import { Dialog } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateTaskRequest,
  TaskCollaboration,
  TaskAttachment,
  TaskComment,
  TaskChecklistItem,
  TaskLabel,
  TaskPriority,
  TaskTechnology,
  TaskResponse,
  TASK_TECHNOLOGY_OPTIONS,
  UpdateTaskRequest,
  MoveTaskRequest,
} from '../../../tasks/models/task.models';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { finalize, take } from 'rxjs';
import { KanbanBoard, KanbanColumn, KanbanTask } from '../../models/kanban.models';
import { KanbanService } from '../../services/kanban.service';
import { TaskService } from '../../../tasks/services/task.service';
import { ApiError } from '../../../../core/http/api-error.model';
import {
  BoardSummary,
  ProjectLabel,
  ProjectMemberSummary,
  ProjectSummary,
} from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskMarkdownComponent } from '../../../../shared/ui/task-markdown/task-markdown.component';
import { DtButtonDirective, DtToastService } from '../../../../shared/ui';
import { BoardRealtimeService } from '../../services/board-realtime.service';
import { BoardRealtimeEvent, BoardRealtimeStatus } from '../../models/board-realtime.models';
import {
  ProjectLabelDialogComponent,
  ProjectLabelDialogData,
  ProjectLabelDialogResult,
} from '../../../projects/components/project-label-dialog/project-label-dialog.component';
import { BoardIntelligenceComponent } from '../../components/board-intelligence/board-intelligence.component';

type LabelFilterMode = 'ANY' | 'ALL';
type DueDateFilter = 'ALL' | 'OVERDUE' | 'TODAY' | 'NEXT_7_DAYS' | 'NO_DATE';
type MarkdownFormat =
  'bold' | 'italic' | 'heading' | 'list' | 'checklist' | 'quote' | 'code' | 'link';

interface AssigneeFilterOption {
  readonly id: number | null;
  readonly name: string;
}

interface AttachmentPreview {
  readonly name: string;
  readonly contentType: string;
  readonly objectUrl: string;
  readonly safeUrl: SafeResourceUrl;
  readonly textContent: string | null;
}

interface DisplayTaskComment {
  readonly comment: TaskComment;
  readonly isReply: boolean;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    A11yModule,
    DtButtonDirective,
    BoardIntelligenceComponent,
    TaskMarkdownComponent,
    DatePipe,
  ],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanComponent implements OnInit, OnDestroy {
  private readonly projectService = inject(ProjectService);
  private readonly kanbanService = inject(KanbanService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(DtToastService);
  private readonly boardRealtimeService = inject(BoardRealtimeService);
  private readonly dialog = inject(Dialog);
  private readonly sanitizer = inject(DomSanitizer);

  readonly projects = signal<readonly ProjectSummary[]>([]);

  readonly selectedProject = signal<ProjectSummary | null>(null);

  readonly boards = signal<readonly BoardSummary[]>([]);

  readonly selectedBoard = signal<BoardSummary | null>(null);

  readonly assignableMembers = signal<readonly ProjectMemberSummary[]>([]);
  readonly loadingAssignableMembers = signal(false);
  readonly assignableMembersError = signal<string | null>(null);
  readonly projectLabels = signal<readonly ProjectLabel[]>([]);
  readonly loadingProjectLabels = signal(false);
  readonly projectLabelsError = signal<string | null>(null);
  readonly selectedLabelFilterIds = signal<readonly number[]>([]);
  readonly labelFilterMode = signal<LabelFilterMode>('ANY');
  readonly selectedPriorityFilters = signal<readonly TaskPriority[]>([]);
  readonly selectedAssigneeFilters = signal<readonly (number | null)[]>([]);
  readonly dueDateFilter = signal<DueDateFilter>('ALL');
  readonly realtimeStatus = this.boardRealtimeService.status;
  readonly realtimeStatusLabel = computed(() => {
    const labels: Readonly<Record<BoardRealtimeStatus, string>> = {
      disconnected: 'Tempo real indisponível',
      connecting: 'Conectando em tempo real...',
      connected: 'Atualizações em tempo real',
      reconnecting: 'Reconectando em tempo real...',
    };

    return labels[this.realtimeStatus()];
  });

  readonly kanban = signal<KanbanBoard | null>(null);

  readonly availableLabelFilters = computed<readonly TaskLabel[]>(() => {
    const labelsById = new Map<number, TaskLabel>();

    for (const label of this.projectLabels()) {
      labelsById.set(label.id, {
        id: label.id,
        name: label.name,
        color: label.color,
        archived: false,
      });
    }

    for (const column of this.kanban()?.columns ?? []) {
      for (const task of column.tasks) {
        for (const label of task.labels) {
          if (!labelsById.has(label.id)) labelsById.set(label.id, label);
        }
      }
    }

    return [...labelsById.values()].sort((left, right) => {
      if (left.archived !== right.archived) return left.archived ? 1 : -1;
      return left.name.localeCompare(right.name);
    });
  });

  readonly availableAssigneeFilters = computed<readonly AssigneeFilterOption[]>(() => {
    const assigneesById = new Map<number, string>();
    let hasUnassignedTasks = false;

    for (const column of this.kanban()?.columns ?? []) {
      for (const task of column.tasks) {
        if (task.assignees.length === 0) {
          hasUnassignedTasks = true;
        } else {
          for (const assignee of task.assignees) {
            assigneesById.set(assignee.id, assignee.name);
          }
        }
      }
    }

    const options: AssigneeFilterOption[] = [...assigneesById.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));

    if (hasUnassignedTasks) options.push({ id: null, name: 'Sem responsável' });
    return options;
  });

  readonly hasActiveLabelFilters = computed(() => this.selectedLabelFilterIds().length > 0);
  readonly hasActiveKanbanFilters = computed(
    () =>
      this.hasActiveLabelFilters() ||
      this.selectedPriorityFilters().length > 0 ||
      this.selectedAssigneeFilters().length > 0 ||
      this.dueDateFilter() !== 'ALL',
  );
  readonly activeFilterCount = computed(
    () =>
      this.selectedLabelFilterIds().length +
      this.selectedPriorityFilters().length +
      this.selectedAssigneeFilters().length +
      (this.dueDateFilter() === 'ALL' ? 0 : 1),
  );

  readonly filteredKanban = computed<KanbanBoard | null>(() => {
    const board = this.kanban();
    if (!board || !this.hasActiveKanbanFilters()) return board;

    const selectedLabelIds = this.selectedLabelFilterIds();
    const selectedPriorities = this.selectedPriorityFilters();
    const selectedAssignees = this.selectedAssigneeFilters();
    const labelMode = this.labelFilterMode();
    const dueDateFilter = this.dueDateFilter();
    const today = this.toLocalDateKey(new Date());
    const nextSevenDays = new Date();
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);
    const nextSevenDaysKey = this.toLocalDateKey(nextSevenDays);

    return {
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => {
          const taskLabelIds = new Set(task.labels.map((label) => label.id));
          const matchesLabels =
            selectedLabelIds.length === 0 ||
            (labelMode === 'ALL'
              ? selectedLabelIds.every((labelId) => taskLabelIds.has(labelId))
              : selectedLabelIds.some((labelId) => taskLabelIds.has(labelId)));
          const matchesPriority =
            selectedPriorities.length === 0 || selectedPriorities.includes(task.priority);
          const matchesAssignee =
            selectedAssignees.length === 0 ||
            (task.assignees.length === 0 && selectedAssignees.includes(null)) ||
            task.assignees.some((assignee) => selectedAssignees.includes(assignee.id));
          const matchesDueDate = this.matchesDueDateFilter(
            task.dueDate,
            dueDateFilter,
            today,
            nextSevenDaysKey,
          );

          return matchesLabels && matchesPriority && matchesAssignee && matchesDueDate;
        }),
      })),
    };
  });

  readonly totalTaskCount = computed(() =>
    (this.kanban()?.columns ?? []).reduce((total, column) => total + column.tasks.length, 0),
  );

  readonly visibleTaskCount = computed(() =>
    (this.filteredKanban()?.columns ?? []).reduce(
      (total, column) => total + column.tasks.length,
      0,
    ),
  );

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly loadingBoards = signal(false);

  readonly boardsLoadError = signal<string | null>(null);

  readonly loadingKanban = signal(false);

  readonly kanbanLoadError = signal<string | null>(null);

  readonly taskFormOpen = signal(false);
  readonly filterPanelOpen = signal(false);
  readonly creatingTask = signal(false);

  readonly createTaskError = signal<string | null>(null);
  readonly createDescriptionPreview = signal(false);

  readonly taskDetailsOpen = signal(false);

  readonly selectedTaskId = signal<number | null>(null);

  readonly selectedTask = signal<TaskResponse | null>(null);

  readonly loadingTaskDetails = signal(false);

  readonly taskDetailsError = signal<string | null>(null);

  readonly editingTask = signal(false);
  readonly editDescriptionPreview = signal(false);
  readonly updatingTask = signal(false);

  readonly updateTaskError = signal<string | null>(null);

  readonly managingChecklist = signal(false);
  readonly checklistError = signal<string | null>(null);

  readonly taskCollaboration = signal<TaskCollaboration | null>(null);
  readonly loadingTaskCollaboration = signal(false);
  readonly taskCollaborationError = signal<string | null>(null);
  readonly managingComment = signal(false);
  readonly commentActionError = signal<string | null>(null);
  readonly editingCommentId = signal<number | null>(null);
  readonly replyingToCommentId = signal<number | null>(null);
  readonly commentPendingDeletionId = signal<number | null>(null);

  readonly displayedComments = computed<readonly DisplayTaskComment[]>(() => {
    const comments = this.taskCollaboration()?.comments ?? [];
    const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
    const repliesByParent = new Map<number, TaskComment[]>();
    const roots: TaskComment[] = [];

    for (const comment of comments) {
      const parentId = comment.parentCommentId ?? null;

      if (parentId === null || !commentsById.has(parentId)) {
        roots.push(comment);
        continue;
      }

      const replies = repliesByParent.get(parentId) ?? [];
      replies.push(comment);
      repliesByParent.set(parentId, replies);
    }

    return roots.flatMap((comment) => [
      { comment, isReply: (comment.parentCommentId ?? null) !== null },
      ...(repliesByParent.get(comment.id) ?? []).map((reply) => ({
        comment: reply,
        isReply: true,
      })),
    ]);
  });

  readonly taskAttachments = signal<readonly TaskAttachment[]>([]);
  readonly loadingTaskAttachments = signal(false);
  readonly taskAttachmentsError = signal<string | null>(null);
  readonly managingAttachment = signal(false);
  readonly downloadingAttachmentId = signal<number | null>(null);
  readonly attachmentActionError = signal<string | null>(null);
  readonly attachmentPendingDeletionId = signal<number | null>(null);
  readonly pendingAttachment = signal<File | null>(null);
  readonly pendingAttachmentThumbnailUrl = signal<string | null>(null);
  readonly attachmentPreview = signal<AttachmentPreview | null>(null);
  readonly previewingAttachmentId = signal<number | null>(null);

  readonly checklistCompletedCount = computed(
    () => this.selectedTask()?.checklistItems.filter((item) => item.completed).length ?? 0,
  );

  readonly priorities: readonly TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly technologyOptions = TASK_TECHNOLOGY_OPTIONS;
  readonly priorityFilterOptions: readonly {
    readonly value: TaskPriority;
    readonly label: string;
  }[] = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'URGENT', label: 'Urgente' },
  ];
  readonly dueDateFilterOptions: readonly {
    readonly value: DueDateFilter;
    readonly label: string;
  }[] = [
    { value: 'ALL', label: 'Todos os prazos' },
    { value: 'OVERDUE', label: 'Vencidas' },
    { value: 'TODAY', label: 'Vencem hoje' },
    { value: 'NEXT_7_DAYS', label: 'Próximos 7 dias' },
    { value: 'NO_DATE', label: 'Sem prazo' },
  ];

  readonly createTaskForm = this.formBuilder.nonNullable.group({
    columnId: [0, [Validators.required, Validators.min(1)]],

    title: ['', [Validators.required, Validators.maxLength(180)]],

    description: ['', [Validators.maxLength(4000)]],

    priority: ['MEDIUM' as TaskPriority, [Validators.required]],

    dueDate: [''],

    assigneeIds: [[] as number[]],

    labelIds: [[] as number[]],

    technologies: [[] as TaskTechnology[]],
  });

  readonly editTaskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(180)]],

    description: ['', [Validators.maxLength(4000)]],

    priority: ['MEDIUM' as TaskPriority, [Validators.required]],

    dueDate: [''],

    assigneeIds: [[] as number[]],

    labelIds: [[] as number[]],

    technologies: [[] as TaskTechnology[]],
  });

  readonly checklistItemForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(180)]],
  });

  readonly commentForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly editCommentForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly replyCommentForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly archiveConfirmationOpen = signal(false);
  readonly archivingTask = signal(false);

  readonly archiveTaskError = signal<string | null>(null);

  readonly movingTask = signal(false);

  readonly moveTaskError = signal<string | null>(null);

  readonly canWriteTasks = computed(() => {
    const project = this.selectedProject();

    return project !== null && project.membershipRole !== 'VIEWER';
  });

  readonly canManageLabels = computed(() => {
    const role = this.selectedProject()?.membershipRole;
    return role === 'OWNER' || role === 'ADMIN';
  });

  readonly isReadOnly = computed(() => this.selectedProject()?.membershipRole === 'VIEWER');

  readonly taskMovementDisabled = computed(
    () =>
      !this.canWriteTasks() ||
      this.hasActiveKanbanFilters() ||
      this.loadingKanban() ||
      this.movingTask() ||
      this.creatingTask() ||
      this.updatingTask() ||
      this.archivingTask() ||
      this.taskFormOpen() ||
      this.taskDetailsOpen() ||
      this.editingTask(),
  );

  private projectLabelsReady = false;
  private kanbanReady = false;
  private realtimeBoardId: number | null = null;
  private stopRealtimeConnection: (() => void) | null = null;

  ngOnInit(): void {
    this.loadPageData();
  }

  ngOnDestroy(): void {
    this.disconnectRealtime();
    this.resetTaskAttachments();
  }

  retry(): void {
    this.loadPageData();
  }

  selectProject(project: ProjectSummary): void {
    this.disconnectRealtime();
    this.selectedProject.set(project);

    this.resetFilters(false);

    this.loadAssignableMembers(project);
    this.loadProjectLabels(project);

    this.selectedBoard.set(null);
    this.kanban.set(null);
    this.kanbanReady = false;
    this.kanbanLoadError.set(null);

    this.moveTaskError.set(null);
    this.updateNavigationState({
      projectId: project.id,
      boardId: null,
      taskId: null,
      labels: null,
      labelMatch: null,
      priorities: null,
      assignees: null,
      due: null,
    });

    this.loadBoards(project.id);
  }

  backToProjects(): void {
    this.disconnectRealtime();
    this.selectedProject.set(null);

    this.resetFilters(false);

    this.resetAssignableMembers();
    this.resetProjectLabels();

    this.boards.set([]);
    this.boardsLoadError.set(null);

    this.selectedBoard.set(null);

    this.kanban.set(null);
    this.kanbanReady = false;
    this.kanbanLoadError.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);

    this.resetTaskDetails();

    this.moveTaskError.set(null);

    this.updateNavigationState({
      projectId: null,
      boardId: null,
      taskId: null,
      labels: null,
      labelMatch: null,
      priorities: null,
      assignees: null,
      due: null,
    });
  }

  retryBoards(): void {
    const project = this.selectedProject();

    if (project) {
      this.loadBoards(project.id);
    }
  }

  selectBoard(board: BoardSummary): void {
    this.selectedBoard.set(board);

    this.moveTaskError.set(null);

    this.updateNavigationState({
      projectId: this.selectedProject()?.id ?? null,

      boardId: board.id,

      taskId: null,
    });

    this.loadKanban(board.id);
  }

  backToBoards(): void {
    this.disconnectRealtime();
    this.selectedBoard.set(null);

    this.kanban.set(null);
    this.kanbanReady = false;
    this.kanbanLoadError.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);

    this.resetTaskDetails();

    this.moveTaskError.set(null);

    this.updateNavigationState({
      boardId: null,
      taskId: null,
    });
  }

  retryKanban(): void {
    const board = this.selectedBoard();

    if (board) {
      this.loadKanban(board.id);
    }
  }

  dropTask(event: CdkDragDrop<KanbanColumn, KanbanColumn, KanbanTask>): void {
    if (this.taskMovementDisabled() || !event.isPointerOverContainer) {
      return;
    }

    const board = this.kanban();
    const selectedBoard = this.selectedBoard();

    if (!board || !selectedBoard) {
      return;
    }

    const task = event.item.data;
    const sourceColumn = event.previousContainer.data;
    const targetColumn = event.container.data;

    const sameColumn = sourceColumn.id === targetColumn.id;

    const samePosition = event.previousIndex === event.currentIndex;

    if (sameColumn && samePosition) {
      return;
    }

    const previousBoard = board;

    const optimisticBoard = this.moveTaskLocally(
      board,
      task.id,
      sourceColumn.id,
      targetColumn.id,
      event.currentIndex,
    );

    if (optimisticBoard === board) {
      this.moveTaskError.set('A tarefa não foi localizada no quadro.');

      return;
    }

    const request: MoveTaskRequest = {
      targetColumnId: targetColumn.id,
      targetPosition: event.currentIndex,
    };

    this.kanban.set(optimisticBoard);

    this.movingTask.set(true);
    this.moveTaskError.set(null);

    this.taskService
      .move(task.id, request)
      .pipe(
        finalize(() => {
          this.movingTask.set(false);
        }),
      )
      .subscribe({
        next: () => {
          if (this.selectedBoard()?.id !== selectedBoard.id) {
            return;
          }

          this.toast.success('Tarefa movida com sucesso.');

          this.refreshKanbanAfterMovement(selectedBoard.id);
        },

        error: (error: unknown) => {
          if (this.selectedBoard()?.id !== selectedBoard.id) {
            return;
          }

          this.kanban.set(previousBoard);

          this.moveTaskError.set(this.extractApiError(error, 'Não foi possível mover a tarefa.'));
        },
      });
  }
  openCreateTaskForm(): void {
    if (!this.canWriteTasks()) {
      return;
    }

    const board = this.kanban();
    const firstColumn = board?.columns[0];

    if (!firstColumn) {
      return;
    }

    this.closeTaskDetails();

    this.createTaskError.set(null);

    this.moveTaskError.set(null);

    this.createTaskForm.reset({
      columnId: firstColumn.id,
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
      assigneeIds: [],
      labelIds: [],
      technologies: [],
    });
    this.createDescriptionPreview.set(false);
    this.taskFormOpen.set(true);
  }

  startTaskEdit(): void {
    const task = this.selectedTask();

    if (!this.canWriteTasks() || !task || this.loadingTaskDetails()) {
      return;
    }

    this.updateTaskError.set(null);

    this.editTaskForm.reset({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.dueDate ?? '',
      assigneeIds: task.assignees.map((assignee) => assignee.id),
      labelIds: task.labels.filter((label) => !label.archived).map((label) => label.id),
      technologies: [...task.technologies],
    });

    this.editDescriptionPreview.set(false);
    this.taskDetailsOpen.set(false);
    this.editingTask.set(true);
  }

  cancelTaskEdit(): void {
    if (this.updatingTask()) {
      return;
    }

    this.editingTask.set(false);
    this.editDescriptionPreview.set(false);
    this.updateTaskError.set(null);
    this.taskDetailsOpen.set(true);
  }

  submitTaskUpdate(): void {
    if (!this.canWriteTasks()) {
      return;
    }

    if (this.editTaskForm.invalid) {
      this.editTaskForm.markAllAsTouched();
      return;
    }

    const task = this.selectedTask();

    if (!task) {
      this.updateTaskError.set('Nenhuma tarefa foi selecionada.');

      return;
    }

    const formValue = this.editTaskForm.getRawValue();

    const normalizedTitle = formValue.title.trim();

    if (!normalizedTitle) {
      this.editTaskForm.controls.title.setErrors({
        required: true,
      });

      this.editTaskForm.controls.title.markAsTouched();
      return;
    }

    const request: UpdateTaskRequest = {
      title: normalizedTitle,

      description: formValue.description.trim() || null,

      priority: formValue.priority,

      dueDate: formValue.dueDate || null,
      assigneeIds: formValue.assigneeIds,
      labelIds: formValue.labelIds,
      technologies: formValue.technologies,
    };

    this.updatingTask.set(true);
    this.updateTaskError.set(null);

    this.taskService
      .update(task.id, request)
      .pipe(
        finalize(() => {
          this.updatingTask.set(false);
        }),
      )
      .subscribe({
        next: (updatedTask) => {
          /*
           * Atualiza imediatamente os detalhes com
           * a resposta oficial devolvida pelo backend.
           */
          this.selectedTask.set(updatedTask);
          this.editingTask.set(false);
          this.editDescriptionPreview.set(false);
          this.taskDetailsOpen.set(true);

          this.toast.success('Tarefa atualizada com sucesso.');
          this.loadTaskCollaboration(updatedTask.id);

          const board = this.selectedBoard();

          if (board) {
            this.loadKanban(board.id);
          }
        },

        error: (error: unknown) => {
          this.updateTaskError.set(
            this.extractApiError(error, 'Não foi possível atualizar a tarefa.'),
          );
        },
      });
  }

  addChecklistItem(): void {
    const task = this.selectedTask();

    if (!this.canWriteTasks() || !task || this.managingChecklist()) {
      return;
    }

    if (this.checklistItemForm.invalid) {
      this.checklistItemForm.markAllAsTouched();
      return;
    }

    const title = this.checklistItemForm.controls.title.value.trim();

    if (!title) {
      this.checklistItemForm.controls.title.setErrors({ required: true });
      this.checklistItemForm.controls.title.markAsTouched();
      return;
    }

    this.managingChecklist.set(true);
    this.checklistError.set(null);

    this.taskService
      .addChecklistItem(task.id, { title })
      .pipe(finalize(() => this.managingChecklist.set(false)))
      .subscribe({
        next: (updatedTask) => {
          this.applyChecklistUpdate(updatedTask);
          this.checklistItemForm.reset({ title: '' });
          this.toast.success('Item adicionado à checklist.');
          this.loadTaskCollaboration(updatedTask.id);
        },
        error: (error: unknown) => {
          this.checklistError.set(
            this.extractApiError(error, 'Não foi possível adicionar o item.'),
          );
        },
      });
  }

  toggleChecklistItem(item: TaskChecklistItem): void {
    const task = this.selectedTask();

    if (!this.canWriteTasks() || !task || this.managingChecklist()) {
      return;
    }

    this.managingChecklist.set(true);
    this.checklistError.set(null);

    this.taskService
      .updateChecklistItem(task.id, item.id, {
        title: item.title,
        completed: !item.completed,
      })
      .pipe(finalize(() => this.managingChecklist.set(false)))
      .subscribe({
        next: (updatedTask) => {
          this.applyChecklistUpdate(updatedTask);
          this.toast.success(item.completed ? 'Item reaberto.' : 'Item concluído.');
          this.loadTaskCollaboration(updatedTask.id);
        },
        error: (error: unknown) => {
          this.checklistError.set(
            this.extractApiError(error, 'Não foi possível atualizar o item.'),
          );
        },
      });
  }

  removeChecklistItem(item: TaskChecklistItem): void {
    const task = this.selectedTask();

    if (!this.canWriteTasks() || !task || this.managingChecklist()) {
      return;
    }

    this.managingChecklist.set(true);
    this.checklistError.set(null);

    this.taskService
      .removeChecklistItem(task.id, item.id)
      .pipe(finalize(() => this.managingChecklist.set(false)))
      .subscribe({
        next: (updatedTask) => {
          this.applyChecklistUpdate(updatedTask);
          this.toast.success('Item removido da checklist.');
          this.loadTaskCollaboration(updatedTask.id);
        },
        error: (error: unknown) => {
          this.checklistError.set(this.extractApiError(error, 'Não foi possível remover o item.'));
        },
      });
  }

  private applyChecklistUpdate(updatedTask: TaskResponse): void {
    this.selectedTask.set(updatedTask);

    const board = this.kanban();

    if (!board) {
      return;
    }

    const totalChecklistItems = updatedTask.checklistItems.length;
    const completedChecklistItems = updatedTask.checklistItems.filter(
      (item) => item.completed,
    ).length;

    this.kanban.set({
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
          task.id === updatedTask.id
            ? { ...task, totalChecklistItems, completedChecklistItems }
            : task,
        ),
      })),
    });
  }

  addComment(): void {
    const taskId = this.selectedTaskId();

    if (!this.canWriteTasks() || taskId === null || this.managingComment()) {
      return;
    }

    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const content = this.commentForm.controls.content.value.trim();

    if (!content) {
      this.commentForm.controls.content.setErrors({ required: true });
      this.commentForm.controls.content.markAsTouched();
      return;
    }

    this.cancelCommentReply();
    this.managingComment.set(true);
    this.commentActionError.set(null);

    this.taskService
      .addComment(taskId, { content })
      .pipe(finalize(() => this.managingComment.set(false)))
      .subscribe({
        next: (collaboration) => {
          this.taskCollaboration.set(collaboration);
          this.commentForm.reset({ content: '' });
          this.toast.success('Comentário publicado com sucesso.');
        },
        error: (error: unknown) => {
          this.commentActionError.set(
            this.extractApiError(error, 'Não foi possível publicar o comentário.'),
          );
        },
      });
  }

  startCommentEdit(comment: TaskComment): void {
    if (!this.canWriteTasks() || !comment.canEdit || this.managingComment()) {
      return;
    }

    this.editingCommentId.set(comment.id);
    this.cancelCommentReply();
    this.commentPendingDeletionId.set(null);
    this.commentActionError.set(null);
    this.editCommentForm.reset({ content: comment.content });
  }

  startCommentReply(comment: TaskComment): void {
    if (!this.canWriteTasks() || this.managingComment()) {
      return;
    }

    this.editingCommentId.set(null);
    this.commentPendingDeletionId.set(null);
    this.replyingToCommentId.set(comment.id);
    this.commentActionError.set(null);
    this.replyCommentForm.reset({ content: '' });
  }

  cancelCommentReply(): void {
    if (this.managingComment()) {
      return;
    }

    this.replyingToCommentId.set(null);
    this.replyCommentForm.reset({ content: '' });
  }

  submitCommentReply(commentId: number): void {
    const taskId = this.selectedTaskId();

    if (
      !this.canWriteTasks() ||
      taskId === null ||
      this.replyingToCommentId() !== commentId ||
      this.managingComment()
    ) {
      return;
    }

    if (this.replyCommentForm.invalid) {
      this.replyCommentForm.markAllAsTouched();
      return;
    }

    const content = this.replyCommentForm.controls.content.value.trim();

    if (!content) {
      this.replyCommentForm.controls.content.setErrors({ required: true });
      this.replyCommentForm.controls.content.markAsTouched();
      return;
    }

    this.managingComment.set(true);
    this.commentActionError.set(null);

    this.taskService
      .addComment(taskId, { content, parentCommentId: commentId })
      .pipe(finalize(() => this.managingComment.set(false)))
      .subscribe({
        next: (collaboration) => {
          this.taskCollaboration.set(collaboration);
          this.replyingToCommentId.set(null);
          this.replyCommentForm.reset({ content: '' });
          this.toast.success('Resposta publicada com sucesso.');
        },
        error: (error: unknown) => {
          this.commentActionError.set(
            this.extractApiError(error, 'Não foi possível publicar a resposta.'),
          );
        },
      });
  }

  cancelCommentEdit(): void {
    if (this.managingComment()) {
      return;
    }

    this.editingCommentId.set(null);
    this.editCommentForm.reset({ content: '' });
  }

  submitCommentEdit(commentId: number): void {
    const taskId = this.selectedTaskId();

    if (
      !this.canWriteTasks() ||
      taskId === null ||
      this.editingCommentId() !== commentId ||
      this.managingComment()
    ) {
      return;
    }

    if (this.editCommentForm.invalid) {
      this.editCommentForm.markAllAsTouched();
      return;
    }

    const content = this.editCommentForm.controls.content.value.trim();

    if (!content) {
      this.editCommentForm.controls.content.setErrors({ required: true });
      this.editCommentForm.controls.content.markAsTouched();
      return;
    }

    this.managingComment.set(true);
    this.commentActionError.set(null);

    this.taskService
      .editComment(taskId, commentId, { content })
      .pipe(finalize(() => this.managingComment.set(false)))
      .subscribe({
        next: (collaboration) => {
          this.taskCollaboration.set(collaboration);
          this.editingCommentId.set(null);
          this.editCommentForm.reset({ content: '' });
          this.toast.success('Comentário atualizado com sucesso.');
        },
        error: (error: unknown) => {
          this.commentActionError.set(
            this.extractApiError(error, 'Não foi possível atualizar o comentário.'),
          );
        },
      });
  }

  requestCommentRemoval(comment: TaskComment): void {
    if (!this.canWriteTasks() || !comment.canDelete || this.managingComment()) {
      return;
    }

    this.editingCommentId.set(null);
    this.cancelCommentReply();
    this.commentPendingDeletionId.set(comment.id);
    this.commentActionError.set(null);
  }

  cancelCommentRemoval(): void {
    if (!this.managingComment()) {
      this.commentPendingDeletionId.set(null);
    }
  }

  confirmCommentRemoval(commentId: number): void {
    const taskId = this.selectedTaskId();

    if (
      !this.canWriteTasks() ||
      taskId === null ||
      this.commentPendingDeletionId() !== commentId ||
      this.managingComment()
    ) {
      return;
    }

    this.managingComment.set(true);
    this.commentActionError.set(null);

    this.taskService
      .removeComment(taskId, commentId)
      .pipe(finalize(() => this.managingComment.set(false)))
      .subscribe({
        next: (collaboration) => {
          this.taskCollaboration.set(collaboration);
          this.commentPendingDeletionId.set(null);
          this.toast.success('Comentário removido com sucesso.');
        },
        error: (error: unknown) => {
          this.commentActionError.set(
            this.extractApiError(error, 'Não foi possível remover o comentário.'),
          );
        },
      });
  }

  retryTaskCollaboration(): void {
    const taskId = this.selectedTaskId();

    if (taskId !== null) {
      this.loadTaskCollaboration(taskId);
    }
  }

  formatTaskPriority(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      URGENT: 'Urgente',
    };

    return labels[priority];
  }

  formatDescription(
    mode: 'create' | 'edit',
    textarea: HTMLTextAreaElement,
    format: MarkdownFormat,
  ): void {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.description
        : this.editTaskForm.controls.description;
    const value = control.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.slice(start, end);
    const replacements: Record<
      MarkdownFormat,
      { prefix: string; suffix: string; fallback: string }
    > = {
      bold: { prefix: '**', suffix: '**', fallback: 'texto em negrito' },
      italic: { prefix: '*', suffix: '*', fallback: 'texto em itálico' },
      heading: { prefix: '## ', suffix: '', fallback: 'Seção' },
      list: { prefix: '- ', suffix: '', fallback: 'item da lista' },
      checklist: { prefix: '- [ ] ', suffix: '', fallback: 'critério de aceite' },
      quote: { prefix: '> ', suffix: '', fallback: 'observação importante' },
      code: { prefix: '`', suffix: '`', fallback: 'código' },
      link: { prefix: '[', suffix: '](https://)', fallback: 'texto do link' },
    };
    const replacement = replacements[format];
    const content = selection || replacement.fallback;
    const inserted = `${replacement.prefix}${content}${replacement.suffix}`;

    control.setValue(`${value.slice(0, start)}${inserted}${value.slice(end)}`);
    control.markAsDirty();
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + replacement.prefix.length,
        start + replacement.prefix.length + content.length,
      );
    });
  }

  formatTaskDueDate(value: string | null): string {
    if (!value) return 'Sem prazo';

    const [year, month, day] = value.split('-');
    return day && month && year ? `${day}/${month}/${year}` : value;
  }

  formatTaskTimestamp(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  selectAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;

    if (
      !this.canWriteTasks() ||
      file === null ||
      this.managingAttachment() ||
      this.taskAttachments().length >= 10
    ) {
      input.value = '';
      return;
    }

    const allowedTypes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
    ]);

    if (file.size > 10 * 1024 * 1024) {
      this.attachmentActionError.set('O arquivo deve possuir no máximo 10 MB.');
      input.value = '';
      return;
    }

    if (!allowedTypes.has(file.type.toLowerCase())) {
      this.attachmentActionError.set(
        'Tipo não permitido. Use PDF, PNG, JPEG, WebP, TXT, JSON ou ZIP.',
      );
      input.value = '';
      return;
    }

    this.clearPendingAttachment();
    this.attachmentActionError.set(null);
    this.pendingAttachment.set(file);

    if (this.isImageContentType(file.type)) {
      this.pendingAttachmentThumbnailUrl.set(URL.createObjectURL(file));
    }

    input.value = '';
  }

  confirmAttachmentUpload(): void {
    const taskId = this.selectedTaskId();
    const file = this.pendingAttachment();

    if (!this.canWriteTasks() || taskId === null || !file || this.managingAttachment()) {
      return;
    }

    this.managingAttachment.set(true);
    this.attachmentActionError.set(null);

    this.taskService
      .uploadAttachment(taskId, file)
      .pipe(finalize(() => this.managingAttachment.set(false)))
      .subscribe({
        next: (attachments) => {
          this.taskAttachments.set(attachments);
          this.clearPendingAttachment();
          this.toast.success('Arquivo anexado com sucesso.');
          this.loadTaskCollaboration(taskId);
        },
        error: (error: unknown) => {
          this.attachmentActionError.set(
            this.extractApiError(error, 'Não foi possível anexar o arquivo.'),
          );
        },
      });
  }

  cancelPendingAttachment(): void {
    if (!this.managingAttachment()) {
      this.clearPendingAttachment();
      this.attachmentActionError.set(null);
    }
  }

  previewPendingAttachment(): void {
    const file = this.pendingAttachment();
    if (!file) return;

    void this.showAttachmentPreview(file, file.name);
  }

  previewAttachment(attachment: TaskAttachment): void {
    const taskId = this.selectedTaskId();
    if (taskId === null || this.previewingAttachmentId() !== null) return;

    this.previewingAttachmentId.set(attachment.id);
    this.attachmentActionError.set(null);

    this.taskService
      .downloadAttachment(taskId, attachment.id)
      .pipe(finalize(() => this.previewingAttachmentId.set(null)))
      .subscribe({
        next: (content) => void this.showAttachmentPreview(content, attachment.originalFileName),
        error: (error: unknown) => {
          this.attachmentActionError.set(
            this.extractApiError(error, 'Não foi possível visualizar o arquivo.'),
          );
        },
      });
  }

  closeAttachmentPreview(): void {
    const preview = this.attachmentPreview();
    if (preview) URL.revokeObjectURL(preview.objectUrl);
    this.attachmentPreview.set(null);
  }

  isImageContentType(contentType: string): boolean {
    return contentType.toLowerCase().startsWith('image/');
  }

  isPdfContentType(contentType: string): boolean {
    return contentType.toLowerCase() === 'application/pdf';
  }

  attachmentKind(contentType: string): string {
    if (this.isImageContentType(contentType)) return 'IMG';
    if (this.isPdfContentType(contentType)) return 'PDF';
    if (contentType.toLowerCase().includes('json')) return '{}';
    if (contentType.toLowerCase().startsWith('text/')) return 'TXT';
    return 'ZIP';
  }

  downloadAttachment(attachment: TaskAttachment): void {
    const taskId = this.selectedTaskId();
    if (taskId === null || this.downloadingAttachmentId() !== null) {
      return;
    }

    this.downloadingAttachmentId.set(attachment.id);
    this.attachmentActionError.set(null);

    this.taskService
      .downloadAttachment(taskId, attachment.id)
      .pipe(finalize(() => this.downloadingAttachmentId.set(null)))
      .subscribe({
        next: (content) => {
          const objectUrl = URL.createObjectURL(content);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = attachment.originalFileName;
          anchor.click();
          URL.revokeObjectURL(objectUrl);
        },
        error: (error: unknown) => {
          this.attachmentActionError.set(
            this.extractApiError(error, 'Não foi possível baixar o arquivo.'),
          );
        },
      });
  }

  requestAttachmentRemoval(attachment: TaskAttachment): void {
    if (!attachment.canDelete || this.managingAttachment()) {
      return;
    }

    this.attachmentPendingDeletionId.set(attachment.id);
    this.attachmentActionError.set(null);
  }

  cancelAttachmentRemoval(): void {
    if (!this.managingAttachment()) {
      this.attachmentPendingDeletionId.set(null);
    }
  }

  confirmAttachmentRemoval(attachmentId: number): void {
    const taskId = this.selectedTaskId();
    if (
      taskId === null ||
      this.attachmentPendingDeletionId() !== attachmentId ||
      this.managingAttachment()
    ) {
      return;
    }

    this.managingAttachment.set(true);
    this.attachmentActionError.set(null);

    this.taskService
      .removeAttachment(taskId, attachmentId)
      .pipe(finalize(() => this.managingAttachment.set(false)))
      .subscribe({
        next: (attachments) => {
          this.taskAttachments.set(attachments);
          this.attachmentPendingDeletionId.set(null);
          this.toast.success('Anexo removido com sucesso.');
          this.loadTaskCollaboration(taskId);
        },
        error: (error: unknown) => {
          this.attachmentActionError.set(
            this.extractApiError(error, 'Não foi possível remover o anexo.'),
          );
        },
      });
  }

  retryTaskAttachments(): void {
    const taskId = this.selectedTaskId();
    if (taskId !== null) {
      this.loadTaskAttachments(taskId);
    }
  }

  formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  closeCreateTaskForm(): void {
    if (this.creatingTask()) {
      return;
    }

    this.taskFormOpen.set(false);
    this.createDescriptionPreview.set(false);
    this.createTaskError.set(null);
  }

  openFilterPanel(): void {
    this.filterPanelOpen.set(true);
  }

  closeFilterPanel(): void {
    this.filterPanelOpen.set(false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleModalEscape(event: Event): void {
    if (this.attachmentPreview()) {
      event.preventDefault();
      this.closeAttachmentPreview();
      return;
    }

    if (this.taskFormOpen()) {
      event.preventDefault();
      this.closeCreateTaskForm();
      return;
    }

    if (this.filterPanelOpen()) {
      event.preventDefault();
      this.closeFilterPanel();
      return;
    }

    if (this.editingTask()) {
      event.preventDefault();
      this.cancelTaskEdit();
      return;
    }

    if (this.replyingToCommentId() !== null) {
      event.preventDefault();
      this.cancelCommentReply();
      return;
    }

    if (this.taskDetailsOpen()) {
      event.preventDefault();
      this.closeTaskDetails();
    }
  }

  submitCreateTask(): void {
    if (!this.canWriteTasks()) {
      return;
    }

    if (this.createTaskForm.invalid) {
      this.createTaskForm.markAllAsTouched();
      return;
    }

    const selectedBoard = this.selectedBoard();

    if (!selectedBoard) {
      this.createTaskError.set('Nenhum quadro foi selecionado.');

      return;
    }

    const formValue = this.createTaskForm.getRawValue();

    const normalizedTitle = formValue.title.trim();

    if (!normalizedTitle) {
      this.createTaskForm.controls.title.setErrors({
        required: true,
      });

      this.createTaskForm.controls.title.markAsTouched();

      return;
    }

    const request: CreateTaskRequest = {
      title: normalizedTitle,

      description: formValue.description.trim() || null,

      priority: formValue.priority,

      dueDate: formValue.dueDate || null,
      assigneeIds: formValue.assigneeIds,
      labelIds: formValue.labelIds,
      technologies: formValue.technologies,
    };

    this.creatingTask.set(true);
    this.createTaskError.set(null);

    this.taskService
      .create(formValue.columnId, request)
      .pipe(
        finalize(() => {
          this.creatingTask.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.taskFormOpen.set(false);
          this.toast.success('Tarefa criada com sucesso.');
          this.loadKanban(selectedBoard.id);
        },

        error: (error: unknown) => {
          this.createTaskError.set(
            this.extractApiError(error, 'Não foi possível criar a tarefa. Tente novamente.'),
          );
        },
      });
  }

  requestTaskArchive(): void {
    const task = this.selectedTask();

    if (
      !this.canWriteTasks() ||
      !task ||
      this.loadingTaskDetails() ||
      this.updatingTask() ||
      this.archivingTask()
    ) {
      return;
    }

    this.archiveTaskError.set(null);
    this.archiveConfirmationOpen.set(true);
  }

  cancelTaskArchive(): void {
    if (this.archivingTask()) {
      return;
    }

    this.archiveConfirmationOpen.set(false);
    this.archiveTaskError.set(null);
  }

  confirmTaskArchive(): void {
    if (!this.canWriteTasks()) {
      return;
    }

    const task = this.selectedTask();
    const board = this.selectedBoard();

    if (!task) {
      this.archiveTaskError.set('Nenhuma tarefa foi selecionada.');

      return;
    }

    this.archivingTask.set(true);
    this.archiveTaskError.set(null);

    this.taskService
      .archive(task.id)
      .pipe(
        finalize(() => {
          this.archivingTask.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.resetTaskDetails();

          this.toast.success('Tarefa arquivada com sucesso.');

          if (board) {
            this.loadKanban(board.id);
          }
        },

        error: (error: unknown) => {
          this.archiveTaskError.set(
            this.extractApiError(error, 'Não foi possível arquivar a tarefa.'),
          );
        },
      });
  }

  private extractApiError(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error;

    if (response && typeof response === 'object') {
      const apiError = response as Partial<ApiError>;

      const firstFieldError = Object.values(apiError.fields ?? {}).find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );

      if (firstFieldError) {
        return firstFieldError;
      }

      if (typeof apiError.message === 'string' && apiError.message.trim()) {
        return apiError.message;
      }
    }

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    return fallbackMessage;
  }

  openTaskDetails(taskId: number): void {
    this.moveTaskError.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);
    this.archiveConfirmationOpen.set(false);
    this.archiveTaskError.set(null);

    this.editingTask.set(false);
    this.updateTaskError.set(null);
    this.checklistItemForm.reset({ title: '' });
    this.checklistError.set(null);
    this.resetTaskCollaboration();
    this.resetTaskAttachments();

    this.taskDetailsOpen.set(true);
    this.selectedTaskId.set(taskId);
    this.updateNavigationState({
      projectId: this.selectedProject()?.id ?? null,

      boardId: this.selectedBoard()?.id ?? null,

      taskId,
    });
    this.selectedTask.set(null);
    this.taskDetailsError.set(null);
    this.loadingTaskDetails.set(true);
    this.loadTaskCollaboration(taskId);
    this.loadTaskAttachments(taskId);

    this.taskService
      .findById(taskId)
      .pipe(
        finalize(() => {
          this.loadingTaskDetails.set(false);
        }),
      )
      .subscribe({
        next: (task) => {
          this.selectedTask.set(task);
        },

        error: () => {
          this.taskDetailsError.set('Não foi possível carregar os detalhes da tarefa.');
        },
      });
  }

  retryTaskDetails(): void {
    const taskId = this.selectedTaskId();

    if (taskId !== null) {
      this.openTaskDetails(taskId);
    }
  }

  closeTaskDetails(): void {
    if (
      this.loadingTaskDetails() ||
      this.updatingTask() ||
      this.archivingTask() ||
      this.managingChecklist() ||
      this.managingComment() ||
      this.managingAttachment()
    ) {
      return;
    }
    this.taskDetailsOpen.set(false);
    this.selectedTaskId.set(null);
    this.selectedTask.set(null);
    this.taskDetailsError.set(null);

    this.editingTask.set(false);
    this.updateTaskError.set(null);
    this.checklistItemForm.reset({ title: '' });
    this.checklistError.set(null);
    this.resetTaskCollaboration();
    this.resetTaskAttachments();

    this.archiveConfirmationOpen.set(false);
    this.archiveTaskError.set(null);

    this.updateNavigationState({
      taskId: null,
    });
  }

  private loadPageData(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.projects.set([]);
    this.selectedProject.set(null);

    this.resetAssignableMembers();
    this.resetProjectLabels();
    this.resetFilters(false);

    this.boards.set([]);
    this.boardsLoadError.set(null);

    this.selectedBoard.set(null);

    this.kanban.set(null);
    this.kanbanReady = false;
    this.kanbanLoadError.set(null);

    this.projectService
      .findAll()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (projects) => {
          this.projects.set(projects);

          this.applyDeepLink(projects);
        },

        error: () => {
          this.loadError.set('Não foi possível carregar seus projetos. Tente novamente.');
        },
      });
  }

  private applyDeepLink(projects: readonly ProjectSummary[]): void {
    const projectId = this.readPositiveQueryParam('projectId');

    const boardId = this.readPositiveQueryParam('boardId');

    const taskId = this.readPositiveQueryParam('taskId');

    /*
     * Navegação comum.
     * Sem projectId o Kanban continua
     * exatamente com o comportamento atual.
     */
    if (projectId === null) {
      if (
        this.route.snapshot.queryParamMap.get('labels') ||
        this.route.snapshot.queryParamMap.get('labelMatch') ||
        this.route.snapshot.queryParamMap.get('priorities') ||
        this.route.snapshot.queryParamMap.get('assignees') ||
        this.route.snapshot.queryParamMap.get('due')
      ) {
        this.syncFiltersToUrl();
      }
      return;
    }

    const project = projects.find((currentProject) => currentProject.id === projectId);

    if (!project) {
      this.loadError.set('O projeto solicitado não está disponível no seu workspace.');

      return;
    }

    this.selectedProject.set(project);

    this.applyFiltersFromUrl();

    this.loadAssignableMembers(project);
    this.loadProjectLabels(project);

    this.loadBoards(project.id, boardId, taskId);
  }

  private loadBoards(
    projectId: number,
    requestedBoardId: number | null = null,
    requestedTaskId: number | null = null,
  ): void {
    this.loadingBoards.set(true);
    this.boardsLoadError.set(null);
    this.boards.set([]);

    this.projectService
      .findBoardsByProjectId(projectId)
      .pipe(
        finalize(() => {
          this.loadingBoards.set(false);
        }),
      )
      .subscribe({
        next: (boards) => {
          this.boards.set(boards);

          if (requestedBoardId === null) {
            const defaultBoard =
              boards.find((currentBoard) => currentBoard.defaultBoard) ?? boards[0];

            if (!defaultBoard) {
              return;
            }

            this.selectedBoard.set(defaultBoard);

            this.updateNavigationState({
              projectId,
              boardId: defaultBoard.id,
              taskId: null,
            });

            this.loadKanban(defaultBoard.id, requestedTaskId);

            return;
          }

          const board = boards.find((currentBoard) => currentBoard.id === requestedBoardId);

          if (!board) {
            this.boardsLoadError.set(
              'O quadro solicitado não pertence a este projeto ou não está disponível.',
            );

            return;
          }

          this.selectedBoard.set(board);

          this.loadKanban(board.id, requestedTaskId);
        },

        error: () => {
          this.boardsLoadError.set('Não foi possível carregar os quadros deste projeto.');
        },
      });
  }

  private loadAssignableMembers(project: ProjectSummary): void {
    this.resetAssignableMembers();

    if (project.membershipRole === 'VIEWER') {
      return;
    }

    this.loadingAssignableMembers.set(true);

    this.projectService
      .findMembersByProjectId(project.id)
      .pipe(
        finalize(() => {
          this.loadingAssignableMembers.set(false);
        }),
      )
      .subscribe({
        next: (members) => {
          if (this.selectedProject()?.id !== project.id) {
            return;
          }

          this.assignableMembers.set(members.filter((member) => member.role !== 'VIEWER'));
        },
        error: () => {
          if (this.selectedProject()?.id !== project.id) {
            return;
          }

          this.assignableMembersError.set('Não foi possível carregar os responsáveis disponíveis.');
        },
      });
  }

  private resetAssignableMembers(): void {
    this.assignableMembers.set([]);
    this.loadingAssignableMembers.set(false);
    this.assignableMembersError.set(null);
  }

  isTaskAssigneeSelected(mode: 'create' | 'edit', userId: number): boolean {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.assigneeIds
        : this.editTaskForm.controls.assigneeIds;
    return control.value.includes(userId);
  }

  isTaskAssigneeDisabled(mode: 'create' | 'edit', userId: number): boolean {
    if (this.isTaskAssigneeSelected(mode, userId)) return false;
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.assigneeIds
        : this.editTaskForm.controls.assigneeIds;
    return control.value.length >= 5;
  }

  toggleTaskAssignee(mode: 'create' | 'edit', userId: number): void {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.assigneeIds
        : this.editTaskForm.controls.assigneeIds;
    const selected = control.value;

    control.setValue(
      selected.includes(userId)
        ? selected.filter((currentId) => currentId !== userId)
        : this.isTaskAssigneeDisabled(mode, userId)
          ? selected
          : [...selected, userId],
    );
    control.markAsDirty();
  }

  isTaskLabelSelected(mode: 'create' | 'edit', labelId: number): boolean {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.labelIds
        : this.editTaskForm.controls.labelIds;
    return control.value.includes(labelId);
  }

  isTaskLabelDisabled(mode: 'create' | 'edit', labelId: number): boolean {
    if (this.isTaskLabelSelected(mode, labelId)) return false;
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.labelIds
        : this.editTaskForm.controls.labelIds;
    const archivedCount =
      mode === 'edit'
        ? (this.selectedTask()?.labels.filter((label) => label.archived).length ?? 0)
        : 0;
    return control.value.length >= 5 - archivedCount;
  }

  toggleTaskLabel(mode: 'create' | 'edit', labelId: number): void {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.labelIds
        : this.editTaskForm.controls.labelIds;
    const selected = control.value;

    if (selected.includes(labelId)) {
      control.setValue(selected.filter((currentId) => currentId !== labelId));
    } else if (!this.isTaskLabelDisabled(mode, labelId)) {
      control.setValue([...selected, labelId]);
    }

    control.markAsDirty();
  }

  isTaskTechnologySelected(mode: 'create' | 'edit', technology: TaskTechnology): boolean {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.technologies
        : this.editTaskForm.controls.technologies;
    return control.value.includes(technology);
  }

  isTaskTechnologyDisabled(mode: 'create' | 'edit', technology: TaskTechnology): boolean {
    if (this.isTaskTechnologySelected(mode, technology)) return false;
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.technologies
        : this.editTaskForm.controls.technologies;
    return control.value.length >= 8;
  }

  toggleTaskTechnology(mode: 'create' | 'edit', technology: TaskTechnology): void {
    const control =
      mode === 'create'
        ? this.createTaskForm.controls.technologies
        : this.editTaskForm.controls.technologies;
    const selected = control.value;

    control.setValue(
      selected.includes(technology)
        ? selected.filter((current) => current !== technology)
        : this.isTaskTechnologyDisabled(mode, technology)
          ? selected
          : [...selected, technology],
    );
    control.markAsDirty();
  }

  technologyOption(technology: TaskTechnology) {
    return this.technologyOptions.find((option) => option.value === technology)!;
  }

  openCreateProjectLabel(mode: 'create' | 'edit'): void {
    const project = this.selectedProject();
    if (!project || !this.canManageLabels()) return;

    this.openProjectLabelDialog({ mode: 'create', projectId: project.id }, mode);
  }

  openEditProjectLabel(label: ProjectLabel): void {
    const project = this.selectedProject();
    if (!project || !this.canManageLabels()) return;

    this.openProjectLabelDialog({ mode: 'edit', projectId: project.id, label });
  }

  isLabelFilterSelected(labelId: number): boolean {
    return this.selectedLabelFilterIds().includes(labelId);
  }

  private openProjectLabelDialog(
    data: ProjectLabelDialogData,
    selectInForm?: 'create' | 'edit',
  ): void {
    this.dialog
      .open<ProjectLabelDialogResult>(ProjectLabelDialogComponent, {
        data,
        ariaLabel:
          data.mode === 'create' ? 'Criar label do projeto' : `Editar a label ${data.label.name}`,
        panelClass: 'dt-dialog-panel',
        backdropClass: 'dt-dialog-backdrop',
      })
      .closed.pipe(take(1))
      .subscribe((result) => {
        if (!result || result.action === 'archived') return;

        this.projectLabels.update((labels) =>
          result.action === 'created'
            ? [...labels, result.label].sort((left, right) => left.name.localeCompare(right.name))
            : labels.map((label) => (label.id === result.label.id ? result.label : label)),
        );

        if (result.action === 'created' && selectInForm) {
          const control =
            selectInForm === 'create'
              ? this.createTaskForm.controls.labelIds
              : this.editTaskForm.controls.labelIds;

          if (!this.isTaskLabelDisabled(selectInForm, result.label.id)) {
            control.setValue([...control.value, result.label.id]);
            control.markAsDirty();
          }
        }

        this.toast.success(
          result.action === 'created'
            ? 'Label criada e adicionada à tarefa.'
            : 'Label atualizada com sucesso.',
        );
      });
  }

  toggleLabelFilter(labelId: number): void {
    const selectedIds = this.selectedLabelFilterIds();
    const nextIds = selectedIds.includes(labelId)
      ? selectedIds.filter((currentId) => currentId !== labelId)
      : [...selectedIds, labelId];

    this.selectedLabelFilterIds.set(nextIds);
    this.syncFiltersToUrl();
  }

  setLabelFilterMode(mode: LabelFilterMode): void {
    if (this.labelFilterMode() === mode) return;
    this.labelFilterMode.set(mode);
    this.syncFiltersToUrl();
  }

  clearLabelFilters(): void {
    this.selectedLabelFilterIds.set([]);
    this.labelFilterMode.set('ANY');
    this.syncFiltersToUrl();
  }

  isPriorityFilterSelected(priority: TaskPriority): boolean {
    return this.selectedPriorityFilters().includes(priority);
  }

  togglePriorityFilter(priority: TaskPriority): void {
    const selectedPriorities = this.selectedPriorityFilters();
    this.selectedPriorityFilters.set(
      selectedPriorities.includes(priority)
        ? selectedPriorities.filter((currentPriority) => currentPriority !== priority)
        : [...selectedPriorities, priority],
    );
    this.syncFiltersToUrl();
  }

  isAssigneeFilterSelected(assigneeId: number | null): boolean {
    return this.selectedAssigneeFilters().includes(assigneeId);
  }

  toggleAssigneeFilter(assigneeId: number | null): void {
    const selectedAssignees = this.selectedAssigneeFilters();
    this.selectedAssigneeFilters.set(
      selectedAssignees.includes(assigneeId)
        ? selectedAssignees.filter((currentId) => currentId !== assigneeId)
        : [...selectedAssignees, assigneeId],
    );
    this.syncFiltersToUrl();
  }

  updateDueDateFilter(event: Event): void {
    this.setDueDateFilter((event.target as HTMLSelectElement).value as DueDateFilter);
  }

  setDueDateFilter(filter: DueDateFilter): void {
    if (this.dueDateFilter() === filter) return;
    this.dueDateFilter.set(filter);
    this.syncFiltersToUrl();
  }

  clearAllFilters(): void {
    this.resetFilters();
  }

  private loadProjectLabels(project: ProjectSummary): void {
    this.resetProjectLabels();
    this.loadingProjectLabels.set(true);

    this.projectService
      .findLabelsByProjectId(project.id)
      .pipe(finalize(() => this.loadingProjectLabels.set(false)))
      .subscribe({
        next: (labels) => {
          if (this.selectedProject()?.id !== project.id) return;
          this.projectLabels.set(labels);
          this.projectLabelsReady = true;
          this.reconcileFilters();
        },
        error: () => {
          if (this.selectedProject()?.id === project.id) {
            this.projectLabelsError.set('Não foi possível carregar as labels disponíveis.');
            this.projectLabelsReady = true;
            this.reconcileFilters();
          }
        },
      });
  }

  private resetProjectLabels(): void {
    this.projectLabels.set([]);
    this.loadingProjectLabels.set(false);
    this.projectLabelsError.set(null);
    this.projectLabelsReady = false;
  }

  private loadKanban(
    boardId: number,
    requestedTaskId: number | null = null,
    preserveCurrentBoard = false,
  ): void {
    this.ensureRealtimeConnection(boardId);

    if (!preserveCurrentBoard) this.loadingKanban.set(true);
    this.kanbanLoadError.set(null);
    if (!preserveCurrentBoard) this.kanban.set(null);
    this.kanbanReady = false;

    this.kanbanService
      .findByBoardId(boardId)
      .pipe(
        finalize(() => {
          if (!preserveCurrentBoard) this.loadingKanban.set(false);
        }),
      )
      .subscribe({
        next: (kanban) => {
          if (this.selectedBoard()?.id !== boardId) return;

          this.kanban.set(kanban);
          this.kanbanReady = true;
          this.reconcileFilters();

          if (requestedTaskId === null) {
            return;
          }

          /*
           * Antes de buscar detalhes,
           * confirmamos que a tarefa
           * realmente pertence ao Kanban
           * carregado.
           */
          const taskExists = kanban.columns.some((column) =>
            column.tasks.some((task) => task.id === requestedTaskId),
          );

          if (!taskExists) {
            this.kanbanLoadError.set(
              'A tarefa solicitada não pertence a este quadro ou não está mais ativa.',
            );

            return;
          }

          this.openTaskDetails(requestedTaskId);
        },

        error: () => {
          if (this.selectedBoard()?.id !== boardId) return;

          this.kanbanReady = true;
          this.reconcileFilters();
          if (preserveCurrentBoard) {
            this.toast.warning(
              'Uma atualização em tempo real não pôde ser aplicada. Atualize o quadro.',
            );
          } else {
            this.kanbanLoadError.set('Não foi possível carregar o Kanban deste quadro.');
          }
        },
      });
  }

  private ensureRealtimeConnection(boardId: number): void {
    if (this.realtimeBoardId === boardId) return;

    this.disconnectRealtime();
    this.realtimeBoardId = boardId;
    this.stopRealtimeConnection = this.boardRealtimeService.connect(boardId, (event) => {
      this.handleRealtimeEvent(event);
    });
  }

  private handleRealtimeEvent(event: BoardRealtimeEvent): void {
    if (this.selectedBoard()?.id !== event.boardId) return;

    if (event.type === 'TASK_ARCHIVED' && this.selectedTaskId() === event.taskId) {
      this.closeTaskDetails();
    } else if (
      this.selectedTaskId() === event.taskId &&
      !this.editingTask() &&
      !this.updatingTask()
    ) {
      this.refreshSelectedTaskFromRealtime(event.taskId);
    }

    this.loadKanban(event.boardId, null, true);
  }

  private refreshSelectedTaskFromRealtime(taskId: number): void {
    this.taskService.findById(taskId).subscribe({
      next: (task) => {
        if (this.selectedTaskId() !== taskId) return;
        this.selectedTask.set(task);
        this.loadTaskCollaboration(taskId);
      },
    });
  }

  private disconnectRealtime(): void {
    this.stopRealtimeConnection?.();
    this.stopRealtimeConnection = null;
    this.realtimeBoardId = null;
  }

  private moveTaskLocally(
    board: KanbanBoard,
    taskId: number,
    sourceColumnId: number,
    targetColumnId: number,
    targetPosition: number,
  ): KanbanBoard {
    const sourceColumn = board.columns.find((column) => column.id === sourceColumnId);

    const targetColumn = board.columns.find((column) => column.id === targetColumnId);

    const movingTask = sourceColumn?.tasks.find((task) => task.id === taskId);

    if (!sourceColumn || !targetColumn || !movingTask) {
      return board;
    }

    /*
     * Primeiro retiramos a tarefa de sua coluna
     * original, sem modificar o array recebido.
     */
    const columnsWithoutTask = board.columns.map((column) => {
      if (column.id !== sourceColumnId) {
        return {
          ...column,
          tasks: [...column.tasks],
        };
      }

      return {
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      };
    });

    const updatedColumns = columnsWithoutTask.map((column) => {
      const tasks = [...column.tasks];

      if (column.id === targetColumnId) {
        const safePosition = Math.min(Math.max(targetPosition, 0), tasks.length);

        tasks.splice(safePosition, 0, movingTask);
      }

      /*
       * Recalculamos 0, 1, 2...
       * tanto na origem quanto no destino.
       */
      const reorderedTasks = tasks.map((task, position): KanbanTask => ({
        ...task,
        position,
      }));

      return {
        ...column,
        tasks: reorderedTasks,
      };
    });

    return {
      ...board,
      columns: updatedColumns,
    };
  }

  private refreshKanbanAfterMovement(boardId: number): void {
    this.kanbanService.findByBoardId(boardId).subscribe({
      next: (officialBoard) => {
        if (this.selectedBoard()?.id !== boardId) {
          return;
        }

        this.kanban.set(officialBoard);
      },

      error: () => {
        if (this.selectedBoard()?.id !== boardId) {
          return;
        }

        this.moveTaskError.set(
          'A tarefa foi movida, mas não foi possível sincronizar o quadro. Atualize a página.',
        );
      },
    });
  }

  private readPositiveQueryParam(name: string): number | null {
    const rawValue = this.route.snapshot.queryParamMap.get(name);

    if (!rawValue) {
      return null;
    }

    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return null;
    }

    return parsedValue;
  }

  private applyFiltersFromUrl(): void {
    const rawLabelIds = this.route.snapshot.queryParamMap.get('labels');
    const labelIds = rawLabelIds
      ? [
          ...new Set(
            rawLabelIds
              .split(',')
              .map((value) => Number(value))
              .filter((value) => Number.isInteger(value) && value > 0),
          ),
        ]
      : [];
    const rawMode = this.route.snapshot.queryParamMap.get('labelMatch')?.toLowerCase();
    const priorities = (this.route.snapshot.queryParamMap.get('priorities') ?? '')
      .split(',')
      .map((value) => value.toUpperCase())
      .filter((value): value is TaskPriority => this.priorities.includes(value as TaskPriority));
    const assignees = (this.route.snapshot.queryParamMap.get('assignees') ?? '')
      .split(',')
      .filter(Boolean)
      .map((value) => (value.toLowerCase() === 'none' ? null : Number(value)))
      .filter(
        (value): value is number | null => value === null || (Number.isInteger(value) && value > 0),
      );
    const rawDueDateFilter = this.route.snapshot.queryParamMap.get('due')?.toUpperCase();
    const dueDateFilter: DueDateFilter =
      rawDueDateFilter === 'OVERDUE' ||
      rawDueDateFilter === 'TODAY' ||
      rawDueDateFilter === 'NEXT_7_DAYS' ||
      rawDueDateFilter === 'NO_DATE'
        ? rawDueDateFilter
        : 'ALL';

    this.selectedLabelFilterIds.set(labelIds);
    this.labelFilterMode.set(rawMode === 'all' ? 'ALL' : 'ANY');
    this.selectedPriorityFilters.set([...new Set(priorities)]);
    this.selectedAssigneeFilters.set([...new Set(assignees)]);
    this.dueDateFilter.set(dueDateFilter);
  }

  private reconcileFilters(): void {
    if (!this.projectLabelsReady || !this.kanbanReady) return;

    const selectedLabelIds = this.selectedLabelFilterIds();
    const availableLabelIds = new Set(this.availableLabelFilters().map((label) => label.id));
    const validLabelIds = selectedLabelIds.filter((labelId) => availableLabelIds.has(labelId));
    const selectedAssignees = this.selectedAssigneeFilters();
    const availableAssignees = this.availableAssigneeFilters().map((assignee) => assignee.id);
    const validAssignees = selectedAssignees.filter((assigneeId) =>
      availableAssignees.includes(assigneeId),
    );
    const filtersChanged =
      validLabelIds.length !== selectedLabelIds.length ||
      validAssignees.length !== selectedAssignees.length;

    if (!filtersChanged) return;

    this.selectedLabelFilterIds.set(validLabelIds);
    this.selectedAssigneeFilters.set(validAssignees);
    this.syncFiltersToUrl();
  }

  private resetFilters(updateUrl = true): void {
    this.selectedLabelFilterIds.set([]);
    this.labelFilterMode.set('ANY');
    this.selectedPriorityFilters.set([]);
    this.selectedAssigneeFilters.set([]);
    this.dueDateFilter.set('ALL');

    if (updateUrl) this.syncFiltersToUrl();
  }

  private syncFiltersToUrl(): void {
    const selectedLabelIds = this.selectedLabelFilterIds();
    const selectedPriorities = this.selectedPriorityFilters();
    const selectedAssignees = this.selectedAssigneeFilters();
    this.updateNavigationState({
      labels: selectedLabelIds.length > 0 ? selectedLabelIds.join(',') : null,
      labelMatch: selectedLabelIds.length > 0 ? this.labelFilterMode().toLowerCase() : null,
      priorities: selectedPriorities.length > 0 ? selectedPriorities.join(',') : null,
      assignees:
        selectedAssignees.length > 0
          ? selectedAssignees.map((assigneeId) => assigneeId ?? 'none').join(',')
          : null,
      due: this.dueDateFilter() === 'ALL' ? null : this.dueDateFilter().toLowerCase(),
    });
  }

  private matchesDueDateFilter(
    dueDate: string | null,
    filter: DueDateFilter,
    today: string,
    nextSevenDays: string,
  ): boolean {
    if (filter === 'ALL') return true;
    if (filter === 'NO_DATE') return dueDate === null;
    if (dueDate === null) return false;
    if (filter === 'OVERDUE') return dueDate < today;
    if (filter === 'TODAY') return dueDate === today;
    return dueDate > today && dueDate <= nextSevenDays;
  }

  private toLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private updateNavigationState(queryParams: {
    projectId?: number | null;

    boardId?: number | null;

    taskId?: number | null;

    labels?: string | null;

    labelMatch?: string | null;

    priorities?: string | null;

    assignees?: string | null;

    due?: string | null;
  }): void {
    void this.router.navigate([], {
      relativeTo: this.route,

      queryParams,

      queryParamsHandling: 'merge',

      replaceUrl: true,
    });
  }

  private resetTaskDetails(): void {
    this.taskDetailsOpen.set(false);
    this.selectedTaskId.set(null);
    this.selectedTask.set(null);
    this.taskDetailsError.set(null);

    this.editingTask.set(false);
    this.updateTaskError.set(null);
    this.checklistItemForm.reset({ title: '' });
    this.checklistError.set(null);
    this.resetTaskCollaboration();
    this.resetTaskAttachments();

    this.archiveConfirmationOpen.set(false);
    this.archiveTaskError.set(null);
  }

  private loadTaskCollaboration(taskId: number): void {
    this.loadingTaskCollaboration.set(true);
    this.taskCollaborationError.set(null);

    this.taskService
      .findCollaboration(taskId)
      .pipe(
        finalize(() => {
          if (this.selectedTaskId() === taskId) {
            this.loadingTaskCollaboration.set(false);
          }
        }),
      )
      .subscribe({
        next: (collaboration) => {
          if (this.selectedTaskId() === taskId) {
            this.taskCollaboration.set(collaboration);
          }
        },
        error: (error: unknown) => {
          if (this.selectedTaskId() === taskId) {
            this.taskCollaborationError.set(
              this.extractApiError(error, 'Não foi possível carregar comentários e atividades.'),
            );
          }
        },
      });
  }

  private resetTaskCollaboration(): void {
    this.taskCollaboration.set(null);
    this.loadingTaskCollaboration.set(false);
    this.taskCollaborationError.set(null);
    this.managingComment.set(false);
    this.commentActionError.set(null);
    this.editingCommentId.set(null);
    this.replyingToCommentId.set(null);
    this.commentPendingDeletionId.set(null);
    this.commentForm.reset({ content: '' });
    this.editCommentForm.reset({ content: '' });
    this.replyCommentForm.reset({ content: '' });
  }

  private loadTaskAttachments(taskId: number): void {
    this.loadingTaskAttachments.set(true);
    this.taskAttachmentsError.set(null);

    this.taskService
      .findAttachments(taskId)
      .pipe(
        finalize(() => {
          if (this.selectedTaskId() === taskId) {
            this.loadingTaskAttachments.set(false);
          }
        }),
      )
      .subscribe({
        next: (attachments) => {
          if (this.selectedTaskId() === taskId) {
            this.taskAttachments.set(attachments);
          }
        },
        error: (error: unknown) => {
          if (this.selectedTaskId() === taskId) {
            this.taskAttachmentsError.set(
              this.extractApiError(error, 'Não foi possível carregar os anexos.'),
            );
          }
        },
      });
  }

  private resetTaskAttachments(): void {
    this.clearPendingAttachment();
    this.closeAttachmentPreview();
    this.taskAttachments.set([]);
    this.loadingTaskAttachments.set(false);
    this.taskAttachmentsError.set(null);
    this.managingAttachment.set(false);
    this.downloadingAttachmentId.set(null);
    this.attachmentActionError.set(null);
    this.attachmentPendingDeletionId.set(null);
    this.previewingAttachmentId.set(null);
  }

  private clearPendingAttachment(): void {
    const thumbnailUrl = this.pendingAttachmentThumbnailUrl();
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    this.pendingAttachmentThumbnailUrl.set(null);
    this.pendingAttachment.set(null);
  }

  private async showAttachmentPreview(content: Blob, name: string): Promise<void> {
    this.closeAttachmentPreview();
    const objectUrl = URL.createObjectURL(content);
    const textContent =
      content.type.startsWith('text/') || content.type === 'application/json'
        ? (await content.text()).slice(0, 100_000)
        : null;

    this.attachmentPreview.set({
      name,
      contentType: content.type,
      objectUrl,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
      textContent,
    });
  }
}
