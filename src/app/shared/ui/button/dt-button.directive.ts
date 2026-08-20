import {
  Directive,
  ElementRef,
  HostBinding,
  OnDestroy,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';

export type DtButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type DtButtonSize = 'sm' | 'md' | 'lg';

@Directive({
  selector: 'button[dtButton], a[dtButton]',
  standalone: true,
  host: {
    class: 'dt-button',
  },
})
export class DtButtonDirective implements OnDestroy {
  private readonly element = inject<ElementRef<HTMLButtonElement | HTMLAnchorElement>>(ElementRef);
  private readonly clickGuard = (event: Event): void => this.preventBlockedActivation(event);
  private readonly keydownGuard = (event: Event): void => this.preventBlockedKeydown(event);

  readonly variant = input<DtButtonVariant>('primary');
  readonly size = input<DtButtonSize>('md');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  constructor() {
    this.element.nativeElement.addEventListener('click', this.clickGuard, true);
    this.element.nativeElement.addEventListener('keydown', this.keydownGuard, true);
  }

  @HostBinding('class.dt-button--primary')
  get isPrimary(): boolean {
    return this.variant() === 'primary';
  }

  @HostBinding('class.dt-button--secondary')
  get isSecondary(): boolean {
    return this.variant() === 'secondary';
  }

  @HostBinding('class.dt-button--danger')
  get isDanger(): boolean {
    return this.variant() === 'danger';
  }

  @HostBinding('class.dt-button--ghost')
  get isGhost(): boolean {
    return this.variant() === 'ghost';
  }

  @HostBinding('class.dt-button--sm')
  get isSmall(): boolean {
    return this.size() === 'sm';
  }

  @HostBinding('class.dt-button--md')
  get isMedium(): boolean {
    return this.size() === 'md';
  }

  @HostBinding('class.dt-button--lg')
  get isLarge(): boolean {
    return this.size() === 'lg';
  }

  @HostBinding('class.dt-button--loading')
  get isLoading(): boolean {
    return this.loading();
  }

  @HostBinding('attr.data-variant')
  get variantAttribute(): DtButtonVariant {
    return this.variant();
  }

  @HostBinding('attr.data-size')
  get sizeAttribute(): DtButtonSize {
    return this.size();
  }

  @HostBinding('attr.aria-busy')
  get ariaBusy(): 'true' | null {
    return this.loading() ? 'true' : null;
  }

  @HostBinding('attr.aria-disabled')
  get ariaDisabled(): 'true' | null {
    return this.isBlocked ? 'true' : null;
  }

  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    return this.isButton && this.isBlocked ? '' : null;
  }

  ngOnDestroy(): void {
    this.element.nativeElement.removeEventListener('click', this.clickGuard, true);
    this.element.nativeElement.removeEventListener('keydown', this.keydownGuard, true);
  }

  private preventBlockedActivation(event: Event): void {
    if (!this.isBlocked) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private preventBlockedKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (
      this.isBlocked &&
      this.isAnchor &&
      (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  private get isBlocked(): boolean {
    return this.disabled() || this.loading();
  }

  private get isButton(): boolean {
    return this.element.nativeElement.tagName === 'BUTTON';
  }

  private get isAnchor(): boolean {
    return this.element.nativeElement.tagName === 'A';
  }
}
