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
        labelIds: [4, 7],
        technologies: ['JAVA'],
      })
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/columns/31/tasks`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body.assigneeId).toBe(3);
    expect(request.request.body.labelIds).toEqual([4, 7]);
    expect(request.request.body.technologies).toEqual(['JAVA']);
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
        labelIds: [],
        technologies: [],
      })
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/tasks/19`);

    expect(request.request.method).toBe('PUT');
    expect(request.request.body.assigneeId).toBeNull();
    expect(request.request.body.labelIds).toEqual([]);
    expect(request.request.body.technologies).toEqual([]);
    request.flush({});
  });

  it('should normalize collections omitted by an older API response', () => {
    let normalizedTechnologies: readonly string[] | undefined;
    let normalizedChecklistLength = -1;

    service.findById(19).subscribe((task) => {
      normalizedTechnologies = task.technologies;
      normalizedChecklistLength = task.checklistItems.length;
    });

    const request = http.expectOne(`${environment.apiUrl}/tasks/19`);
    request.flush({ id: 19, labels: [] });

    expect(normalizedTechnologies).toEqual([]);
    expect(normalizedChecklistLength).toBe(0);
  });

  it('should manage checklist items through task-scoped endpoints', () => {
    service.addChecklistItem(19, { title: 'Validar publicação' }).subscribe();

    const createRequest = http.expectOne(`${environment.apiUrl}/tasks/19/checklist-items`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ title: 'Validar publicação' });
    createRequest.flush({});

    service
      .updateChecklistItem(19, 8, { title: 'Validar publicação', completed: true })
      .subscribe();

    const updateRequest = http.expectOne(`${environment.apiUrl}/tasks/19/checklist-items/8`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body.completed).toBe(true);
    updateRequest.flush({});

    service.removeChecklistItem(19, 8).subscribe();

    const deleteRequest = http.expectOne(`${environment.apiUrl}/tasks/19/checklist-items/8`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({});
  });

  it('should load and manage task collaboration through task-scoped endpoints', () => {
    service.findCollaboration(19).subscribe();

    const collaborationRequest = http.expectOne(`${environment.apiUrl}/tasks/19/collaboration`);
    expect(collaborationRequest.request.method).toBe('GET');
    collaborationRequest.flush({ comments: [], activities: [] });

    service.addComment(19, { content: 'Contexto da entrega.' }).subscribe();

    const createRequest = http.expectOne(`${environment.apiUrl}/tasks/19/comments`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ content: 'Contexto da entrega.' });
    createRequest.flush({ comments: [], activities: [] });

    service.editComment(19, 4, { content: 'Contexto atualizado.' }).subscribe();

    const editRequest = http.expectOne(`${environment.apiUrl}/tasks/19/comments/4`);
    expect(editRequest.request.method).toBe('PATCH');
    expect(editRequest.request.body).toEqual({ content: 'Contexto atualizado.' });
    editRequest.flush({ comments: [], activities: [] });

    service.removeComment(19, 4).subscribe();

    const removeRequest = http.expectOne(`${environment.apiUrl}/tasks/19/comments/4`);
    expect(removeRequest.request.method).toBe('DELETE');
    removeRequest.flush({ comments: [], activities: [] });
  });

  it('should manage task attachments through task-scoped endpoints', () => {
    service.findAttachments(19).subscribe();

    const listRequest = http.expectOne(`${environment.apiUrl}/tasks/19/attachments`);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([]);

    const file = new File(['conteúdo'], 'evidencia.txt', { type: 'text/plain' });
    service.uploadAttachment(19, file).subscribe();

    const uploadRequest = http.expectOne(`${environment.apiUrl}/tasks/19/attachments`);
    expect(uploadRequest.request.method).toBe('POST');
    expect(uploadRequest.request.body).toBeInstanceOf(FormData);
    expect((uploadRequest.request.body as FormData).get('file')).toBe(file);
    uploadRequest.flush([]);

    service.downloadAttachment(19, 5).subscribe();

    const downloadRequest = http.expectOne(`${environment.apiUrl}/tasks/19/attachments/5/download`);
    expect(downloadRequest.request.method).toBe('GET');
    expect(downloadRequest.request.responseType).toBe('blob');
    downloadRequest.flush(new Blob(['conteúdo']));

    service.removeAttachment(19, 5).subscribe();

    const removeRequest = http.expectOne(`${environment.apiUrl}/tasks/19/attachments/5`);
    expect(removeRequest.request.method).toBe('DELETE');
    removeRequest.flush([]);
  });
});
