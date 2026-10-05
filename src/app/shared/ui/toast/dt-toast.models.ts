export type DtToastTone = 'success' | 'error' | 'warning' | 'info';

export type DtToastState = 'visible' | 'closing';

export interface DtToast {
  readonly id: number;
  readonly message: string;
  readonly tone: DtToastTone;
  readonly durationMs: number;
  readonly state: DtToastState;
}

export interface DtToastOptions {
  readonly tone?: DtToastTone;
  readonly durationMs?: number;
}
