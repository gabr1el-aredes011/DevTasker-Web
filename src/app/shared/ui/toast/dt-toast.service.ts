import { Injectable, signal } from '@angular/core';

import { DtToast, DtToastOptions, DtToastTone } from './dt-toast.models';

const DEFAULT_DURATION_BY_TONE: Readonly<Record<DtToastTone, number>> = {
  success: 4_000,
  info: 5_000,
  warning: 6_000,
  error: 7_000,
};

const EXIT_ANIMATION_DURATION_MS = 220;
const MAX_VISIBLE_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class DtToastService {
  private readonly autoDismissTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly removalTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = signal<readonly DtToast[]>([]);

  success(message: string, durationMs?: number): number {
    return this.show(message, { tone: 'success', durationMs });
  }

  error(message: string, durationMs?: number): number {
    return this.show(message, { tone: 'error', durationMs });
  }

  warning(message: string, durationMs?: number): number {
    return this.show(message, { tone: 'warning', durationMs });
  }

  info(message: string, durationMs?: number): number {
    return this.show(message, { tone: 'info', durationMs });
  }

  show(message: string, options: DtToastOptions = {}): number {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) return 0;

    const tone = options.tone ?? 'info';
    const durationMs = Math.max(1_000, options.durationMs ?? DEFAULT_DURATION_BY_TONE[tone]);
    const id = this.nextId++;
    const toast: DtToast = {
      id,
      message: normalizedMessage,
      tone,
      durationMs,
      state: 'visible',
    };

    const currentToasts = this.toasts();
    const overflow = Math.max(0, currentToasts.length - MAX_VISIBLE_TOASTS + 1);

    for (const staleToast of currentToasts.slice(0, overflow)) {
      this.removeImmediately(staleToast.id);
    }

    this.toasts.update((toasts) => [...toasts, toast]);
    this.autoDismissTimers.set(
      id,
      setTimeout(() => this.dismiss(id), durationMs),
    );

    return id;
  }

  dismiss(id: number): void {
    const toast = this.toasts().find((candidate) => candidate.id === id);

    if (!toast || toast.state === 'closing') return;

    this.clearAutoDismissTimer(id);
    this.toasts.update((toasts) =>
      toasts.map((candidate) =>
        candidate.id === id ? { ...candidate, state: 'closing' } : candidate,
      ),
    );
    this.removalTimers.set(
      id,
      setTimeout(() => this.removeImmediately(id), EXIT_ANIMATION_DURATION_MS),
    );
  }

  clear(): void {
    for (const id of this.autoDismissTimers.keys()) this.clearAutoDismissTimer(id);
    for (const timer of this.removalTimers.values()) clearTimeout(timer);
    this.removalTimers.clear();
    this.toasts.set([]);
  }

  private removeImmediately(id: number): void {
    this.clearAutoDismissTimer(id);

    const removalTimer = this.removalTimers.get(id);
    if (removalTimer) clearTimeout(removalTimer);
    this.removalTimers.delete(id);

    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private clearAutoDismissTimer(id: number): void {
    const timer = this.autoDismissTimers.get(id);
    if (timer) clearTimeout(timer);
    this.autoDismissTimers.delete(id);
  }
}
