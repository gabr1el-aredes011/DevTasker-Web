import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { BoardSummary, ProjectDetails, ProjectSummary } from '../models/project.models';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  const summary: ProjectSummary = {
    id: 7,
    name: 'Plataforma mobile',
    description: 'Aplicativo principal',
    membershipRole: 'OWNER',
    createdAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-20T13:00:00Z',
  };

  const details: ProjectDetails = {
    ...summary,
    ownerId: 3,
    ownerName: 'Dev User',
  };

  const board: BoardSummary = {
    id: 11,
    projectId: 7,
    name: 'Desenvolvimento',
    defaultBoard: true,
  };

  let service: ProjectService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list the projects available to the current user', () => {
    service.findAll().subscribe((projects) => expect(projects).toEqual([summary]));

    const request = http.expectOne(`${environment.apiUrl}/projects`);
    expect(request.request.method).toBe('GET');
    request.flush([summary]);
  });

  it('should send an optional normalized query when listing projects', () => {
    service.findAll('  mobile  ').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${environment.apiUrl}/projects` &&
        candidate.params.get('query') === 'mobile',
    );
    expect(request.request.method).toBe('GET');
    request.flush([summary]);
  });

  it('should load project details', () => {
    service.findById(7).subscribe((project) => expect(project).toEqual(details));

    const request = http.expectOne(`${environment.apiUrl}/projects/7`);
    expect(request.request.method).toBe('GET');
    request.flush(details);
  });

  it('should list the boards that belong to a project', () => {
    service.findBoardsByProjectId(7).subscribe((boards) => expect(boards).toEqual([board]));

    const request = http.expectOne(`${environment.apiUrl}/projects/7/boards`);
    expect(request.request.method).toBe('GET');
    request.flush([board]);
  });

  it('should create a project with a nullable description', () => {
    service.create({ name: 'Novo projeto', description: null }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/projects`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Novo projeto', description: null });
    request.flush(details);
  });

  it('should fully update a project using PUT', () => {
    service.update(7, { name: 'Projeto atualizado', description: 'Novo contexto' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/projects/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      name: 'Projeto atualizado',
      description: 'Novo contexto',
    });
    request.flush(details);
  });

  it('should archive an owned project using DELETE', () => {
    service.archive(7).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/projects/7`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should create a board inside a project', () => {
    service.createBoard(7, { name: 'Desenvolvimento' }).subscribe((result) => {
      expect(result).toEqual(board);
    });

    const request = http.expectOne(`${environment.apiUrl}/projects/7/boards`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Desenvolvimento' });
    request.flush(board);
  });

  it('should rename a board using PUT', () => {
    service.updateBoard(11, { name: 'Entrega' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/boards/11`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Entrega' });
    request.flush({ ...board, name: 'Entrega' });
  });

  it('should archive a board using DELETE', () => {
    service.archiveBoard(11).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/boards/11`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should set a board as the project default', () => {
    service.setDefaultBoard(11).subscribe((result) => {
      expect(result.defaultBoard).toBe(true);
    });

    const request = http.expectOne(`${environment.apiUrl}/boards/11/default`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    request.flush(board);
  });
});
