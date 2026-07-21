import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  BoardSummary,
  ProjectSummary,
} from '../models/project.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<readonly ProjectSummary[]> {
    return this.http.get<readonly ProjectSummary[]>(
      `${environment.apiUrl}/projects`,
    );
  }

  findBoardsByProjectId(
    projectId: number,
  ): Observable<readonly BoardSummary[]> {
    return this.http.get<readonly BoardSummary[]>(
      `${environment.apiUrl}/projects/${projectId}/boards`,
    );
  }
}