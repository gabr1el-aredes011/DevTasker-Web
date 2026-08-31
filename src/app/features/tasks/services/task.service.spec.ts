import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should send the assignee when creating a task', () => {
    service
      .create(31, {
        title: 'Preparar publicação',
        description: null,
        priority: 'HIGH',
        dueDate: null,
        assigneeId: 3,
      })
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/columns/31/tasks`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body.assigneeId).toBe(3);
    request.flush({});
  });

  it('should allow clearing the assignee while updating a task', () => {
    service
      .update(19, {
        title: 'Preparar publicação',
        description: null,
        priority: 'MEDIUM',
        dueDate: null,
        assigneeId: null,
      })
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/tasks/19`);

    expect(request.request.method).toBe('PUT');
    expect(request.request.body.assigneeId).toBeNull();
    request.flush({});
  });
});
