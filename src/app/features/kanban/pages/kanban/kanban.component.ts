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
import {
  BoardSummary,
  ProjectSummary,
} from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  readonly projects =
    signal<readonly ProjectSummary[]>([]);

  readonly selectedProject =
    signal<ProjectSummary | null>(null);

  readonly boards =
    signal<readonly BoardSummary[]>([]);

  readonly loading = signal(true);

  readonly loadError =
    signal<string | null>(null);

  readonly loadingBoards = signal(false);

  readonly boardsLoadError =
    signal<string | null>(null);

  ngOnInit(): void {
    this.loadPageData();
  }

  retry(): void {
    this.loadPageData();
  }

  selectProject(project: ProjectSummary): void {
    this.selectedProject.set(project);
    this.loadBoards(project.id);
  }

  backToProjects(): void {
    this.selectedProject.set(null);
    this.boards.set([]);
    this.boardsLoadError.set(null);
  }

  retryBoards(): void {
    const project = this.selectedProject();

    if (project) {
      this.loadBoards(project.id);
    }
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
}