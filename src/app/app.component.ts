import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DtToastRegionComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DtToastRegionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {
  protected readonly title = signal('devtasker-web');
}
