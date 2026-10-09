import type { ProjectLabelColor } from '../../projects/models/project.models';
import {
  siAngular,
  siCss,
  siDocker,
  siDotnet,
  siGo,
  siHtml5,
  siJavascript,
  siKotlin,
  siNodedotjs,
  siOpenjdk,
  siPhp,
  siPostgresql,
  siPython,
  siReact,
  siRust,
  siSpring,
  siSwift,
  siTypescript,
  siVuedotjs,
} from 'simple-icons';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskTechnology =
  | 'ANGULAR'
  | 'REACT'
  | 'VUE'
  | 'TYPESCRIPT'
  | 'JAVASCRIPT'
  | 'HTML'
  | 'CSS'
  | 'JAVA'
  | 'SPRING'
  | 'KOTLIN'
  | 'PYTHON'
  | 'NODEJS'
  | 'CSHARP'
  | 'DOTNET'
  | 'PHP'
  | 'GO'
  | 'RUST'
  | 'SWIFT'
  | 'SQL'
  | 'DOCKER';

export interface TaskTechnologyOption {
  readonly value: TaskTechnology;
  readonly label: string;
  readonly path: string;
  readonly color: string;
}

export const TASK_TECHNOLOGY_OPTIONS: readonly TaskTechnologyOption[] = [
  { value: 'ANGULAR', label: 'Angular', path: siAngular.path, color: '#dd2a7b' },
  { value: 'REACT', label: 'React', path: siReact.path, color: `#${siReact.hex}` },
  { value: 'VUE', label: 'Vue', path: siVuedotjs.path, color: `#${siVuedotjs.hex}` },
  {
    value: 'TYPESCRIPT',
    label: 'TypeScript',
    path: siTypescript.path,
    color: `#${siTypescript.hex}`,
  },
  {
    value: 'JAVASCRIPT',
    label: 'JavaScript',
    path: siJavascript.path,
    color: `#${siJavascript.hex}`,
  },
  { value: 'HTML', label: 'HTML', path: siHtml5.path, color: `#${siHtml5.hex}` },
  { value: 'CSS', label: 'CSS', path: siCss.path, color: `#${siCss.hex}` },
  { value: 'JAVA', label: 'Java', path: siOpenjdk.path, color: '#f89820' },
  { value: 'SPRING', label: 'Spring', path: siSpring.path, color: `#${siSpring.hex}` },
  { value: 'KOTLIN', label: 'Kotlin', path: siKotlin.path, color: `#${siKotlin.hex}` },
  { value: 'PYTHON', label: 'Python', path: siPython.path, color: `#${siPython.hex}` },
  { value: 'NODEJS', label: 'Node.js', path: siNodedotjs.path, color: `#${siNodedotjs.hex}` },
  { value: 'CSHARP', label: 'C#', path: siDotnet.path, color: `#${siDotnet.hex}` },
  { value: 'DOTNET', label: '.NET', path: siDotnet.path, color: `#${siDotnet.hex}` },
  { value: 'PHP', label: 'PHP', path: siPhp.path, color: `#${siPhp.hex}` },
  { value: 'GO', label: 'Go', path: siGo.path, color: `#${siGo.hex}` },
  { value: 'RUST', label: 'Rust', path: siRust.path, color: '#dea584' },
  { value: 'SWIFT', label: 'Swift', path: siSwift.path, color: `#${siSwift.hex}` },
  { value: 'SQL', label: 'SQL', path: siPostgresql.path, color: `#${siPostgresql.hex}` },
  { value: 'DOCKER', label: 'Docker', path: siDocker.path, color: `#${siDocker.hex}` },
];

export interface TaskLabel {
  readonly id: number;
  readonly name: string;
  readonly color: ProjectLabelColor;
  readonly archived: boolean;
}

export interface CreateTaskRequest {
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly assigneeId: number | null;
  readonly labelIds: readonly number[];
  readonly technologies: readonly TaskTechnology[];
}

export interface UpdateTaskRequest {
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly assigneeId: number | null;
  readonly labelIds: readonly number[];
  readonly technologies: readonly TaskTechnology[];
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
  readonly parentCommentId?: number | null;
}

export interface TaskComment {
  readonly id: number;
  readonly content: string;
  readonly author: TaskUserSummary;
  readonly parentCommentId?: number | null;
  readonly replyToAuthor?: TaskUserSummary | null;
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
  readonly labels: readonly TaskLabel[];
  readonly technologies: readonly TaskTechnology[];
  readonly checklistItems: readonly TaskChecklistItem[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
