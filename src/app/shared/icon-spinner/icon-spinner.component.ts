import { Component, Input } from '@angular/core';

/** The TrackSelavu app icon, spinning — used as the loading indicator everywhere instead of a generic spinner. */
@Component({
  selector: 'app-icon-spinner',
  standalone: true,
  template: `
    <svg
      class="ts-icon-spinner"
      [style.width.px]="size"
      [style.height.px]="size"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ts-spinner-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#4285f4" />
          <stop offset="1" stop-color="#1565c0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#ts-spinner-bg)" />
      <circle cx="376" cy="140" r="34" fill="#fb8c00" />
      <text
        x="256"
        y="372"
        font-family="'Segoe UI', Arial, sans-serif"
        font-size="300"
        font-weight="700"
        fill="#ffffff"
        text-anchor="middle"
      >
        &#8377;
      </text>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .ts-icon-spinner {
        animation: ts-spin 1s linear infinite;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
      }
      @keyframes ts-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ts-icon-spinner {
          animation-duration: 2.5s;
        }
      }
    `,
  ],
})
export class IconSpinnerComponent {
  @Input() size = 64;
}
