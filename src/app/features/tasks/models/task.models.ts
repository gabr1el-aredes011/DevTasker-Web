export type TaskPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

export interface CreateTaskRequest {
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
}

export interface TaskUserSummary {
  readonly id: number;
  readonly name: string;
  readonly profileImageUrl: string | null;
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
  readonly createdAt: string;
  readonly updatedAt: string;
}