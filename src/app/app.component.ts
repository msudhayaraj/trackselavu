import { Component, OnInit, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CategoryService } from './core/services/category.service';
import { SettingsService } from './core/services/settings.service';
import { sha256Hex } from './core/utils/hash.util';
import { IconSpinnerComponent } from './shared/icon-spinner/icon-spinner.component';
import { LoadingOverlayComponent } from './shared/loading/loading-overlay.component';
import { LoadingService } from './shared/loading/loading.service';
import { THEME_COLOR_HEX, THEME_COLOR_NAMES } from './shared/theme-colors';
import { AppSettings } from './core/models/settings.model';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { label: 'Transactions', icon: 'receipt_long', path: '/transactions' },
  { label: 'Add Transaction', icon: 'add_circle', path: '/transactions/new' },
  { label: 'Budgets', icon: 'savings', path: '/budgets' },
  { label: 'Reports', icon: 'bar_chart', path: '/reports' },
  { label: 'Charts', icon: 'pie_chart', path: '/charts' },
  { label: 'SMS Import', icon: 'sms', path: '/sms-import' },
  { label: 'Categories', icon: 'category', path: '/categories' },
  { label: 'Backup & Restore', icon: 'cloud_sync', path: '/backup-restore' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    IconSpinnerComponent,
    LoadingOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly title = 'TrackSelavu';
  readonly tagline = 'செலவைக் குறைப்பதைவிட வருமானத்தைப் பெருக்குவது சிறந்தது.';
  readonly navItems = NAV_ITEMS;
  readonly ready = signal(false);
  readonly sidenavMode = signal<'side' | 'over'>('side');
  readonly sidenavOpened = signal(true);

  readonly locked = signal(false);
  readonly pinAttempt = signal('');
  readonly pinError = signal(false);
  private expectedPinHash?: string;

  constructor(
    private readonly categoryService: CategoryService,
    private readonly settingsService: SettingsService,
    private readonly breakpointObserver: BreakpointObserver,
    private readonly router: Router,
    private readonly loadingService: LoadingService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.breakpointObserver.observe('(max-width: 768px)').subscribe((state) => {
      this.sidenavMode.set(state.matches ? 'over' : 'side');
      this.sidenavOpened.set(!state.matches);
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.loadingService.hide();
      }
    });

    await this.categoryService.seedDefaultsIfEmpty();
    const settings = await this.settingsService.getAll();
    this.applyTheme(settings);

    if (settings.appLockEnabled && settings.appLockPinHash) {
      this.expectedPinHash = settings.appLockPinHash;
      this.locked.set(true);
    }

    this.ready.set(true);
  }

  async unlock(): Promise<void> {
    const hash = await sha256Hex(this.pinAttempt());
    if (hash === this.expectedPinHash) {
      this.locked.set(false);
      this.pinError.set(false);
      this.pinAttempt.set('');
    } else {
      this.pinError.set(true);
    }
  }

  closeIfMobile(sidenav: { close: () => void }): void {
    if (this.sidenavMode() === 'over') sidenav.close();
  }

  private applyTheme(settings: AppSettings): void {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const useDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    document.body.classList.toggle('dark-theme', !!useDark);

    for (const name of THEME_COLOR_NAMES) {
      document.body.classList.remove(`theme-${name}`);
    }
    if (settings.themeColor !== 'blue') {
      document.body.classList.add(`theme-${settings.themeColor}`);
    }
    document.documentElement.style.setProperty('--ts-primary', THEME_COLOR_HEX[settings.themeColor]);
  }
}
