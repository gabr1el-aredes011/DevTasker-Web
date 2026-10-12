import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ProjectService } from '../../services/project.service';
import {
  BoardManagementDialogComponent,
  BoardManagementDialogData,
} from './board-management-dialog.component';

describe('BoardManagementDialogComponent', () => {
  const board = { id: 11, projectId: 7, name: 'Roadmap', defaultBoard: true };
  const projectService = {
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    archiveBoard: vi.fn(),
  };
  const dialogRef = {
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate and create a board', async () => {
    await configure({ mode: 'create', projectId: 7 });
    projectService.createBoard.mockReturnValue(of(board));
    const fixture = TestBed.createComponent(BoardManagementDialogComponent);
    const component = fixture.componentInstance;

    component.submit();
    expect(projectService.createBoard).not.toHaveBeenCalled();
    expect(component.fieldError()).toBe('Informe o nome do quadro.');

    component.name.setValue('  Roadmap  ');
    component.submit();

    expect(projectService.createBoard).toHaveBeenCalledWith(7, {
      name: 'Roadmap',
      template: 'DEVTASKER',
      columns: [],
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'created', board });
  });

  it('should create a board with an ordered custom workflow', async () => {
    await configure({ mode: 'create', projectId: 7 });
    projectService.createBoard.mockReturnValue(of(board));
    const component = TestBed.createComponent(BoardManagementDialogComponent).componentInstance;

    component.name.setValue('Produto');
    component.selectTemplate('CUSTOM');
    component.customColumns()[0].name.setValue('Descoberta');
    component.customColumns()[1].name.setValue('Planejado');
    component.customColumns()[2].name.setValue('Construção');
    component.customColumns()[3].name.setValue('Publicado');
    component.submit();

    expect(projectService.createBoard).toHaveBeenCalledWith(7, {
      name: 'Produto',
      template: 'CUSTOM',
      columns: [
        { name: 'Descoberta', category: 'BACKLOG' },
        { name: 'Planejado', category: 'TODO' },
        { name: 'Construção', category: 'DOING' },
        { name: 'Publicado', category: 'DONE' },
      ],
    });
  });

  it('should surface the API message when a board name is already in use', async () => {
    await configure({ mode: 'edit', projectId: 7, board });
    projectService.updateBoard.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Já existe um quadro ativo com este nome no projeto.' },
          }),
      ),
    );
    const component = TestBed.createComponent(BoardManagementDialogComponent).componentInstance;

    component.submit();

    expect(projectService.updateBoard).toHaveBeenCalledWith(11, { name: 'Roadmap' });
    expect(component.submitError()).toBe('Já existe um quadro ativo com este nome no projeto.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should archive the selected board and return its identifier', async () => {
    await configure({ mode: 'archive', projectId: 7, board });
    projectService.archiveBoard.mockReturnValue(of(undefined));
    const component = TestBed.createComponent(BoardManagementDialogComponent).componentInstance;

    component.submit();

    expect(projectService.archiveBoard).toHaveBeenCalledWith(11);
    expect(dialogRef.close).toHaveBeenCalledWith({ action: 'archived', boardId: 11 });
  });

  async function configure(data: BoardManagementDialogData): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [BoardManagementDialogComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: dialogRef },
        { provide: ProjectService, useValue: projectService },
      ],
    }).compileComponents();
  }
});
