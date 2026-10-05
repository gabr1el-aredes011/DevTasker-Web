import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error.model';
import { DtButtonDirective, DtDialogFrameComponent, DtFieldComponent } from '../../../../shared/ui';
import { ProjectLabel, ProjectLabelColor } from '../../models/project.models';
import { ProjectService } from '../../services/project.service';

export type ProjectLabelDialogData =
  | { readonly mode: 'create'; readonly projectId: number }
  | { readonly mode: 'edit' | 'archive'; readonly projectId: number; readonly label: ProjectLabel };

export type ProjectLabelDialogResult =
  | { readonly action: 'created' | 'updated'; readonly label: ProjectLabel }
  | { readonly action: 'archived'; readonly labelId: number };

@Component({
  selector: 'app-project-label-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DtButtonDirective, DtDialogFrameComponent, DtFieldComponent],
  templateUrl: './project-label-dialog.component.html',
  styleUrl: './project-label-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectLabelDialogComponent {
  private readonly projectService = inject(ProjectService);
  private readonly dialogRef = inject(DialogRef<ProjectLabelDialogResult>);

  readonly data = inject<ProjectLabelDialogData>(DIALOG_DATA);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly colors: readonly ProjectLabelColor[] = [
    'GREEN',
    'BLUE',
    'VIOLET',
    'AMBER',
    'RED',
    'CYAN',
    'GRAY',
  ];
  readonly name = new FormControl(this.data.mode === 'create' ? '' : this.data.label.name, {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(30)],
  });
  readonly color = new FormControl<ProjectLabelColor>(
    this.data.mode === 'create' ? 'GREEN' : this.data.label.color,
    { nonNullable: true, validators: [Validators.required] },
  );
  readonly isArchive = this.data.mode === 'archive';
  readonly title = computed(() => {
    if (this.data.mode === 'create') return 'Criar label';
    return this.data.mode === 'edit' ? 'Editar label' : 'Arquivar label';
  });

  close(): void {
    if (!this.submitting()) this.dialogRef.close();
  }

  submit(): void {
    if (this.submitting()) return;
    if (this.data.mode === 'archive') {
      this.archive();
      return;
    }

    this.name.markAsTouched();
    this.color.markAsTouched();
    if (this.name.invalid || this.color.invalid) return;

    const request = { name: this.name.value.trim(), color: this.color.value };
    const operation =
      this.data.mode === 'create'
        ? this.projectService.createLabel(this.data.projectId, request)
        : this.projectService.updateLabel(this.data.projectId, this.data.label.id, request);

    this.submitting.set(true);
    this.submitError.set(null);
    operation.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (label) =>
        this.dialogRef.close({
          action: this.data.mode === 'create' ? 'created' : 'updated',
          label,
        }),
      error: (error: unknown) =>
        this.submitError.set(this.extractErrorMessage(error, 'Não foi possível salvar a label.')),
    });
  }

  fieldError(): string | null {
    if (!this.name.touched) return null;
    if (this.name.hasError('required')) return 'Informe o nome da label.';
    if (this.name.hasError('maxlength')) return 'Use no máximo 30 caracteres.';
    return null;
  }

  private archive(): void {
    if (this.data.mode !== 'archive') return;

    const labelId = this.data.label.id;

    this.submitting.set(true);
    this.submitError.set(null);
    this.projectService
      .archiveLabel(this.data.projectId, labelId)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.dialogRef.close({ action: 'archived', labelId }),
        error: (error: unknown) =>
          this.submitError.set(
            this.extractErrorMessage(error, 'Não foi possível arquivar a label.'),
          ),
      });
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallbackMessage;
    if (error.status === 0) return 'Não foi possível conectar ao servidor.';

    const response = error.error as Partial<ApiError> | string | null;
    if (response && typeof response === 'object' && response.message?.trim()) {
      return response.message;
    }
    return typeof response === 'string' && response.trim() ? response : fallbackMessage;
  }
}
