import { ChangeDetectionStrategy, Component, HostBinding, computed, input } from '@angular/core';

export type DtFeedbackState = 'loading' | 'empty' | 'error';

@Component({
  selector: 'dt-feedback-state',
  standalone: true,
  templateUrl: './dt-feedback-state.component.html',
  styleUrl: './dt-feedback-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtFeedbackStateComponent {
  readonly state = input.required<DtFeedbackState>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly headingLevel = input<1 | 2 | 3>(2);

  readonly role = computed(() => (this.state() === 'error' ? 'alert' : 'status'));
  readonly ariaLive = computed(() => (this.state() === 'error' ? 'assertive' : 'polite'));

  @HostBinding('attr.data-state')
  get stateAttribute(): DtFeedbackState {
    return this.state();
  }
}
