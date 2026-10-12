import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'dt-dialog-frame',
  standalone: true,
  templateUrl: './dt-dialog-frame.component.html',
  styleUrl: './dt-dialog-frame.component.scss',
  host: {
    '[class.dt-dialog-frame--wide]': "size() === 'wide'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtDialogFrameComponent {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly tone = input<'default' | 'danger'>('default');
  readonly size = input<'default' | 'wide'>('default');
  readonly dismiss = output<void>();
}
