import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'dt-dialog-frame',
  standalone: true,
  templateUrl: './dt-dialog-frame.component.html',
  styleUrl: './dt-dialog-frame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtDialogFrameComponent {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly tone = input<'default' | 'danger'>('default');
  readonly dismiss = output<void>();
}
