import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateTaskRequest,
  CreateTaskChecklistItemRequest,
  TaskAttachment,
  TaskCollaboration,
  TaskCommentRequest,
  TaskResponse,
  UpdateTaskRequest,
  UpdateTaskChecklistItemRequest,
  MoveTaskRequest,
} from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly http = inject(HttpClient);

  findById(
    taskId: number,
  ): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(
      `${environment.apiUrl}/tasks/${taskId}`,
    );
  }

  create(
    columnId: number,
    request: CreateTaskRequest,
  ): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(
      `${environment.apiUrl}/columns/${columnId}/tasks`,
      request,
    );
  }

  update(
    taskId: number,
    request: UpdateTaskRequest,
  ): Observable<TaskResponse> {
    return this.http.put<TaskResponse>(
      `${environment.apiUrl}/tasks/${taskId}`,
      request,
    );
  }

  archive(taskId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/tasks/${taskId}`,
    );
  }

  move(
    taskId: number,
    request: MoveTaskRequest,
  ): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(
      `${environment.apiUrl}/tasks/${taskId}/move`,
      request,
    );
  }

  addChecklistItem(
    taskId: number,
    request: CreateTaskChecklistItemRequest,
  ): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(
      `${environment.apiUrl}/tasks/${taskId}/checklist-items`,
      request,
    );
  }

  updateChecklistItem(
    taskId: number,
    itemId: number,
    request: UpdateTaskChecklistItemRequest,
  ): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(
      `${environment.apiUrl}/tasks/${taskId}/checklist-items/${itemId}`,
      request,
    );
  }

  removeChecklistItem(taskId: number, itemId: number): Observable<TaskResponse> {
    return this.http.delete<TaskResponse>(
      `${environment.apiUrl}/tasks/${taskId}/checklist-items/${itemId}`,
    );
  }

  findCollaboration(taskId: number): Observable<TaskCollaboration> {
    return this.http.get<TaskCollaboration>(
      `${environment.apiUrl}/tasks/${taskId}/collaboration`,
    );
  }

  addComment(taskId: number, request: TaskCommentRequest): Observable<TaskCollaboration> {
    return this.http.post<TaskCollaboration>(
      `${environment.apiUrl}/tasks/${taskId}/comments`,
      request,
    );
  }

  editComment(
    taskId: number,
    commentId: number,
    request: TaskCommentRequest,
  ): Observable<TaskCollaboration> {
    return this.http.patch<TaskCollaboration>(
      `${environment.apiUrl}/tasks/${taskId}/comments/${commentId}`,
      request,
    );
  }

  removeComment(taskId: number, commentId: number): Observable<TaskCollaboration> {
    return this.http.delete<TaskCollaboration>(
      `${environment.apiUrl}/tasks/${taskId}/comments/${commentId}`,
    );
  }

  findAttachments(taskId: number): Observable<readonly TaskAttachment[]> {
    return this.http.get<readonly TaskAttachment[]>(
      `${environment.apiUrl}/tasks/${taskId}/attachments`,
    );
  }

  uploadAttachment(taskId: number, file: File): Observable<readonly TaskAttachment[]> {
    const body = new FormData();
    body.append('file', file);

    return this.http.post<readonly TaskAttachment[]>(
      `${environment.apiUrl}/tasks/${taskId}/attachments`,
      body,
    );
  }

  downloadAttachment(taskId: number, attachmentId: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/tasks/${taskId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
  }

  removeAttachment(taskId: number, attachmentId: number): Observable<readonly TaskAttachment[]> {
    return this.http.delete<readonly TaskAttachment[]>(
      `${environment.apiUrl}/tasks/${taskId}/attachments/${attachmentId}`,
    );
  }

}
