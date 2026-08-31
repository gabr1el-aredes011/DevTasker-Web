import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  BoardSummary,
  AssignableProjectRole,
  CreateProjectRequest,
  InviteProjectMemberRequest,
  ProjectDetails,
  ProjectInvitationAcceptance,
  ProjectInvitationSummary,
  ProjectMemberSummary,
  ProjectSummary,
  SaveBoardRequest,
  UpdateProjectRequest,
} from '../models/project.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);

  findAll(query?: string): Observable<readonly ProjectSummary[]> {
    const normalizedQuery = query?.trim();
    const params = normalizedQuery ? new HttpParams().set('query', normalizedQuery) : undefined;

    return this.http.get<readonly ProjectSummary[]>(`${environment.apiUrl}/projects`, { params });
  }

  findById(projectId: number): Observable<ProjectDetails> {
    return this.http.get<ProjectDetails>(`${environment.apiUrl}/projects/${projectId}`);
  }

  create(request: CreateProjectRequest): Observable<ProjectDetails> {
    return this.http.post<ProjectDetails>(`${environment.apiUrl}/projects`, request);
  }

  update(projectId: number, request: UpdateProjectRequest): Observable<ProjectDetails> {
    return this.http.put<ProjectDetails>(`${environment.apiUrl}/projects/${projectId}`, request);
  }

  archive(projectId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/projects/${projectId}`);
  }

  findBoardsByProjectId(projectId: number): Observable<readonly BoardSummary[]> {
    return this.http.get<readonly BoardSummary[]>(
      `${environment.apiUrl}/projects/${projectId}/boards`,
    );
  }

  findMembersByProjectId(projectId: number): Observable<readonly ProjectMemberSummary[]> {
    return this.http.get<readonly ProjectMemberSummary[]>(
      `${environment.apiUrl}/projects/${projectId}/members`,
    );
  }

  findPendingInvitations(projectId: number): Observable<readonly ProjectInvitationSummary[]> {
    return this.http.get<readonly ProjectInvitationSummary[]>(
      `${environment.apiUrl}/projects/${projectId}/invitations`,
    );
  }

  inviteMember(
    projectId: number,
    request: InviteProjectMemberRequest,
  ): Observable<ProjectInvitationSummary> {
    return this.http.post<ProjectInvitationSummary>(
      `${environment.apiUrl}/projects/${projectId}/invitations`,
      request,
    );
  }

  revokeInvitation(projectId: number, invitationId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/projects/${projectId}/invitations/${invitationId}`,
    );
  }

  changeMemberRole(
    projectId: number,
    membershipId: number,
    role: AssignableProjectRole,
  ): Observable<ProjectMemberSummary> {
    return this.http.put<ProjectMemberSummary>(
      `${environment.apiUrl}/projects/${projectId}/members/${membershipId}/role`,
      { role },
    );
  }

  removeMember(projectId: number, membershipId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/projects/${projectId}/members/${membershipId}`,
    );
  }

  acceptInvitation(token: string): Observable<ProjectInvitationAcceptance> {
    return this.http.post<ProjectInvitationAcceptance>(
      `${environment.apiUrl}/project-invitations/accept`,
      { token },
    );
  }

  createBoard(projectId: number, request: SaveBoardRequest): Observable<BoardSummary> {
    return this.http.post<BoardSummary>(
      `${environment.apiUrl}/projects/${projectId}/boards`,
      request,
    );
  }

  updateBoard(boardId: number, request: SaveBoardRequest): Observable<BoardSummary> {
    return this.http.put<BoardSummary>(`${environment.apiUrl}/boards/${boardId}`, request);
  }

  archiveBoard(boardId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/boards/${boardId}`);
  }

  setDefaultBoard(boardId: number): Observable<BoardSummary> {
    return this.http.put<BoardSummary>(`${environment.apiUrl}/boards/${boardId}/default`, null);
  }
}
