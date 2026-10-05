import { TestBed } from '@angular/core/testing';

import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { BOARD_REALTIME_FETCH, BoardRealtimeService } from './board-realtime.service';

describe('BoardRealtimeService', () => {
  const tokenStorage = { token: vi.fn(() => 'jwt-token') };
  const fetchRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        BoardRealtimeService,
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: BOARD_REALTIME_FETCH, useValue: fetchRequest },
      ],
    });
  });

  it('should authenticate the stream and publish valid board events', async () => {
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
    });
    fetchRequest.mockResolvedValue(new Response(stream, { status: 200 }));
    const service = TestBed.inject(BoardRealtimeService);
    const onEvent = vi.fn();

    const disconnect = service.connect(12, onEvent);
    streamController!.enqueue(
      encoder.encode(
        'event:board-change\n' +
          'data:{"eventId":"event-1","boardId":12,"taskId":19,"actorUserId":3,"type":"TASK_MOVED","occurredAt":"2026-10-05T20:00:00Z"}\n\n',
      ),
    );

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledOnce());

    expect(fetchRequest).toHaveBeenCalledWith(
      'http://localhost:8080/api/boards/12/events',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      }),
    );
    expect(service.status()).toBe('connected');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ boardId: 12, taskId: 19, type: 'TASK_MOVED' }),
    );

    disconnect();
  });

  it('should stop without reconnecting after an authorization failure', async () => {
    fetchRequest.mockResolvedValue(new Response(null, { status: 403 }));
    const service = TestBed.inject(BoardRealtimeService);

    service.connect(12, vi.fn());

    await vi.waitFor(() => expect(service.status()).toBe('disconnected'));
    expect(fetchRequest).toHaveBeenCalledOnce();
  });
});
