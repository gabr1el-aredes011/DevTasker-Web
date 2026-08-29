import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'dt-field',
  standalone: true,
  templateUrl: './dt-field.component.html',
  styleUrl: './dt-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtFieldComponent {
  readonly label = input.required<string>();
  readonly forId = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input(false);
  readonly counter = input<string | null>(null);

  readonly messageId = computed(() => `${this.forId()}-message`);
}
