import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DashboardActivity,
  DashboardActivityType,
} from '../../models/dashboard.models';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentActivityComponent {
  readonly activities = input.required<readonly DashboardActivity[]>();

  activityTone(type: DashboardActivityType): 'flow' | 'collaboration' | 'asset' | 'execution' {
    if (type === 'TASK_MOVED' || type === 'TASK_CREATED' || type === 'TASK_UPDATED') {
      return 'flow';
    }

    if (type.startsWith('COMMENT')) {
      return 'collaboration';
    }

    if (type.startsWith('ATTACHMENT')) {
      return 'asset';
    }

    return 'execution';
  }
}
