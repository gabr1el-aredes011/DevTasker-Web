import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { KanbanBoard } from '../models/kanban.models';

@Injectable({
  providedIn: 'root',
})
export class KanbanService {
  private readonly http = inject(HttpClient);

  findByBoardId(
    boardId: number,
  ): Observable<KanbanBoard> {
    return this.http.get<KanbanBoard>(
      `${environment.apiUrl}/boards/${boardId}/kanban`,
    );
  }
}