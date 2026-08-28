import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProjectDetails, ProjectSummary } from '../../models/project.models';
import { ProjectService } from '../../services/project.service';
import { ProjectsComponent } from './projects.component';

describe('ProjectsComponent', () => {
  const ownerProject: ProjectSummary = {
    id: 1,
    name: 'Plataforma Mobile',
    description: 'Aplicativo para clientes',
    membershipRole: 'OWNER',
    createdAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-20T13:00:00Z',
  };

  const memberProject: ProjectSummary = {
    id: 2,
    name: 'Portal Interno',
    description: null,
    membershipRole: 'MEMBER',
    createdAt: '2026-08-19T12:00:00Z',
    updatedAt: '2026-08-19T13:00:00Z',
  };

  const ownerDetails: ProjectDetails = {
    ...ownerProject,
    ownerId: 9,
    ownerName: 'Dev Owner',
  };

  const projectService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    projectService.findAll.mockReturnValue(of([ownerProject, memberProject]));
    projectService.findById.mockReturnValue(of(ownerDetails));
    projectService.create.mockReturnValue(of(ownerDetails));
    projectService.update.mockReturnValue(of(ownerDetails));
    projectService.archive.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [provideRouter([]), { provide: ProjectService, useValue: projectService }],
    }).compileComponents();
  });

  it('should load projects and filter locally by normalized name or description', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    expect(projectService.findAll).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.projects()).toHaveLength(2);

    fixture.componentInstance.searchControl.setValue('móbile');
    expect(fixture.componentInstance.filteredProjects().map((project) => project.id)).toEqual([1]);

    fixture.componentInstance.searchControl.setValue('clientes');
    expect(fixture.componentInstance.filteredProjects().map((project) => project.id)).toEqual([1]);
  });

  it('should show edit actions only for owner or admin projects', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const editActions = fixture.nativeElement.querySelectorAll(
      'button[aria-label^="Editar o projeto"]',
    ) as NodeListOf<HTMLButtonElement>;

    expect(editActions).toHaveLength(1);
    expect(editActions[0].getAttribute('aria-label')).toContain('Plataforma Mobile');
    expect(fixture.componentInstance.canEdit(memberProject)).toBe(false);
  });

  it('should link each project card to its own details page', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const detailsLink = fixture.nativeElement.querySelector(
      'a[aria-label="Ver os detalhes do projeto Plataforma Mobile"]',
    ) as HTMLAnchorElement;

    expect(detailsLink).toBeTruthy();
    expect(detailsLink.getAttribute('href')).toBe('/app/projetos/1');
  });

  it('should require an accessible confirmation and archive only owner projects', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const archiveActions = fixture.nativeElement.querySelectorAll(
      'button[aria-label^="Arquivar o projeto"]',
    ) as NodeListOf<HTMLButtonElement>;

    expect(archiveActions).toHaveLength(1);
    expect(fixture.componentInstance.canArchive(memberProject)).toBe(false);

    archiveActions[0].click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(projectService.archive).not.toHaveBeenCalled();

    const confirmButton = dialog.querySelector('.dt-button--danger') as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();

    expect(projectService.archive).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance.projects().map((project) => project.id)).toEqual([2]);
    expect(fixture.componentInstance.archiveCandidate()).toBeNull();
    expect(fixture.componentInstance.actionMessage()).toContain('arquivado');
  });

  it('should keep the confirmation open and expose an API archive error', () => {
    projectService.archive.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { message: 'Somente o proprietário pode arquivar este projeto.' },
          }),
      ),
    );

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.requestArchive(ownerProject);
    component.confirmArchive();

    expect(component.archiveCandidate()?.id).toBe(1);
    expect(component.archivingProjectId()).toBeNull();
    expect(component.archiveError()).toBe('Somente o proprietário pode arquivar este projeto.');
    expect(component.projects()).toHaveLength(2);
  });

  it('should keep keyboard focus inside the archive dialog from its container', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    fixture.componentInstance.requestArchive(ownerProject);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]') as HTMLElement;
    const buttons = dialog.querySelectorAll('button');
    const lastButton = buttons.item(buttons.length - 1) as HTMLButtonElement;

    dialog.focus();
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(document.activeElement).toBe(lastButton);
  });

  it('should create a project with normalized fields and update the catalog', () => {
    const createdProject: ProjectDetails = {
      ...ownerDetails,
      id: 3,
      name: 'Novo Produto',
      description: null,
    };
    projectService.create.mockReturnValue(of(createdProject));

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openCreateForm();
    component.projectForm.setValue({
      name: ' Novo Produto ',
      description: '   ',
    });
    component.submitProject();

    expect(projectService.create).toHaveBeenCalledWith({
      name: 'Novo Produto',
      description: null,
    });
    expect(component.projects()[0].id).toBe(3);
    expect(component.formMode()).toBeNull();
    expect(component.actionMessage()).toContain('criado');
  });

  it('should load official details before updating an editable project', () => {
    const updatedProject: ProjectDetails = {
      ...ownerDetails,
      name: 'Plataforma Renovada',
      description: 'Contexto atualizado',
    };
    projectService.update.mockReturnValue(of(updatedProject));

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.editProject(ownerProject);
    expect(projectService.findById).toHaveBeenCalledWith(1);

    component.projectForm.setValue({
      name: ' Plataforma Renovada ',
      description: ' Contexto atualizado ',
    });
    component.submitProject();

    expect(projectService.update).toHaveBeenCalledWith(1, {
      name: 'Plataforma Renovada',
      description: 'Contexto atualizado',
    });
    expect(component.projects()[0].name).toBe('Plataforma Renovada');
    expect(component.formMode()).toBeNull();
  });

  it('should move an edited project to its updated position in the catalog', () => {
    const newerProject: ProjectSummary = {
      ...memberProject,
      id: 3,
      name: 'Projeto mais recente',
      membershipRole: 'ADMIN',
      updatedAt: '2026-08-20T18:00:00Z',
    };
    const updatedProject: ProjectDetails = {
      ...ownerDetails,
      name: 'Plataforma renovada',
      updatedAt: '2026-08-21T09:00:00Z',
    };
    projectService.update.mockReturnValue(of(updatedProject));

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.projects.set([newerProject, ownerProject]);

    component.editProject(ownerProject);
    component.projectForm.setValue({
      name: 'Plataforma renovada',
      description: ownerDetails.description ?? '',
    });
    component.submitProject();

    expect(component.projects().map((project) => project.id)).toEqual([1, 3]);
  });

  it('should refuse to load edit details for member projects', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    fixture.componentInstance.editProject(memberProject);

    expect(projectService.findById).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formMode()).toBeNull();
  });
});
