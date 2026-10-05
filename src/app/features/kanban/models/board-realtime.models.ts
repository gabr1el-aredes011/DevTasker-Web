export type BoardRealtimeEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_MOVED'
  | 'TASK_ARCHIVED';

export type BoardRealtimeStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export interface BoardRealtimeEvent {
  readonly eventId: string;
  readonly boardId: number;
  readonly taskId: number;
  readonly actorUserId: number;
  readonly type: BoardRealtimeEventType;
  readonly occurredAt: string;
}
