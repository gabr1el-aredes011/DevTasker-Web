import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { KanbanBoard, KanbanColumn } from '../../models/kanban.models';

interface BoardPhaseSnapshot {
  readonly category: KanbanColumn['category'];
  readonly label: string;
  readonly count: number;
  readonly percentage: number;
}

interface AssigneeWorkloadSnapshot {
  readonly id: number;
  readonly name: string;
  readonly taskCount: number;
  readonly urgentCount: number;
  readonly percentage: number;
}

interface BoardOperationalPulse {
  readonly total: number;
  readonly active: number;
  readonly completed: number;
  readonly overdue: number;
  readonly unassigned: number;
  readonly completionPercentage: number;
  readonly phases: readonly BoardPhaseSnapshot[];
  readonly workloads: readonly AssigneeWorkloadSnapshot[];
}

@Component({
  selector: 'app-board-intelligence',
  standalone: true,
  templateUrl: './board-intelligence.component.html',
  styleUrl: './board-intelligence.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardIntelligenceComponent {
  readonly board = input.required<KanbanBoard>();

  readonly pulse = computed<BoardOperationalPulse>(() => {
    const tasks = this.board().columns.flatMap((column) =>
      column.tasks.map((task) => ({ task, category: column.category })),
    );
    const today = this.toLocalDateKey(new Date());
    const total = tasks.length;
    const completed = tasks.filter(({ category }) => category === 'DONE').length;
    const active = tasks.filter(({ category }) =>
      ['TODO', 'DOING', 'REVIEW'].includes(category),
    ).length;
    const overdue = tasks.filter(
      ({ task, category }) => category !== 'DONE' && task.dueDate !== null && task.dueDate < today,
    ).length;
    const unassigned = tasks.filter(
      ({ task, category }) => category !== 'DONE' && task.assigneeId === null,
    ).length;
    const categoryLabels: Readonly<Record<KanbanColumn['category'], string>> = {
      BACKLOG: 'Backlog',
      TODO: 'A fazer',
      DOING: 'Em desenvolvimento',
      REVIEW: 'Em revisão',
      DONE: 'Concluído',
    };
    const categoryOrder: readonly KanbanColumn['category'][] = [
      'BACKLOG',
      'TODO',
      'DOING',
      'REVIEW',
      'DONE',
    ];
    const phases = categoryOrder.map((category) => {
      const count = tasks.filter((entry) => entry.category === category).length;

      return {
        category,
        label: categoryLabels[category],
        count,
        percentage: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    });
    const workloadsByAssignee = new Map<
      number,
      { name: string; taskCount: number; urgentCount: number }
    >();

    for (const { task, category } of tasks) {
      if (category === 'DONE' || task.assigneeId === null) continue;

      const workload = workloadsByAssignee.get(task.assigneeId) ?? {
        name: task.assigneeName ?? `Usuário #${task.assigneeId}`,
        taskCount: 0,
        urgentCount: 0,
      };
      workload.taskCount += 1;
      if (task.priority === 'URGENT') workload.urgentCount += 1;
      workloadsByAssignee.set(task.assigneeId, workload);
    }

    const orderedWorkloads = [...workloadsByAssignee.entries()]
      .map(([id, workload]) => ({ id, ...workload }))
      .sort(
        (left, right) =>
          right.taskCount - left.taskCount ||
          right.urgentCount - left.urgentCount ||
          left.name.localeCompare(right.name),
      );
    const largestWorkload = orderedWorkloads[0]?.taskCount ?? 0;

    return {
      total,
      active,
      completed,
      overdue,
      unassigned,
      completionPercentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      phases,
      workloads: orderedWorkloads.slice(0, 4).map((workload) => ({
        ...workload,
        percentage:
          largestWorkload === 0 ? 0 : Math.round((workload.taskCount / largestWorkload) * 100),
      })),
    };
  });

  private toLocalDateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }
}
