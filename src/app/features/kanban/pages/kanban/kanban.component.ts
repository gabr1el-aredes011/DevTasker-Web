import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateTaskRequest,
  TaskPriority,
  TaskResponse,
  UpdateTaskRequest,
  MoveTaskRequest,
} from '../../../tasks/models/task.models';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { KanbanBoard, KanbanColumn, KanbanTask } from '../../models/kanban.models';
import { KanbanService } from '../../services/kanban.service';
import { TaskService } from '../../../tasks/services/task.service';
import { ApiError } from '../../../../core/http/api-error.model';
import { BoardSummary, ProjectSummary } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [ReactiveFormsModule, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly kanbanService = inject(KanbanService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly projects = signal<readonly ProjectSummary[]>([]);

  readonly selectedProject = signal<ProjectSummary | null>(null);

  readonly boards = signal<readonly BoardSummary[]>([]);

  readonly selectedBoard = signal<BoardSummary | null>(null);

  readonly kanban = signal<KanbanBoard | null>(null);

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly loadingBoards = signal(false);

  readonly boardsLoadError = signal<string | null>(null);

  readonly loadingKanban = signal(false);

  readonly kanbanLoadError = signal<string | null>(null);

  readonly taskFormOpen = signal(false);
  readonly creatingTask = signal(false);

  readonly createTaskError = signal<string | null>(null);

  readonly taskDetailsOpen = signal(false);

  readonly selectedTaskId = signal<number | null>(null);

  readonly selectedTask = signal<TaskResponse | null>(null);

  readonly loadingTaskDetails = signal(false);

  readonly taskDetailsError = signal<string | null>(null);

  readonly editingTask = signal(false);
  readonly updatingTask = signal(false);

  readonly updateTaskError = signal<string | null>(null);

  readonly updateTaskSuccess = signal<string | null>(null);

  readonly priorities: readonly TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  readonly createTaskForm = this.formBuilder.nonNullable.group({
    columnId: [0, [Validators.required, Validators.min(1)]],

    title: ['', [Validators.required]],

    description: [''],

    priority: ['MEDIUM' as TaskPriority, [Validators.required]],

    dueDate: [''],
  });

  readonly editTaskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],

    description: [''],

    priority: ['MEDIUM' as TaskPriority, [Validators.required]],

    dueDate: [''],
  });

  readonly archiveConfirmationOpen = signal(false);
  readonly archivingTask = signal(false);

  readonly archiveTaskError = signal<string | null>(null);

  readonly archiveTaskSuccess = signal<string | null>(null);

  readonly movingTask = signal(false);

  readonly moveTaskError = signal<string | null>(null);

  readonly moveTaskSuccess = signal<string | null>(null);

  readonly taskMovementDisabled = computed(
    () =>
      this.loadingKanban() ||
      this.movingTask() ||
      this.creatingTask() ||
      this.updatingTask() ||
      this.archivingTask() ||
      this.taskFormOpen() ||
      this.taskDetailsOpen(),
  );

  ngOnInit(): void {
    this.loadPageData();
  }

  retry(): void {
    this.loadPageData();
  }

  selectProject(project: ProjectSummary): void {
    this.selectedProject.set(project);

    this.selectedBoard.set(null);
    this.kanban.set(null);
    this.kanbanLoadError.set(null);

    this.moveTaskError.set(null);
    this.moveTaskSuccess.set(null);

    this.updateNavigationState({
      projectId: project.id,
      boardId: null,
      taskId: null,
    });

    this.loadBoards(project.id);
  }

  backToProjects(): void {
    this.selectedProject.set(null);

    this.boards.set([]);
    this.boardsLoadError.set(null);

    this.selectedBoard.set(null);

    this.kanban.set(null);
    this.kanbanLoadError.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);

    this.resetTaskDetails();

    this.archiveTaskSuccess.set(null);

    this.moveTaskError.set(null);
    this.moveTaskSuccess.set(null);

    this.updateNavigationState({
      projectId: null,
      boardId: null,
      taskId: null,
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
    this.moveTaskSuccess.set(null);

    this.updateNavigationState({
      projectId: this.selectedProject()?.id ?? null,

      boardId: board.id,

      taskId: null,
    });

    this.loadKanban(board.id);
  }

  backToBoards(): void {
    this.selectedBoard.set(null);

    this.kanban.set(null);
    this.kanbanLoadError.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);

    this.archiveTaskSuccess.set(null);

    this.resetTaskDetails();

    this.moveTaskError.set(null);
    this.moveTaskSuccess.set(null);

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
    this.moveTaskSuccess.set(null);
    this.archiveTaskSuccess.set(null);

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

          this.moveTaskSuccess.set('Tarefa movida com sucesso.');

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
    const board = this.kanban();
    const firstColumn = board?.columns[0];

    if (!firstColumn) {
      return;
    }

    this.closeTaskDetails();

    this.createTaskError.set(null);
    this.archiveTaskSuccess.set(null);

    this.moveTaskError.set(null);
    this.moveTaskSuccess.set(null);

    this.createTaskForm.reset({
      columnId: firstColumn.id,
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
    });
    this.taskFormOpen.set(true);
  }

  startTaskEdit(): void {
    const task = this.selectedTask();

    if (!task || this.loadingTaskDetails()) {
      return;
    }

    this.updateTaskError.set(null);
    this.updateTaskSuccess.set(null);

    this.editTaskForm.reset({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    });

    this.editingTask.set(true);
  }

  cancelTaskEdit(): void {
    if (this.updatingTask()) {
      return;
    }

    this.editingTask.set(false);
    this.updateTaskError.set(null);
  }

  submitTaskUpdate(): void {
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
    };

    this.updatingTask.set(true);
    this.updateTaskError.set(null);
    this.updateTaskSuccess.set(null);

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

          this.updateTaskSuccess.set('Tarefa atualizada com sucesso.');

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

  closeCreateTaskForm(): void {
    if (this.creatingTask()) {
      return;
    }

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);
  }

  submitCreateTask(): void {
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

    if (!task || this.loadingTaskDetails() || this.updatingTask() || this.archivingTask()) {
      return;
    }

    this.archiveTaskError.set(null);
    this.archiveTaskSuccess.set(null);
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
    const task = this.selectedTask();
    const board = this.selectedBoard();

    if (!task) {
      this.archiveTaskError.set('Nenhuma tarefa foi selecionada.');

      return;
    }

    this.archivingTask.set(true);
    this.archiveTaskError.set(null);
    this.archiveTaskSuccess.set(null);

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

          this.archiveTaskSuccess.set('Tarefa arquivada com sucesso.');

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
    this.moveTaskSuccess.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);
    this.archiveConfirmationOpen.set(false);
    this.archiveTaskError.set(null);
    this.archiveTaskSuccess.set(null);

    this.editingTask.set(false);
    this.updateTaskError.set(null);
    this.updateTaskSuccess.set(null);

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
    if (this.loadingTaskDetails() || this.updatingTask() || this.archivingTask()) {
      return;
    }
    this.taskDetailsOpen.set(false);
    this.selectedTaskId.set(null);
    this.selectedTask.set(null);
    this.taskDetailsError.set(null);

    this.editingTask.set(false);
    this.updateTaskError.set(null);
    this.updateTaskSuccess.set(null);

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

    this.boards.set([]);
    this.boardsLoadError.set(null);

    this.selectedBoard.set(null);

    this.kanban.set(null);
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
      return;
    }

    const project = projects.find((currentProject) => currentProject.id === projectId);

    if (!project) {
      this.loadError.set('O projeto solicitado não está disponível no seu workspace.');

      return;
    }

    this.selectedProject.set(project);

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

          /*
           * Se não existe boardId na URL,
           * paramos aqui normalmente.
           */
          if (requestedBoardId === null) {
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

  private loadKanban(boardId: number, requestedTaskId: number | null = null): void {
    this.loadingKanban.set(true);
    this.kanbanLoadError.set(null);
    this.kanban.set(null);

    this.kanbanService
      .findByBoardId(boardId)
      .pipe(
        finalize(() => {
          this.loadingKanban.set(false);
        }),
      )
      .subscribe({
        next: (kanban) => {
          this.kanban.set(kanban);

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
          this.kanbanLoadError.set('Não foi possível carregar o Kanban deste quadro.');
        },
      });
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

        this.moveTaskSuccess.set(null);

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

  private updateNavigationState(queryParams: {
    projectId?: number | null;

    boardId?: number | null;

    taskId?: number | null;
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
    this.updateTaskSuccess.set(null);

    this.archiveConfirmationOpen.set(false);
    this.archiveTaskError.set(null);
  }
}
