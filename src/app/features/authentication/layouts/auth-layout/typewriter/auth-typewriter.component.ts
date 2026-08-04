import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-auth-typewriter',
  standalone: true,
  templateUrl: './auth-typewriter.component.html',
  styleUrl: './auth-typewriter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthTypewriterComponent
  implements OnInit, OnDestroy
{
  private readonly platformId =
    inject(PLATFORM_ID);

  @Input()
  words: readonly string[] = [
    'fluxo.',
    'clareza.',
    'entregas.',
    'resultado.',
  ];

  @Input()
  typingSpeed = 72;

  @Input()
  deletingSpeed = 42;

  @Input()
  pauseDuration = 1700;

  readonly displayedText = signal('');

  private timeoutId:
    | ReturnType<typeof setTimeout>
    | null = null;

  private wordIndex = 0;
  private characterIndex = 0;
  private deleting = false;

  ngOnInit(): void {
    const firstWord =
      this.words[0] ?? 'fluxo.';

    if (!isPlatformBrowser(this.platformId)) {
      this.displayedText.set(firstWord);
      return;
    }

    const reducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

    if (reducedMotion) {
      this.displayedText.set(firstWord);
      return;
    }

    this.scheduleNextStep(450);
  }

  ngOnDestroy(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
  }

  private typeNextCharacter(): void {
    if (this.words.length === 0) {
      return;
    }

    const currentWord =
      this.words[this.wordIndex] ??
      this.words[0] ??
      '';

    if (!this.deleting) {
      this.characterIndex += 1;

      this.displayedText.set(
        currentWord.slice(
          0,
          this.characterIndex,
        ),
      );

      if (
        this.characterIndex >=
        currentWord.length
      ) {
        this.deleting = true;

        this.scheduleNextStep(
          this.pauseDuration,
        );

        return;
      }

      const naturalTypingVariation =
        Math.round(Math.random() * 28);

      this.scheduleNextStep(
        this.typingSpeed +
          naturalTypingVariation,
      );

      return;
    }

    this.characterIndex = Math.max(
      0,
      this.characterIndex - 1,
    );

    this.displayedText.set(
      currentWord.slice(
        0,
        this.characterIndex,
      ),
    );

    if (this.characterIndex === 0) {
      this.deleting = false;

      this.wordIndex =
        (this.wordIndex + 1) %
        this.words.length;

      this.scheduleNextStep(320);
      return;
    }

    this.scheduleNextStep(
      this.deletingSpeed,
    );
  }

  private scheduleNextStep(
    delay: number,
  ): void {
    this.timeoutId = setTimeout(
      () => {
        this.typeNextCharacter();
      },
      delay,
    );
  }
}