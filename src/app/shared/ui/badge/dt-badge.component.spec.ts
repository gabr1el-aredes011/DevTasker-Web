import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DtBadgeComponent, DtBadgeTone } from './dt-badge.component';

@Component({
  standalone: true,
  imports: [DtBadgeComponent],
  template: `<dt-badge [tone]="tone()">Em revisão</dt-badge>`,
})
class BadgeTestHostComponent {
  readonly tone = signal<DtBadgeTone>('warning');
}

describe('DtBadgeComponent', () => {
  it('should project content and expose the semantic tone', async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeTestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(BadgeTestHostComponent);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('dt-badge') as HTMLElement;

    expect(badge.textContent?.trim()).toBe('Em revisão');
    expect(badge.dataset['tone']).toBe('warning');

    fixture.componentInstance.tone.set('success');
    fixture.detectChanges();

    expect(badge.dataset['tone']).toBe('success');
  });

  it('should use the neutral tone by default', async () => {
    await TestBed.configureTestingModule({
      imports: [DtBadgeComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(DtBadgeComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.dataset['tone']).toBe('neutral');
  });
});
