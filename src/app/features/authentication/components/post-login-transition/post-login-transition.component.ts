import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-post-login-transition',
  templateUrl: './post-login-transition.component.html',
  styleUrl: './post-login-transition.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostLoginTransitionComponent implements OnInit, OnDestroy {
  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  readonly completed = output<void>();
  readonly departing = signal(false);
  readonly orbitTiles = Array.from({ length: 28 }, (_, index) => index);
  readonly satelliteTiles = Array.from({ length: 12 }, (_, index) => index);

  ngOnInit(): void {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const departureDelay = reducedMotion ? 320 : 2350;
    const completionDelay = reducedMotion ? 480 : 2950;

    this.timers.push(
      setTimeout(() => this.departing.set(true), departureDelay),
      setTimeout(() => this.completed.emit(), completionDelay),
    );
  }

  ngOnDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
  }
}
