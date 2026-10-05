import { inject, Injectable, InjectionToken, signal } from '@angular/core';

import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { environment } from '../../../../environments/environment';
import {
  BoardRealtimeEvent,
  BoardRealtimeEventType,
  BoardRealtimeStatus,
} from '../models/board-realtime.models';

type RealtimeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const BOARD_REALTIME_FETCH = new InjectionToken<RealtimeFetch>('BOARD_REALTIME_FETCH', {
  providedIn: 'root',
  factory: () => globalThis.fetch.bind(globalThis),
});

const EVENT_TYPES: readonly BoardRealtimeEventType[] = [
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_MOVED',
  'TASK_ARCHIVED',
];

@Injectable({ providedIn: 'root' })
export class BoardRealtimeService {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly fetchRequest = inject(BOARD_REALTIME_FETCH);

  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionVersion = 0;
  private reconnectAttempt = 0;

  readonly status = signal<BoardRealtimeStatus>('disconnected');

  connect(boardId: number, onEvent: (event: BoardRealtimeEvent) => void): () => void {
    this.disconnect();
    const connectionVersion = this.connectionVersion;

    void this.open(boardId, onEvent, connectionVersion);

    return () => {
      if (connectionVersion === this.connectionVersion) this.disconnect();
    };
  }

  disconnect(): void {
    this.connectionVersion += 1;
    this.abortController?.abort();
    this.abortController = null;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.status.set('disconnected');
  }

  private async open(
    boardId: number,
    onEvent: (event: BoardRealtimeEvent) => void,
    connectionVersion: number,
  ): Promise<void> {
    if (connectionVersion !== this.connectionVersion) return;

    const token = this.tokenStorage.token();
    if (!token) {
      this.status.set('disconnected');
      return;
    }

    this.status.set(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting');
    const abortController = new AbortController();
    this.abortController = abortController;

    try {
      const response = await this.fetchRequest(
        `${environment.apiUrl}/boards/${boardId}/events`,
        {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: abortController.signal,
        },
      );

      if (response.status === 401 || response.status === 403) {
        this.status.set('disconnected');
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`Não foi possível abrir o stream do quadro (${response.status}).`);
      }

      this.status.set('connected');
      this.reconnectAttempt = 0;
      await this.consume(response.body, onEvent, connectionVersion);

      if (!abortController.signal.aborted) {
        this.scheduleReconnect(boardId, onEvent, connectionVersion);
      }
    } catch (error: unknown) {
      if (
        connectionVersion !== this.connectionVersion ||
        abortController.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return;
      }

      this.scheduleReconnect(boardId, onEvent, connectionVersion);
    }
  }

  private async consume(
    stream: ReadableStream<Uint8Array>,
    onEvent: (event: BoardRealtimeEvent) => void,
    connectionVersion: number,
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (connectionVersion === this.connectionVersion) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replaceAll('\r\n', '\n');

      let frameBoundary = buffer.indexOf('\n\n');
      while (frameBoundary >= 0) {
        const frame = buffer.slice(0, frameBoundary);
        buffer = buffer.slice(frameBoundary + 2);
        this.processFrame(frame, onEvent);
        frameBoundary = buffer.indexOf('\n\n');
      }
    }

    reader.releaseLock();
  }

  private processFrame(frame: string, onEvent: (event: BoardRealtimeEvent) => void): void {
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }

    if (eventName !== 'board-change' || dataLines.length === 0) return;

    try {
      const event = JSON.parse(dataLines.join('\n')) as Partial<BoardRealtimeEvent>;
      if (!this.isBoardRealtimeEvent(event)) return;
      onEvent(event);
    } catch {
      // Um frame inválido é ignorado sem encerrar a conexão saudável.
    }
  }

  private isBoardRealtimeEvent(
    event: Partial<BoardRealtimeEvent>,
  ): event is BoardRealtimeEvent {
    return (
      typeof event.eventId === 'string' &&
      typeof event.boardId === 'number' &&
      typeof event.taskId === 'number' &&
      typeof event.actorUserId === 'number' &&
      typeof event.occurredAt === 'string' &&
      EVENT_TYPES.includes(event.type as BoardRealtimeEventType)
    );
  }

  private scheduleReconnect(
    boardId: number,
    onEvent: (event: BoardRealtimeEvent) => void,
    connectionVersion: number,
  ): void {
    if (connectionVersion !== this.connectionVersion) return;

    this.reconnectAttempt += 1;
    this.status.set('reconnecting');
    const delayMs = Math.min(30_000, 1_000 * 2 ** (this.reconnectAttempt - 1));

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.open(boardId, onEvent, connectionVersion);
    }, delayMs);
  }
}
