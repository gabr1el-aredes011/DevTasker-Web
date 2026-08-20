import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { ProjectService } from '../../../projects/services/project.service';
import { TaskService } from '../../../tasks/services/task.service';
import { KanbanService } from '../../services/kanban.service';
import { KanbanComponent } from './kanban.component';

describe('KanbanComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanComponent],
      providers: [
        { provide: ProjectService, useValue: { findAll: vi.fn().mockReturnValue(of([])) } },
        { provide: KanbanService, useValue: {} },
        { provide: TaskService, useValue: {} },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: vi.fn().mockReturnValue(null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(KanbanComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(KanbanComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });
});
