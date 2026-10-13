import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { MerchantCategoryRule } from '../models/sms-import.model';
import { generateId } from '../utils/id.util';

function normalize(merchant: string): string {
  return merchant.trim().toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class MerchantRuleService {
  constructor(private readonly settingsService: SettingsService) {}

  async getAll(): Promise<MerchantCategoryRule[]> {
    return this.settingsService.get('merchantCategoryRules');
  }

  /** Substring match against learned merchant patterns; most specific (longest) match wins. */
  async suggestCategory(merchant: string | undefined): Promise<string | undefined> {
    if (!merchant) return undefined;
    const rules = await this.getAll();
    const needle = normalize(merchant);
    const matches = rules.filter(
      (r) => needle.includes(r.merchantPattern) || r.merchantPattern.includes(needle),
    );
    if (matches.length === 0) return undefined;
    matches.sort((a, b) => b.merchantPattern.length - a.merchantPattern.length);
    return matches[0].categoryId;
  }

  /** Learns/updates a merchant -> category mapping from a user-confirmed correction. */
  async learn(merchant: string, categoryId: string): Promise<void> {
    const pattern = normalize(merchant);
    if (!pattern) return;
    const rules = await this.getAll();
    const now = Date.now();
    const existing = rules.find((r) => r.merchantPattern === pattern);
    const updated = existing
      ? rules.map((r) => (r === existing ? { ...r, categoryId, updatedAt: now } : r))
      : [...rules, { id: generateId(), merchantPattern: pattern, categoryId, createdAt: now, updatedAt: now }];
    await this.settingsService.set('merchantCategoryRules', updated);
  }
}
