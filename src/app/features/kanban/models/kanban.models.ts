import type {
  TaskLabel,
  TaskPriority,
  TaskTechnology,
  TaskUserSummary,
} from '../../tasks/models/task.models';

export type KanbanColumnCategory = 'BACKLOG' | 'TODO' | 'DOING' | 'REVIEW' | 'DONE';

export interface KanbanTask {
  readonly id: number;
  readonly title: string;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly position: number;
  readonly assignees: readonly TaskUserSummary[];
  readonly labels: readonly TaskLabel[];
  readonly technologies: readonly TaskTechnology[];
  readonly completedChecklistItems: number;
  readonly totalChecklistItems: number;
}

export interface KanbanColumn {
  readonly id: number;
  readonly name: string;
  readonly category: KanbanColumnCategory;
  readonly position: number;
  readonly tasks: readonly KanbanTask[];
}

export interface KanbanBoard {
  readonly id: number;
  readonly projectId: number;
  readonly name: string;
  readonly columns: readonly KanbanColumn[];
}
