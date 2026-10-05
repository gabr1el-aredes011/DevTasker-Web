import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DtToastService } from './dt-toast.service';

@Component({
  selector: 'dt-toast-region',
  standalone: true,
  templateUrl: './dt-toast-region.component.html',
  styleUrl: './dt-toast-region.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtToastRegionComponent {
  readonly toastService = inject(DtToastService);

  iconFor(tone: 'success' | 'error' | 'warning' | 'info'): string {
    switch (tone) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '△';
      case 'info':
        return 'i';
    }
  }
}
