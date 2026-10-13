import { MerchantCategoryRule } from './sms-import.model';
import { ThemeColorName } from '../../shared/theme-colors';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  themeColor: ThemeColorName;
  monthStartDay: number; // 1-28, for users whose "month" isn't calendar-aligned
  weekStartsOn: 'MONDAY' | 'SUNDAY';
  smsAutoSaveEnabled: boolean;
  smsAutoSaveMinConfidence: number; // 0-1
  merchantCategoryRules: MerchantCategoryRule[];
  appLockEnabled: boolean;
  /** SHA-256 hex digest of the PIN. Never store the PIN itself. */
  appLockPinHash?: string;
  lastBackupAt?: number;
  lastBackupFilename?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  themeColor: 'blue',
  monthStartDay: 1,
  weekStartsOn: 'MONDAY',
  smsAutoSaveEnabled: false,
  smsAutoSaveMinConfidence: 0.9,
  merchantCategoryRules: [],
  appLockEnabled: false,
};

/** settings object store is a simple key/value table. */
export interface SettingsRecord<K extends keyof AppSettings = keyof AppSettings> {
  key: K;
  value: AppSettings[K];
}
