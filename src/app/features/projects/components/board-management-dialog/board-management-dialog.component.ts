import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error.model';
import { DtButtonDirective, DtDialogFrameComponent, DtFieldComponent } from '../../../../shared/ui';
import { BoardSummary } from '../../models/project.models';
import { ProjectService } from '../../services/project.service';

export type BoardManagementDialogData =
  | { readonly mode: 'create'; readonly projectId: number }
  | { readonly mode: 'edit' | 'archive'; readonly projectId: number; readonly board: BoardSummary };

export type BoardManagementDialogResult =
  | { readonly action: 'created' | 'updated'; readonly board: BoardSummary }
  | { readonly action: 'archived'; readonly boardId: number };

@Component({
  selector: 'app-board-management-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DtButtonDirective, DtDialogFrameComponent, DtFieldComponent],
  templateUrl: './board-management-dialog.component.html',
  styleUrl: './board-management-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardManagementDialogComponent {
  private readonly projectService = inject(ProjectService);
  private readonly dialogRef = inject(DialogRef<BoardManagementDialogResult>);

  readonly data = inject<BoardManagementDialogData>(DIALOG_DATA);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly name = new FormControl(this.data.mode === 'create' ? '' : this.data.board.name, {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });

  readonly isArchive = this.data.mode === 'archive';
  readonly title = computed(() => {
    if (this.data.mode === 'create') {
      return 'Criar novo quadro';
    }

    return this.data.mode === 'edit' ? 'Renomear quadro' : 'Arquivar quadro';
  });
  readonly description = computed(() => {
    if (this.data.mode === 'create') {
      return 'O fluxo padrão será preparado automaticamente para o novo quadro.';
    }

    if (this.data.mode === 'edit') {
      return 'Atualize o nome sem alterar as colunas e tarefas existentes.';
    }

    return 'O quadro deixará de aparecer no projeto e no Dashboard, sem apagar seus dados.';
  });

  close(): void {
    if (!this.submitting()) {
      this.dialogRef.close();
    }
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.isArchive) {
      this.archiveBoard();
      return;
    }

    this.name.markAsTouched();

    if (this.name.invalid) {
      return;
    }

    const request = { name: this.name.value.trim() };
    const operation =
      this.data.mode === 'create'
        ? this.projectService.createBoard(this.data.projectId, request)
        : this.projectService.updateBoard(this.data.board.id, request);

    this.submitting.set(true);
    this.submitError.set(null);

    operation.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (board) =>
        this.dialogRef.close({
          action: this.data.mode === 'create' ? 'created' : 'updated',
          board,
        }),
      error: (error: unknown) =>
        this.submitError.set(this.extractErrorMessage(error, 'Não foi possível salvar o quadro.')),
    });
  }

  fieldError(): string | null {
    if (!this.name.touched) {
      return null;
    }

    if (this.name.hasError('required')) {
      return 'Informe o nome do quadro.';
    }

    if (this.name.hasError('maxlength')) {
      return 'Use no máximo 120 caracteres.';
    }

    return null;
  }

  private archiveBoard(): void {
    if (this.data.mode !== 'archive') {
      return;
    }

    const boardId = this.data.board.id;

    this.submitting.set(true);
    this.submitError.set(null);

    this.projectService
      .archiveBoard(boardId)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () =>
          this.dialogRef.close({
            action: 'archived',
            boardId,
          }),
        error: (error: unknown) =>
          this.submitError.set(
            this.extractErrorMessage(error, 'Não foi possível arquivar o quadro.'),
          ),
      });
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const response = error.error as Partial<ApiError> | string | null;

    if (response && typeof response === 'object' && response.message?.trim()) {
      return response.message;
    }

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    return fallbackMessage;
  }
}
