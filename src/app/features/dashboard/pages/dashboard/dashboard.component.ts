import { DatePipe } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { RecentActivityComponent } from '../../components/recent-activity/recent-activity.component';

import {
  DashboardProjectRole,
  DashboardSummary,
  DashboardTaskPriority,
} from '../../models/dashboard.models';

import { DashboardService } from '../../services/dashboard.service';

type WorkspacePulseTone = 'danger' | 'warning' | 'active' | 'stable' | 'loading';

interface WorkspacePulse {
  readonly tone: WorkspacePulseTone;
  readonly status: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,

  imports: [RouterLink, DatePipe, RecentActivityComponent],

  templateUrl: './dashboard.component.html',

  styleUrl: './dashboard.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);

  private readonly dashboardService = inject(DashboardService);

  readonly currentUser = this.authService.currentUser;

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly summary = signal<DashboardSummary | null>(null);

  readonly firstName = computed(() => {
    const name = this.currentUser()?.name?.trim();

    if (!name) {
      return 'Dev';
    }

    return name.split(/\s+/).filter(Boolean)[0] ?? 'Dev';
  });

  readonly completionRate = computed(() => {
    const metrics = this.summary()?.taskMetrics;

    if (!metrics || metrics.total === 0) {
      return 0;
    }

    return Math.round((metrics.completed / metrics.total) * 100);
  });

  readonly workspacePulse = computed<WorkspacePulse>(() => {
    const summary = this.summary();

    if (!summary) {
      return {
        tone: 'loading',
        status: 'Sincronizando telemetria',
        title: 'Lendo o workspace',
        description: 'Projetos, fluxo e riscos serão consolidados em instantes.',
      };
    }

    if (summary.taskMetrics.overdue > 0) {
      return {
        tone: 'danger',
        status: 'Intervenção recomendada',
        title: 'Risco de prazo detectado',
        description: `${summary.taskMetrics.overdue} ${
          summary.taskMetrics.overdue === 1 ? 'tarefa vencida precisa' : 'tarefas vencidas precisam'
        } de atenção.`,
      };
    }

    if (summary.attentionTasks.length > 0) {
      return {
        tone: 'warning',
        status: 'Prioridades monitoradas',
        title: 'Decisões em foco',
        description: `${summary.attentionTasks.length} ${
          summary.attentionTasks.length === 1 ? 'item está' : 'itens estão'
        } no radar operacional.`,
      };
    }

    if (summary.taskMetrics.active > 0) {
      return {
        tone: 'active',
        status: 'Fluxo em movimento',
        title: 'Operação saudável',
        description: `${summary.taskMetrics.active} ${
          summary.taskMetrics.active === 1 ? 'tarefa ativa avança' : 'tarefas ativas avançam'
        } sem riscos de prazo.`,
      };
    }

    return {
      tone: 'stable',
      status: 'Workspace em ordem',
      title: 'Tudo sob controle',
      description: 'Nenhuma pendência operacional exige uma ação imediata.',
    };
  });

  readonly workflowItems = computed(() => {
    const workflow = this.summary()?.workflow;

    if (!workflow) {
      return [];
    }

    const items = [
      {
        key: 'backlog',
        label: 'Backlog',
        count: workflow.backlog,
      },
      {
        key: 'todo',
        label: 'A Fazer',
        count: workflow.todo,
      },
      {
        key: 'doing',
        label: 'Em desenvolvimento',
        count: workflow.doing,
      },
      {
        key: 'review',
        label: 'Em revisão',
        count: workflow.review,
      },
      {
        key: 'done',
        label: 'Concluído',
        count: workflow.done,
      },
    ] as const;

    const maximum = Math.max(...items.map((item) => item.count), 1);

    return items.map((item) => ({
      ...item,

      percentage: Math.round((item.count / maximum) * 100),
    }));
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  retry(): void {
    this.loadDashboard();
  }

  formatMembershipRole(role: DashboardProjectRole): string {
    switch (role) {
      case 'OWNER':
        return 'Proprietário';

      case 'ADMIN':
        return 'Administrador';

      case 'MEMBER':
        return 'Membro';

      case 'VIEWER':
        return 'Visualizador';

      default:
        return role;
    }
  }

  formatTaskPriority(priority: DashboardTaskPriority): string {
    switch (priority) {
      case 'URGENT':
        return 'Urgente';

      case 'HIGH':
        return 'Alta';

      case 'MEDIUM':
        return 'Média';

      case 'LOW':
        return 'Baixa';

      default:
        return priority;
    }
  }

  attentionTaskLabel(overdue: boolean): string {
    return overdue ? 'Prazo vencido' : 'Alta prioridade';
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.dashboardService
      .getSummary()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
        },

        error: (error: unknown) => {
          this.summary.set(null);

          this.loadError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Não foi possível conectar ' + 'ao servidor do DevTasker.';
    }

    return 'Não foi possível carregar ' + 'a visão geral do workspace.';
  }
}
