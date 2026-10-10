import { TestBed } from '@angular/core/testing';

import { KanbanBoard } from '../../models/kanban.models';
import { BoardIntelligenceComponent } from './board-intelligence.component';

describe('BoardIntelligenceComponent', () => {
  it('should derive the operational health and active workload from the board', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueDate = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');
    const board: KanbanBoard = {
      id: 12,
      projectId: 7,
      name: 'Entrega',
      columns: [
        {
          id: 31,
          name: 'A fazer',
          category: 'TODO',
          position: 0,
          tasks: [
            {
              id: 40,
              title: 'Corrigir autenticação',
              priority: 'URGENT',
              dueDate: overdueDate,
              position: 0,
              assignees: [
                { id: 2, name: 'Gabriel', profileImageUrl: null },
                { id: 3, name: 'Bianca', profileImageUrl: null },
              ],
              labels: [],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
            {
              id: 41,
              title: 'Mapear contrato',
              priority: 'MEDIUM',
              dueDate: null,
              position: 1,
              assignees: [],
              labels: [],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
          ],
        },
        {
          id: 32,
          name: 'Concluído',
          category: 'DONE',
          position: 1,
          tasks: [
            {
              id: 42,
              title: 'Configurar projeto',
              priority: 'LOW',
              dueDate: overdueDate,
              position: 0,
              assignees: [{ id: 2, name: 'Gabriel', profileImageUrl: null }],
              labels: [],
              technologies: [],
              completedChecklistItems: 0,
              totalChecklistItems: 0,
            },
          ],
        },
      ],
    };
    const fixture = TestBed.createComponent(BoardIntelligenceComponent);
    fixture.componentRef.setInput('board', board);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.pulse()).toEqual(
      expect.objectContaining({
        total: 3,
        active: 2,
        completed: 1,
        overdue: 1,
        unassigned: 1,
        completionPercentage: 33,
      }),
    );
    expect(component.pulse().workloads).toEqual([
      expect.objectContaining({ id: 3, name: 'Bianca', taskCount: 1, urgentCount: 1 }),
      expect.objectContaining({ id: 2, name: 'Gabriel', taskCount: 1, urgentCount: 1 }),
    ]);
    expect(component.pulse().phases.find((phase) => phase.category === 'DONE')).toEqual(
      expect.objectContaining({ count: 1, percentage: 33 }),
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Leitura operacional');
  });

  it('should present a useful empty state without invalid percentages', () => {
    const fixture = TestBed.createComponent(BoardIntelligenceComponent);
    fixture.componentRef.setInput('board', {
      id: 12,
      projectId: 7,
      name: 'Entrega',
      columns: [],
    } satisfies KanbanBoard);
    fixture.detectChanges();

    expect(fixture.componentInstance.pulse().completionPercentage).toBe(0);
    expect(fixture.componentInstance.pulse().workloads).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Atribua tarefas');
  });
});
