import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { ApiError } from '../../../../core/http/api-error.model';
import {
  DtBadgeComponent,
  DtButtonDirective,
  DtFeedbackStateComponent,
} from '../../../../shared/ui';
import { BoardSummary, ProjectDetails as ProjectDetailsModel } from '../../models/project.models';
import { projectRoleLabel, projectRoleTone } from '../../presentation/project-role.presentation';
import { ProjectService } from '../../services/project.service';

type ProjectDetailsTab = 'overview' | 'boards';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [DatePipe, RouterLink, DtButtonDirective, DtBadgeComponent, DtFeedbackStateComponent],
  templateUrl: './project-details.component.html',
  styleUrl: './project-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();

  readonly projectId = signal<number | null>(null);
  readonly project = signal<ProjectDetailsModel | null>(null);
  readonly boards = signal<readonly BoardSummary[]>([]);
  readonly boardsLoadError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly activeTab = signal<ProjectDetailsTab>('overview');
  readonly projectRoleLabel = projectRoleLabel;
  readonly projectRoleTone = projectRoleTone;

  readonly tabs: readonly { readonly id: ProjectDetailsTab; readonly label: string }[] = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'boards', label: 'Quadros' },
  ];

  ngOnInit(): void {
    this.observeTab();

    combineLatest([
      this.route.paramMap.pipe(
        map((params) => this.parseProjectId(params.get('projectId'))),
        distinctUntilChanged(),
      ),
      this.reload.pipe(startWith(undefined)),
    ])
      .pipe(
        map(([projectId]) => projectId),
        switchMap((projectId) => this.loadProject(projectId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ project, boards }) => {
        this.project.set(project);
        this.boards.set(boards);
      });
  }

  retry(): void {
    this.reload.next();
  }

  selectTab(tab: ProjectDetailsTab): void {
    this.activeTab.set(tab);
    void this.writeTabToUrl(tab);
  }

  handleTabKeydown(event: KeyboardEvent, currentTab: ProjectDetailsTab): void {
    const currentIndex = this.tabs.findIndex((tab) => tab.id === currentTab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % this.tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.tabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = this.tabs[nextIndex].id;
    this.selectTab(nextTab);

    const tabList = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    tabList?.querySelector<HTMLElement>(`#project-tab-${nextTab}`)?.focus();
  }

  boardQueryParams(board: BoardSummary): { readonly projectId: number; readonly boardId: number } {
    return {
      projectId: board.projectId,
      boardId: board.id,
    };
  }

  private observeTab(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('tab')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tabValue) => {
        const tab = this.parseTab(tabValue);
        this.activeTab.set(tab);

        if (tabValue !== null && tabValue !== tab) {
          void this.writeTabToUrl(tab, true);
        }
      });
  }

  private loadProject(projectId: number | null) {
    this.projectId.set(projectId);
    this.project.set(null);
    this.boards.set([]);
    this.boardsLoadError.set(null);
    this.loadError.set(null);

    if (projectId === null) {
      this.loading.set(false);
      this.loadError.set('O identificador do projeto é inválido. Volte à lista e tente novamente.');
      return EMPTY;
    }

    this.loading.set(true);

    return forkJoin({
      project: this.projectService.findById(projectId),
      boards: this.projectService.findBoardsByProjectId(projectId).pipe(
        catchError((error: unknown) => {
          this.boardsLoadError.set(
            this.extractErrorMessage(error, 'Não foi possível carregar os quadros do projeto.'),
          );
          return of([] as readonly BoardSummary[]);
        }),
      ),
    }).pipe(
      catchError((error: unknown) => {
        this.loadError.set(
          this.extractErrorMessage(error, 'Não foi possível carregar os detalhes do projeto.'),
        );
        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private parseProjectId(rawProjectId: string | null): number | null {
    if (!rawProjectId) {
      return null;
    }

    const projectId = Number(rawProjectId);
    return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
  }

  private parseTab(rawTab: string | null): ProjectDetailsTab {
    return rawTab === 'boards' ? 'boards' : 'overview';
  }

  private writeTabToUrl(tab: ProjectDetailsTab, replaceUrl = false): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error as Partial<ApiError> | string | null;

    if (response && typeof response === 'object' && response.message?.trim()) {
      return response.message;
    }

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    if (error.status === 404) {
      return 'O projeto solicitado não foi encontrado ou não está disponível para sua conta.';
    }

    return fallbackMessage;
  }
}
