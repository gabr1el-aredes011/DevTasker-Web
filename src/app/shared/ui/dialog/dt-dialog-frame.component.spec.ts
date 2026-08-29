import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DtDialogFrameComponent } from './dt-dialog-frame.component';

@Component({
  standalone: true,
  imports: [DtDialogFrameComponent],
  template: `
    <dt-dialog-frame
      eyebrow="Ciclo de vida"
      title="Arquivar quadro"
      description="Os dados serão preservados."
      tone="danger"
      (dismiss)="dismissed = true"
    >
      <p class="dialog-content">Quadro Principal</p>
      <div dtDialogActions>
        <button type="button">Confirmar</button>
      </div>
    </dt-dialog-frame>
  `,
})
class DialogFrameTestHostComponent {
  dismissed = false;
}

describe('DtDialogFrameComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogFrameTestHostComponent],
    }).compileComponents();
  });

  it('should render semantic content and project actions', () => {
    const fixture = TestBed.createComponent(DialogFrameTestHostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const dialog = host.querySelector('.dt-dialog') as HTMLElement;

    expect(dialog.dataset['tone']).toBe('danger');
    expect(host.querySelector('h2')?.textContent).toContain('Arquivar quadro');
    expect(host.querySelector('.dialog-content')?.textContent).toContain('Quadro Principal');
    expect(host.querySelector('.dt-dialog__actions button')?.textContent).toContain('Confirmar');
  });

  it('should emit dismiss when the close button is activated', () => {
    const fixture = TestBed.createComponent(DialogFrameTestHostComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.dt-dialog__close') as HTMLButtonElement).click();

    expect(fixture.componentInstance.dismissed).toBe(true);
  });
});
