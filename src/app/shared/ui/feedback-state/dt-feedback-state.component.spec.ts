import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DtFeedbackState, DtFeedbackStateComponent } from './dt-feedback-state.component';

@Component({
  standalone: true,
  imports: [DtFeedbackStateComponent],
  template: `
    <dt-feedback-state
      [state]="state"
      [headingLevel]="headingLevel"
      title="Não foi possível carregar"
      description="Tente novamente em alguns instantes."
    >
      <button dtFeedbackAction type="button">Tentar novamente</button>
    </dt-feedback-state>
  `,
})
class FeedbackTestHostComponent {
  state: DtFeedbackState = 'error';
  headingLevel: 1 | 2 | 3 = 2;
}

describe('DtFeedbackStateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackTestHostComponent],
    }).compileComponents();
  });

  it('should expose an assertive alert and project its action for errors', () => {
    const fixture = TestBed.createComponent(FeedbackTestHostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('dt-feedback-state') as HTMLElement;
    const region = host.querySelector('.dt-feedback__announcement') as HTMLElement;
    const action = host.querySelector('[dtFeedbackAction]') as HTMLButtonElement;

    expect(host.dataset['state']).toBe('error');
    expect(region.getAttribute('role')).toBe('alert');
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.hasAttribute('aria-busy')).toBe(false);
    expect(action.textContent?.trim()).toBe('Tentar novamente');
    expect(region.contains(action)).toBe(false);
  });

  it('should expose a polite busy status while loading', () => {
    const fixture = TestBed.createComponent(FeedbackTestHostComponent);
    fixture.componentInstance.state = 'loading';
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('dt-feedback-state') as HTMLElement;
    const region = host.querySelector('.dt-feedback__announcement') as HTMLElement;

    expect(host.dataset['state']).toBe('loading');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelectorAll('.dt-feedback__loader span')).toHaveLength(3);
  });

  it('should render the title and optional description', () => {
    const fixture = TestBed.createComponent(FeedbackTestHostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.dt-feedback__title')?.textContent).toContain(
      'Não foi possível carregar',
    );
    expect(host.querySelector('.dt-feedback__description')?.textContent).toContain(
      'Tente novamente em alguns instantes.',
    );
  });

  it('should render the requested semantic heading level', () => {
    const fixture = TestBed.createComponent(FeedbackTestHostComponent);
    fixture.componentInstance.headingLevel = 3;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain(
      'Não foi possível carregar',
    );
  });
});
