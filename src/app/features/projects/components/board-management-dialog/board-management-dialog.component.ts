import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error.model';
import { DtButtonDirective, DtDialogFrameComponent, DtFieldComponent } from '../../../../shared/ui';
import {
  BoardSummary,
  BoardTemplate,
  BoardWorkflowCategory,
  CreateBoardRequest,
  CreateBoardColumnRequest,
} from '../../models/project.models';
import { ProjectService } from '../../services/project.service';

export type BoardManagementDialogData =
  | { readonly mode: 'create'; readonly projectId: number }
  | { readonly mode: 'edit' | 'archive'; readonly projectId: number; readonly board: BoardSummary };

export type BoardManagementDialogResult =
  | { readonly action: 'created' | 'updated'; readonly board: BoardSummary }
  | { readonly action: 'archived'; readonly boardId: number };

interface CustomColumnControl {
  readonly id: number;
  readonly name: FormControl<string>;
  readonly category: FormControl<BoardWorkflowCategory>;
}

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
  private nextColumnId = 1;

  readonly data = inject<BoardManagementDialogData>(DIALOG_DATA);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly workflowError = signal<string | null>(null);

  readonly name = new FormControl(this.data.mode === 'create' ? '' : this.data.board.name, {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  readonly template = new FormControl<BoardTemplate>('DEVTASKER', { nonNullable: true });
  readonly customColumns = signal<readonly CustomColumnControl[]>([
    this.createColumnControl('Entrada', 'BACKLOG'),
    this.createColumnControl('A fazer', 'TODO'),
    this.createColumnControl('Em andamento', 'DOING'),
    this.createColumnControl('Concluído', 'DONE'),
  ]);

  readonly categoryOptions = [
    { value: 'BACKLOG', label: 'Entrada / backlog' },
    { value: 'TODO', label: 'Pronta para iniciar' },
    { value: 'DOING', label: 'Em andamento' },
    { value: 'REVIEW', label: 'Validação / revisão' },
    { value: 'DONE', label: 'Concluída' },
  ] as const satisfies readonly {
    readonly value: BoardWorkflowCategory;
    readonly label: string;
  }[];

  readonly isArchive = this.data.mode === 'archive';
  readonly title = computed(() => {
    if (this.data.mode === 'create') {
      return 'Criar novo quadro';
    }

    return this.data.mode === 'edit' ? 'Renomear quadro' : 'Arquivar quadro';
  });
  readonly description = computed(() => {
    if (this.data.mode === 'create') {
      return 'Escolha a estrutura DevTasker ou desenhe um fluxo com a identidade da sua equipe.';
    }

    if (this.data.mode === 'edit') {
      return 'Atualize o nome sem alterar as colunas e tarefas existentes.';
    }

    if (this.data.board.defaultBoard) {
      return 'O quadro deixará de aparecer sem apagar seus dados, e outro quadro ativo será definido como padrão.';
    }

    return 'O quadro deixará de aparecer no projeto e no Dashboard, sem apagar seus dados.';
  });

  close(): void {
    if (!this.submitting()) {
      this.dialogRef.close();
    }
  }

  selectTemplate(template: BoardTemplate): void {
    this.template.setValue(template);
    this.workflowError.set(null);
  }

  addCustomColumn(): void {
    if (this.customColumns().length >= 10) {
      this.workflowError.set('Um quadro pode começar com no máximo 10 colunas.');
      return;
    }

    this.customColumns.update((columns) => [...columns, this.createColumnControl('', 'DOING')]);
    this.workflowError.set(null);
  }

  removeCustomColumn(index: number): void {
    if (this.customColumns().length <= 2) {
      this.workflowError.set('Mantenha pelo menos 2 colunas no fluxo.');
      return;
    }

    this.customColumns.update((columns) => columns.filter((_, current) => current !== index));
    this.workflowError.set(null);
  }

  moveCustomColumn(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const columns = [...this.customColumns()];

    if (targetIndex < 0 || targetIndex >= columns.length) {
      return;
    }

    [columns[index], columns[targetIndex]] = [columns[targetIndex], columns[index]];
    this.customColumns.set(columns);
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

    const name = this.name.value.trim();
    const columns = this.resolveCustomColumns();

    if (columns === null) {
      return;
    }

    const operation =
      this.data.mode === 'create'
        ? this.projectService.createBoard(this.data.projectId, {
            name,
            template: this.template.value,
            columns,
          } satisfies CreateBoardRequest)
        : this.projectService.updateBoard(this.data.board.id, { name });

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

  columnFieldError(column: CustomColumnControl): string | null {
    if (!column.name.touched) return null;
    if (column.name.hasError('required')) return 'Informe um nome.';
    if (column.name.hasError('maxlength')) return 'Use no máximo 100 caracteres.';
    return null;
  }

  private createColumnControl(name: string, category: BoardWorkflowCategory): CustomColumnControl {
    return {
      id: this.nextColumnId++,
      name: new FormControl(name, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      category: new FormControl(category, { nonNullable: true }),
    };
  }

  private resolveCustomColumns(): readonly CreateBoardColumnRequest[] | null {
    if (this.data.mode !== 'create' || this.template.value === 'DEVTASKER') {
      this.workflowError.set(null);
      return [];
    }

    const controls = this.customColumns();
    controls.forEach((column) => column.name.markAsTouched());

    if (controls.some((column) => column.name.invalid)) {
      this.workflowError.set('Revise os nomes das colunas antes de continuar.');
      return null;
    }

    const columns = controls.map((column) => ({
      name: column.name.value.trim(),
      category: column.category.value,
    }));
    const normalizedNames = columns.map((column) => column.name.toLocaleLowerCase());

    if (new Set(normalizedNames).size !== normalizedNames.length) {
      this.workflowError.set('Use nomes diferentes para cada coluna.');
      return null;
    }

    if (!columns.some((column) => column.category === 'DONE')) {
      this.workflowError.set('Defina ao menos uma coluna como etapa concluída.');
      return null;
    }

    this.workflowError.set(null);
    return columns;
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
