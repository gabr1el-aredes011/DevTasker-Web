import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreateTaskRequest,
  TaskPriority,
  TaskResponse,
} from '../../../tasks/models/task.models';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  finalize,
  forkJoin,
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { KanbanBoard } from '../../models/kanban.models';
import { KanbanService } from '../../services/kanban.service';
import { TaskService } from '../../../tasks/services/task.service';
import { ApiError } from '../../../../core/http/api-error.model';
import {
  BoardSummary,
  ProjectSummary,
} from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly kanbanService = inject(KanbanService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly taskService = inject(TaskService);

  readonly currentUser = this.authService.currentUser;

  readonly projects =
    signal<readonly ProjectSummary[]>([]);

  readonly selectedProject =
    signal<ProjectSummary | null>(null);

  readonly boards =
    signal<readonly BoardSummary[]>([]);

  readonly selectedBoard =
    signal<BoardSummary | null>(null);

  readonly kanban =
    signal<KanbanBoard | null>(null);

  readonly loading = signal(true);

  readonly loadError =
    signal<string | null>(null);

  readonly loadingBoards = signal(false);

  readonly boardsLoadError =
    signal<string | null>(null);

  readonly loadingKanban = signal(false);

  readonly kanbanLoadError =
    signal<string | null>(null);

  readonly taskFormOpen = signal(false);
  readonly creatingTask = signal(false);

  readonly createTaskError =
    signal<string | null>(null);

  readonly taskDetailsOpen = signal(false);

  readonly selectedTaskId =
    signal<number | null>(null);

  readonly selectedTask =
    signal<TaskResponse | null>(null);

  readonly loadingTaskDetails = signal(false);

  readonly taskDetailsError =
    signal<string | null>(null);

  readonly priorities: readonly TaskPriority[] = [
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT',
  ];

  readonly createTaskForm =
    this.formBuilder.nonNullable.group({
      columnId: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

      title: [
        '',
        [
          Validators.required,
        ],
      ],

      description: [''],

      priority: [
        'MEDIUM' as TaskPriority,
        [
          Validators.required,
        ],
      ],

      dueDate: [''],
    });

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
  }

  retryBoards(): void {
    const project = this.selectedProject();

    if (project) {
      this.loadBoards(project.id);
    }
  }

  selectBoard(board: BoardSummary): void {
    this.selectedBoard.set(board);
    this.loadKanban(board.id);
  }

  backToBoards(): void {
    this.selectedBoard.set(null);
    this.kanban.set(null);
    this.kanbanLoadError.set(null);

    this.taskFormOpen.set(false);
    this.createTaskError.set(null);
    this.resetTaskDetails();
  }

  retryKanban(): void {
    const board = this.selectedBoard();

    if (board) {
      this.loadKanban(board.id);
    }
  }
  openCreateTaskForm(): void {
    const board = this.kanban();
    const firstColumn = board?.columns[0];

    if (!firstColumn) {
      return;
    }

    this.closeTaskDetails();

    this.createTaskError.set(null);

    this.createTaskForm.reset({
      columnId: firstColumn.id,
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
    });

    this.taskFormOpen.set(true);
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
      this.createTaskError.set(
        'Nenhum quadro foi selecionado.',
      );

      return;
    }

    const formValue =
      this.createTaskForm.getRawValue();

    const normalizedTitle =
      formValue.title.trim();

    if (!normalizedTitle) {
      this.createTaskForm.controls.title.setErrors({
        required: true,
      });

      this.createTaskForm.controls.title.markAsTouched();

      return;
    }

    const request: CreateTaskRequest = {
      title: normalizedTitle,

      description:
        formValue.description.trim() || null,

      priority: formValue.priority,

      dueDate:
        formValue.dueDate || null,
    };

    this.creatingTask.set(true);
    this.createTaskError.set(null);

    this.taskService
      .create(
        formValue.columnId,
        request,
      )
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
            this.extractTaskCreationError(error),
          );
        }
      });
  }

  private extractTaskCreationError(
    error: unknown,
  ): string {
    if (error instanceof HttpErrorResponse) {
      const response =
        error.error as Partial<ApiError>;

      const firstFieldError = Object.values(
        response.fields ?? {},
      )[0];

      if (firstFieldError) {
        return firstFieldError;
      }

      if (response.message) {
        return response.message;
      }
    }

    return 'Não foi possível criar a tarefa. Tente novamente.';
  }

  openTaskDetails(taskId: number): void {
    this.taskFormOpen.set(false);
    this.createTaskError.set(null);

    this.taskDetailsOpen.set(true);
    this.selectedTaskId.set(taskId);
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
          this.taskDetailsError.set(
            'Não foi possível carregar os detalhes da tarefa.',
          );
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
    if (this.loadingTaskDetails()) {
      return;
    }

    this.taskDetailsOpen.set(false);
    this.selectedTaskId.set(null);
    this.selectedTask.set(null);
    this.taskDetailsError.set(null);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
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

    forkJoin({
      user: this.authService.loadCurrentUser(),
      projects: this.projectService.findAll(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: ({ projects }) => {
          this.projects.set(projects);
        },

        error: () => {
          this.loadError.set(
            'Não foi possível carregar seus projetos. Tente novamente.',
          );
        },
      });
  }

  private loadBoards(projectId: number): void {
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
        },

        error: () => {
          this.boardsLoadError.set(
            'Não foi possível carregar os quadros deste projeto.',
          );
        },
      });
  }

  private loadKanban(boardId: number): void {
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
        },

        error: () => {
          this.kanbanLoadError.set(
            'Não foi possível carregar o Kanban deste quadro.',
          );
        },
      });
  }

  private resetTaskDetails(): void {
    this.taskDetailsOpen.set(false);
    this.selectedTaskId.set(null);
    this.selectedTask.set(null);
    this.taskDetailsError.set(null);
  }

}