import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error.model';
import {
  DtBadgeComponent,
  DtButtonDirective,
  DtFeedbackStateComponent,
} from '../../../../shared/ui';
import {
  CreateProjectRequest,
  ProjectDetails,
  ProjectSummary,
  UpdateProjectRequest,
} from '../../models/project.models';
import { projectRoleLabel, projectRoleTone } from '../../presentation/project-role.presentation';
import { ProjectService } from '../../services/project.service';

type ProjectFormMode = 'create' | 'edit';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    DtBadgeComponent,
    DtButtonDirective,
    DtFeedbackStateComponent,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);

  readonly projects = signal<readonly ProjectSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly formMode = signal<ProjectFormMode | null>(null);
  readonly editingProject = signal<ProjectDetails | null>(null);
  readonly editingProjectId = signal<number | null>(null);
  readonly loadingDetails = signal(false);
  readonly detailsError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly actionMessage = signal<string | null>(null);
  readonly archiveCandidate = signal<ProjectSummary | null>(null);
  readonly archivingProjectId = signal<number | null>(null);
  readonly archiveError = signal<string | null>(null);

  readonly searchControl = this.formBuilder.nonNullable.control('');

  readonly projectForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(1000)]],
  });

  private readonly searchValue = toSignal(this.searchControl.valueChanges, {
    initialValue: this.searchControl.value,
  });

  private readonly descriptionValue = toSignal(this.projectForm.controls.description.valueChanges, {
    initialValue: this.projectForm.controls.description.value,
  });

  readonly normalizedSearch = computed(() => this.normalizeSearch(this.searchValue()));

  readonly filteredProjects = computed(() => {
    const search = this.normalizedSearch();

    if (!search) {
      return this.projects();
    }

    return this.projects().filter((project) =>
      this.normalizeSearch(`${project.name} ${project.description ?? ''}`).includes(search),
    );
  });

  readonly descriptionLength = computed(() => this.descriptionValue().length);

  readonly projectRoleLabel = projectRoleLabel;
  readonly projectRoleTone = projectRoleTone;

  readonly formTitle = computed(() =>
    this.formMode() === 'edit' ? 'Editar projeto' : 'Criar novo projeto',
  );

  @ViewChild('projectNameInput')
  private projectNameInput?: ElementRef<HTMLInputElement>;

  @ViewChild('archiveDialog')
  private archiveDialog?: ElementRef<HTMLElement>;

  @ViewChild('cancelArchiveButton')
  private cancelArchiveButton?: ElementRef<HTMLButtonElement>;

  @ViewChild('projectsCatalogTitle')
  private projectsCatalogTitle?: ElementRef<HTMLElement>;

  private archiveTrigger?: HTMLElement;

  ngOnInit(): void {
    this.loadProjects();
  }

  retry(): void {
    this.loadProjects();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  openCreateForm(): void {
    if (this.submitting() || this.loadingDetails() || this.archiveCandidate()) {
      return;
    }

    this.actionMessage.set(null);
    this.formError.set(null);
    this.detailsError.set(null);
    this.editingProject.set(null);
    this.editingProjectId.set(null);
    this.projectForm.reset({ name: '', description: '' });
    this.formMode.set('create');
    this.focusProjectName();
  }

  editProject(project: ProjectSummary): void {
    if (
      !this.canEdit(project) ||
      this.submitting() ||
      this.loadingDetails() ||
      this.archiveCandidate()
    ) {
      return;
    }

    this.actionMessage.set(null);
    this.formError.set(null);
    this.detailsError.set(null);
    this.editingProject.set(null);
    this.editingProjectId.set(project.id);
    this.formMode.set('edit');
    this.loadingDetails.set(true);

    this.projectService
      .findById(project.id)
      .pipe(finalize(() => this.loadingDetails.set(false)))
      .subscribe({
        next: (details) => {
          if (!this.canEdit(details)) {
            this.detailsError.set('Você não possui permissão para editar este projeto.');
            return;
          }

          this.editingProject.set(details);
          this.projectForm.reset({
            name: details.name,
            description: details.description ?? '',
          });
          this.focusProjectName();
        },
        error: (error: unknown) => {
          this.detailsError.set(
            this.extractErrorMessage(error, 'Não foi possível carregar os detalhes do projeto.'),
          );
        },
      });
  }

  retryEdit(): void {
    const projectId = this.editingProjectId();
    const project = this.projects().find((item) => item.id === projectId);

    if (project) {
      this.editProject(project);
    }
  }

  closeForm(): void {
    if (this.submitting() || this.loadingDetails()) {
      return;
    }

    this.resetFormState();
  }

  requestArchive(project: ProjectSummary, trigger?: HTMLElement): void {
    if (
      !this.canArchive(project) ||
      this.archiveCandidate() ||
      this.archivingProjectId() !== null ||
      this.submitting() ||
      this.loadingDetails()
    ) {
      return;
    }

    this.archiveTrigger = trigger;
    this.actionMessage.set(null);
    this.archiveError.set(null);
    this.archiveCandidate.set(project);

    setTimeout(() => this.cancelArchiveButton?.nativeElement.focus());
  }

  cancelArchive(): void {
    if (this.archivingProjectId() !== null) {
      return;
    }

    this.closeArchiveDialog(true);
  }

  confirmArchive(): void {
    const project = this.archiveCandidate();

    if (!project || !this.canArchive(project) || this.archivingProjectId() !== null) {
      return;
    }

    this.archiveDialog?.nativeElement.focus();
    this.archiveError.set(null);
    this.archivingProjectId.set(project.id);

    this.projectService
      .archive(project.id)
      .pipe(finalize(() => this.archivingProjectId.set(null)))
      .subscribe({
        next: () => {
          this.projects.update((projects) => projects.filter((item) => item.id !== project.id));

          if (this.editingProjectId() === project.id) {
            this.resetFormState();
          }

          this.actionMessage.set(`Projeto “${project.name}” arquivado com sucesso.`);
          this.closeArchiveDialog(false);
          setTimeout(() => this.projectsCatalogTitle?.nativeElement.focus());
        },
        error: (error: unknown) => {
          this.archiveError.set(
            this.extractErrorMessage(error, 'Não foi possível arquivar o projeto.'),
          );
          setTimeout(() => this.cancelArchiveButton?.nativeElement.focus());
        },
      });
  }

  handleArchiveDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.archiveDialog) {
      return;
    }

    const focusableElements = Array.from(
      this.archiveDialog.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (activeElement === this.archiveDialog.nativeElement) {
      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
      return;
    }

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event): void {
    if (!this.archiveCandidate() || this.archivingProjectId() !== null) {
      return;
    }

    event.preventDefault();
    this.cancelArchive();
  }

  submitProject(): void {
    if (this.submitting() || this.loadingDetails() || this.archiveCandidate()) {
      return;
    }

    const mode = this.formMode();

    if (!mode) {
      return;
    }

    this.projectForm.updateValueAndValidity();
    this.projectForm.markAllAsTouched();

    const formValue = this.projectForm.getRawValue();
    const name = formValue.name.trim();

    if (!name) {
      this.projectForm.controls.name.setErrors({ required: true });
      return;
    }

    if (this.projectForm.invalid) {
      return;
    }

    const description = formValue.description.trim() || null;

    this.formError.set(null);
    this.actionMessage.set(null);
    this.submitting.set(true);

    if (mode === 'edit') {
      const project = this.editingProject();

      if (!project || !this.canEdit(project)) {
        this.submitting.set(false);
        this.formError.set('Não foi possível confirmar sua permissão de edição.');
        return;
      }

      const request: UpdateProjectRequest = { name, description };

      this.projectService
        .update(project.id, request)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (updatedProject) => {
            this.projects.update((projects) =>
              this.sortProjectsByUpdatedAt(
                projects.map((item) =>
                  item.id === updatedProject.id ? this.toSummary(updatedProject) : item,
                ),
              ),
            );
            this.actionMessage.set(`Projeto “${updatedProject.name}” atualizado com sucesso.`);
            this.resetFormState();
          },
          error: (error: unknown) => {
            this.formError.set(
              this.extractErrorMessage(error, 'Não foi possível atualizar o projeto.'),
            );
          },
        });

      return;
    }

    const request: CreateProjectRequest = { name, description };

    this.projectService
      .create(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (createdProject) => {
          this.projects.update((projects) =>
            this.sortProjectsByUpdatedAt([this.toSummary(createdProject), ...projects]),
          );
          this.actionMessage.set(
            `Projeto “${createdProject.name}” criado com um quadro inicial pronto para uso.`,
          );
          this.resetFormState();
        },
        error: (error: unknown) => {
          this.formError.set(this.extractErrorMessage(error, 'Não foi possível criar o projeto.'));
        },
      });
  }

  canEdit(project: Pick<ProjectSummary, 'membershipRole'>): boolean {
    return project.membershipRole === 'OWNER' || project.membershipRole === 'ADMIN';
  }

  canArchive(project: Pick<ProjectSummary, 'membershipRole'>): boolean {
    return project.membershipRole === 'OWNER';
  }

  projectInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || 'P';
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.projectService
      .findAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (projects) => this.projects.set(this.sortProjectsByUpdatedAt(projects)),
        error: (error: unknown) => {
          this.loadError.set(
            this.extractErrorMessage(error, 'Não foi possível carregar seus projetos.'),
          );
        },
      });
  }

  private resetFormState(): void {
    this.formMode.set(null);
    this.editingProject.set(null);
    this.editingProjectId.set(null);
    this.detailsError.set(null);
    this.formError.set(null);
    this.projectForm.reset({ name: '', description: '' });
  }

  private closeArchiveDialog(restoreFocus: boolean): void {
    const trigger = this.archiveTrigger;

    this.archiveCandidate.set(null);
    this.archiveError.set(null);
    this.archiveTrigger = undefined;

    if (restoreFocus) {
      setTimeout(() => trigger?.focus());
    }
  }

  private toSummary(project: ProjectDetails): ProjectSummary {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      membershipRole: project.membershipRole,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private sortProjectsByUpdatedAt(projects: readonly ProjectSummary[]): readonly ProjectSummary[] {
    return [...projects].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    );
  }

  private focusProjectName(): void {
    setTimeout(() => {
      this.projectNameInput?.nativeElement.focus();
      this.projectNameInput?.nativeElement.select();
    });
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error as Partial<ApiError> | string | null;

    if (response && typeof response === 'object') {
      const firstFieldError = Object.values(response.fields ?? {}).find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );

      if (firstFieldError) {
        return firstFieldError;
      }

      if (typeof response.message === 'string' && response.message.trim()) {
        return response.message;
      }
    }

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    if (error.status === 403) {
      return 'Você não possui permissão para realizar esta alteração.';
    }

    if (error.status === 404) {
      return 'O projeto solicitado não foi encontrado.';
    }

    return fallbackMessage;
  }
}
