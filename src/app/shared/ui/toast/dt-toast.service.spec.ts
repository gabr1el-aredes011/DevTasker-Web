import { TestBed } from '@angular/core/testing';

import { DtToastService } from './dt-toast.service';

describe('DtToastService', () => {
  let service: DtToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(DtToastService);
    service.clear();
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
  });

  it('should publish and automatically remove a success toast after its exit animation', () => {
    service.success('  Tarefa movida com sucesso.  ', 1_000);

    expect(service.toasts()).toEqual([
      expect.objectContaining({
        message: 'Tarefa movida com sucesso.',
        tone: 'success',
        state: 'visible',
      }),
    ]);

    vi.advanceTimersByTime(1_000);
    expect(service.toasts()[0].state).toBe('closing');

    vi.advanceTimersByTime(220);
    expect(service.toasts()).toEqual([]);
  });

  it('should allow a toast to be dismissed before its automatic timeout', () => {
    const id = service.warning('Prazo próximo.');

    service.dismiss(id);

    expect(service.toasts()[0].state).toBe('closing');

    vi.advanceTimersByTime(220);
    expect(service.toasts()).toEqual([]);
  });

  it('should ignore empty messages and limit the visible queue', () => {
    expect(service.info('   ')).toBe(0);

    for (let index = 1; index <= 5; index += 1) {
      service.info(`Mensagem ${index}`);
    }

    expect(service.toasts().map((toast) => toast.message)).toEqual([
      'Mensagem 2',
      'Mensagem 3',
      'Mensagem 4',
      'Mensagem 5',
    ]);
  });
});
