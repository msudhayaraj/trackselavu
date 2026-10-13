import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';

/**
 * Thin, reusable wrapper around Chart.js so every chart screen doesn't
 * reimplement create/update/destroy lifecycle management.
 */
@Component({
  selector: 'app-chart-canvas',
  standalone: true,
  template: `<div class="ts-chart-wrap" [style.height.px]="height">
    @if (isEmpty) {
      <div class="ts-chart-empty">{{ emptyMessage }}</div>
    } @else {
      <canvas #canvas></canvas>
    }
  </div>`,
  styles: [
    `
      .ts-chart-wrap {
        position: relative;
        width: 100%;
      }
      .ts-chart-empty {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ts-text-muted);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class ChartCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  @Input() config?: ChartConfiguration;
  @Input() height = 240;
  @Input() isEmpty = false;
  @Input() emptyMessage = 'No data for this period yet.';
  @Input() onSegmentClick?: (index: number, datasetIndex: number) => void;

  private chart?: Chart;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;
    if (changes['config'] || changes['isEmpty']) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    this.chart?.destroy();
    this.chart = undefined;
    if (this.isEmpty || !this.config || !this.canvasRef) return;

    this.chart = new Chart(this.canvasRef.nativeElement, this.config);

    if (this.onSegmentClick) {
      this.canvasRef.nativeElement.onclick = (evt) => {
        const points = this.chart!.getElementsAtEventForMode(
          evt,
          'nearest',
          { intersect: true },
          true,
        );
        if (points.length) {
          this.onSegmentClick!(points[0].index, points[0].datasetIndex);
        }
      };
    }
  }
}
