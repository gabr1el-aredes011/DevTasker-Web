export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CreateTaskRequest {
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly assigneeId: number | null;
  readonly labels: readonly string[];
}

export interface UpdateTaskRequest {
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly assigneeId: number | null;
  readonly labels: readonly string[];
}

export interface MoveTaskRequest {
  readonly targetColumnId: number;
  readonly targetPosition: number;
}

export interface TaskUserSummary {
  readonly id: number;
  readonly name: string;
  readonly profileImageUrl: string | null;
}

export interface TaskChecklistItem {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
  readonly position: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTaskChecklistItemRequest {
  readonly title: string;
}

export interface UpdateTaskChecklistItemRequest {
  readonly title: string;
  readonly completed: boolean;
}

export interface TaskResponse {
  readonly id: number;
  readonly columnId: number;
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly position: number;
  readonly creator: TaskUserSummary;
  readonly assignee: TaskUserSummary | null;
  readonly labels: readonly string[];
  readonly checklistItems: readonly TaskChecklistItem[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
