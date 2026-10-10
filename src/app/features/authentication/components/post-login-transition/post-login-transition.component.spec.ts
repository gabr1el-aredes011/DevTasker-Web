import { TestBed } from '@angular/core/testing';

import { PostLoginTransitionComponent } from './post-login-transition.component';

describe('PostLoginTransitionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostLoginTransitionComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create the holographic transition', () => {
    const fixture = TestBed.createComponent(PostLoginTransitionComponent);

    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.hologram__tile')).toHaveLength(40);
  });

  it('should complete the transition after the visual sequence', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(PostLoginTransitionComponent);
    const completed = vi.fn();

    fixture.componentInstance.completed.subscribe(completed);
    fixture.detectChanges();
    vi.advanceTimersByTime(3000);

    expect(fixture.componentInstance.departing()).toBe(true);
    expect(completed).toHaveBeenCalledOnce();
  });
});
