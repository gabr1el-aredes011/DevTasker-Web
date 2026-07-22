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
} from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly http = inject(HttpClient);

  create(
    columnId: number,
    request: CreateTaskRequest,
  ): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(
      `${environment.apiUrl}/columns/${columnId}/tasks`,
      request,
    );
  }
}