import { Injectable, computed, signal } from '@angular/core';

/**
 * Reference-counted loading state. Multiple concurrent operations (e.g. a save
 * firing while a navigation is still settling) won't cause the indicator to
 * hide prematurely — it only disappears once every caller has called hide().
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly isLoading = computed(() => this.count() > 0);

  show(): void {
    this.count.update((v) => v + 1);
  }

  hide(): void {
    this.count.update((v) => Math.max(0, v - 1));
  }

  async wrap<T>(work: Promise<T>): Promise<T> {
    this.show();
    try {
      return await work;
    } finally {
      this.hide();
    }
  }
}
