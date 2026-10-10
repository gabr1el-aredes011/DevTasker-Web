export type DashboardProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface DashboardTaskMetrics {
  readonly total: number;
  readonly active: number;
  readonly doing: number;
  readonly completed: number;
  readonly overdue: number;
}

export interface DashboardRecentProject {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;

  readonly membershipRole: DashboardProjectRole;

  readonly createdAt: string;
}

export interface DashboardWorkflow {
  readonly backlog: number;
  readonly todo: number;
  readonly doing: number;
  readonly review: number;
  readonly done: number;
}

export type DashboardTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface DashboardAttentionTask {
  readonly id: number;
  readonly title: string;

  readonly priority: DashboardTaskPriority;

  readonly dueDate: string | null;

  readonly columnName: string;

  readonly boardId: number;
  readonly boardName: string;

  readonly projectId: number;
  readonly projectName: string;

  readonly overdue: boolean;
}

export type DashboardActivityType =
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

export interface DashboardActivity {
  readonly id: number;
  readonly type: DashboardActivityType;
  readonly description: string;
  readonly createdAt: string;
  readonly actorId: number;
  readonly actorName: string;
  readonly actorProfileImageUrl: string | null;
  readonly taskId: number;
  readonly taskTitle: string;
  readonly boardId: number;
  readonly projectId: number;
  readonly projectName: string;
}

export interface DashboardSummary {
  readonly projectCount: number;
  readonly boardCount: number;

  readonly taskMetrics: DashboardTaskMetrics;

  readonly recentProjects: readonly DashboardRecentProject[];

  readonly attentionTasks: readonly DashboardAttentionTask[];

  readonly recentActivities: readonly DashboardActivity[];

  readonly workflow: DashboardWorkflow;
}
