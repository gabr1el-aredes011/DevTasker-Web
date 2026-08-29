import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DtFieldComponent } from './dt-field.component';

@Component({
  standalone: true,
  imports: [DtFieldComponent],
  template: `
    <dt-field
      label="Nome do quadro"
      forId="board-name"
      hint="Use um nome curto."
      [error]="error()"
      [required]="true"
      counter="3/120"
    >
      <input id="board-name" [attr.aria-describedby]="'board-name-message'" />
    </dt-field>
  `,
})
class FieldTestHostComponent {
  readonly error = signal<string | null>(null);
}

describe('DtFieldComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldTestHostComponent],
    }).compileComponents();
  });

  it('should associate its label, hint and projected control', () => {
    const fixture = TestBed.createComponent(FieldTestHostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const label = host.querySelector('label') as HTMLLabelElement;
    const input = host.querySelector('input') as HTMLInputElement;
    const message = host.querySelector('#board-name-message') as HTMLElement;

    expect(label.htmlFor).toBe('board-name');
    expect(label.textContent).toContain('Nome do quadro');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
    expect(message.textContent).toContain('Use um nome curto.');
    expect(host.textContent).toContain('3/120');
  });

  it('should replace the hint with an assertive error', () => {
    const fixture = TestBed.createComponent(FieldTestHostComponent);
    fixture.componentInstance.error.set('Informe o nome do quadro.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const message = host.querySelector('#board-name-message') as HTMLElement;

    expect(message.getAttribute('role')).toBe('alert');
    expect(message.textContent).toContain('Informe o nome do quadro.');
    expect(host.querySelector('.dt-field__control--invalid')).toBeTruthy();
  });
});
