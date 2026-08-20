import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DtButtonDirective, DtButtonVariant } from './dt-button.directive';

@Component({
  standalone: true,
  imports: [DtButtonDirective],
  template: `
    <button
      dtButton
      [variant]="variant()"
      size="lg"
      [loading]="loading()"
      [disabled]="disabled()"
      (click)="clicks.update((value) => value + 1)"
    >
      Salvar
    </button>

    <a
      dtButton
      variant="ghost"
      size="sm"
      href="/projetos"
      [loading]="loading()"
      (click)="linkClicks.update((value) => value + 1)"
    >
      Abrir
    </a>
  `,
})
class ButtonTestHostComponent {
  readonly variant = signal<DtButtonVariant>('secondary');
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly clicks = signal(0);
  readonly linkClicks = signal(0);
}

describe('DtButtonDirective', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonTestHostComponent],
    }).compileComponents();
  });

  it('should expose variant and size classes for buttons and links', () => {
    const fixture = TestBed.createComponent(ButtonTestHostComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(button.classList.contains('dt-button')).toBe(true);
    expect(button.classList.contains('dt-button--secondary')).toBe(true);
    expect(button.classList.contains('dt-button--lg')).toBe(true);
    expect(button.dataset['variant']).toBe('secondary');
    expect(link.classList.contains('dt-button--ghost')).toBe(true);
    expect(link.classList.contains('dt-button--sm')).toBe(true);
  });

  it('should mark a loading button as busy and prevent activation', () => {
    const fixture = TestBed.createComponent(ButtonTestHostComponent);
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.classList.contains('dt-button--loading')).toBe(true);

    button.click();
    expect(fixture.componentInstance.clicks()).toBe(0);
  });

  it('should prevent navigation and click handlers on a busy link', () => {
    const fixture = TestBed.createComponent(ButtonTestHostComponent);
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.componentInstance.linkClicks()).toBe(0);
  });

  it('should restore activation semantics when loading and disabled are false', () => {
    const fixture = TestBed.createComponent(ButtonTestHostComponent);
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.disabled.set(false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.hasAttribute('aria-disabled')).toBe(false);

    button.click();
    expect(fixture.componentInstance.clicks()).toBe(1);
  });
});
