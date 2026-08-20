import { ChangeDetectionStrategy, Component, HostBinding, input } from '@angular/core';

export type DtBadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'dt-badge',
  standalone: true,
  templateUrl: './dt-badge.component.html',
  styleUrl: './dt-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtBadgeComponent {
  readonly tone = input<DtBadgeTone>('neutral');

  @HostBinding('attr.data-tone')
  get toneAttribute(): DtBadgeTone {
    return this.tone();
  }
}
