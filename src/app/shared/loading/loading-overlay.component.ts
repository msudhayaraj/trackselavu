import { Component, inject } from '@angular/core';
import { LoadingService } from './loading.service';
import { IconSpinnerComponent } from '../icon-spinner/icon-spinner.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [IconSpinnerComponent],
  template: `
    @if (loadingService.isLoading()) {
      <div class="ts-loading-backdrop" role="status" aria-live="polite" aria-label="Loading">
        <app-icon-spinner [size]="72"></app-icon-spinner>
      </div>
    }
  `,
  styles: [
    `
      .ts-loading-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.55);
        backdrop-filter: blur(1px);
      }
      :host-context(.dark-theme) .ts-loading-backdrop {
        background: rgba(18, 22, 21, 0.6);
      }
    `,
  ],
})
export class LoadingOverlayComponent {
  readonly loadingService = inject(LoadingService);
}
