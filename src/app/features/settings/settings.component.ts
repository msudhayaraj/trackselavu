import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SettingsService } from '../../core/services/settings.service';
import { sha256Hex } from '../../core/utils/hash.util';
import { ToastService } from '../../shared/toast.service';
import { AppSettings } from '../../core/models/settings.model';
import { LoadingService } from '../../shared/loading/loading.service';
import { THEME_COLOR_HEX, THEME_COLOR_LABELS, THEME_COLOR_NAMES, ThemeColorName } from '../../shared/theme-colors';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly loadingService = inject(LoadingService);

  readonly themeColors = THEME_COLOR_NAMES;
  readonly themeColorHex = THEME_COLOR_HEX;
  readonly themeColorLabels = THEME_COLOR_LABELS;
  readonly themeColor = signal<ThemeColorName>('blue');

  readonly theme = signal<AppSettings['theme']>('system');
  readonly weekStartsOn = signal<AppSettings['weekStartsOn']>('MONDAY');
  readonly smsAutoSaveEnabled = signal(false);
  readonly smsAutoSaveMinConfidence = signal(0.9);
  readonly appLockEnabled = signal(false);
  readonly pinInput = signal('');

  async ngOnInit(): Promise<void> {
    const settings = await this.settingsService.getAll();
    this.theme.set(settings.theme);
    this.themeColor.set(settings.themeColor);
    this.weekStartsOn.set(settings.weekStartsOn);
    this.smsAutoSaveEnabled.set(settings.smsAutoSaveEnabled);
    this.smsAutoSaveMinConfidence.set(settings.smsAutoSaveMinConfidence);
    this.appLockEnabled.set(settings.appLockEnabled);
  }

  async setTheme(theme: AppSettings['theme']): Promise<void> {
    this.theme.set(theme);
    await this.settingsService.set('theme', theme);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const useDark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.body.classList.toggle('dark-theme', !!useDark);
  }

  async setThemeColor(color: ThemeColorName): Promise<void> {
    if (color === this.themeColor()) return;
    this.loadingService.show();
    await this.settingsService.set('themeColor', color);
    window.location.reload();
  }

  async setWeekStartsOn(value: AppSettings['weekStartsOn']): Promise<void> {
    this.weekStartsOn.set(value);
    await this.settingsService.set('weekStartsOn', value);
  }

  async toggleSmsAutoSave(enabled: boolean): Promise<void> {
    this.smsAutoSaveEnabled.set(enabled);
    await this.settingsService.set('smsAutoSaveEnabled', enabled);
  }

  async updateConfidence(value: number): Promise<void> {
    this.smsAutoSaveMinConfidence.set(value);
    await this.settingsService.set('smsAutoSaveMinConfidence', value);
  }

  async toggleAppLock(enabled: boolean): Promise<void> {
    if (enabled) {
      if (this.pinInput().length < 4) {
        this.toast.error('Enter a PIN with at least 4 digits to enable App Lock');
        this.appLockEnabled.set(false);
        return;
      }
      const hash = await sha256Hex(this.pinInput());
      await this.settingsService.setMany({ appLockEnabled: true, appLockPinHash: hash });
      this.appLockEnabled.set(true);
      this.pinInput.set('');
      this.toast.success('App Lock enabled');
    } else {
      await this.settingsService.setMany({ appLockEnabled: false, appLockPinHash: undefined });
      this.appLockEnabled.set(false);
      this.toast.success('App Lock disabled');
    }
  }
}
