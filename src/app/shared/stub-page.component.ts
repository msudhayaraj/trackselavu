import { Component, Input } from '@angular/core';

/** Temporary placeholder used only until a feature's real screen lands in a later phase. */
@Component({
  selector: 'app-stub-page',
  standalone: true,
  template: `<div class="ts-page">
    <div class="ts-card">
      <h2>{{ title }}</h2>
      <p class="ts-muted">This screen is coming in a later implementation phase.</p>
    </div>
  </div>`,
})
export class StubPageComponent {
  @Input() title = 'Coming soon';
}
