import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly dbService: DbService) {}

  async getAll(): Promise<AppSettings> {
    const db = await this.dbService.getDb();
    const rows = await db.getAll('settings');
    const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { ...DEFAULT_SETTINGS, ...overrides } as AppSettings;
  }

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const db = await this.dbService.getDb();
    const row = await db.get('settings', key);
    return row ? (row.value as AppSettings[K]) : DEFAULT_SETTINGS[key];
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const db = await this.dbService.getDb();
    await db.put('settings', { key, value });
  }

  async setMany(changes: Partial<AppSettings>): Promise<void> {
    const db = await this.dbService.getDb();
    const tx = db.transaction('settings', 'readwrite');
    for (const [key, value] of Object.entries(changes)) {
      await tx.store.put({ key: key as keyof AppSettings, value });
    }
    await tx.done;
  }
}
