import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { parseTaskMarkdown } from './task-markdown.parser';
import { TaskMarkdownSegment } from './task-markdown.models';

@Component({
  selector: 'dt-task-markdown',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './task-markdown.component.html',
  styleUrl: './task-markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskMarkdownComponent {
  readonly source = input.required<string>();
  readonly blocks = computed(() => parseTaskMarkdown(this.source()));

  protected readonly renderSegments = (segments: readonly TaskMarkdownSegment[]) => segments;
}
