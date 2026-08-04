import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateTaskRequest,
  TaskResponse,
  UpdateTaskRequest,
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

}