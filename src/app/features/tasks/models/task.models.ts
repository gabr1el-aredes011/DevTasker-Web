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

export type TaskActivityType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_MOVED'
  | 'TASK_ARCHIVED'
  | 'CHECKLIST_ITEM_ADDED'
  | 'CHECKLIST_ITEM_UPDATED'
  | 'CHECKLIST_ITEM_REMOVED'
  | 'COMMENT_ADDED'
  | 'COMMENT_EDITED'
  | 'COMMENT_REMOVED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED';

export interface TaskAttachment {
  readonly id: number;
  readonly originalFileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly uploader: TaskUserSummary;
  readonly canDelete: boolean;
  readonly createdAt: string;
}

export interface TaskCommentRequest {
  readonly content: string;
}

export interface TaskComment {
  readonly id: number;
  readonly content: string;
  readonly author: TaskUserSummary;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly edited: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaskActivity {
  readonly id: number;
  readonly type: TaskActivityType;
  readonly description: string;
  readonly actor: TaskUserSummary;
  readonly createdAt: string;
}

export interface TaskCollaboration {
  readonly comments: readonly TaskComment[];
  readonly activities: readonly TaskActivity[];
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
