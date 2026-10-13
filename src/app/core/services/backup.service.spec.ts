import { BackupService, InvalidBackupError } from './backup.service';
import { BACKUP_SCHEMA_VERSION } from '../models/backup.model';

describe('BackupService.parseAndValidate', () => {
  const service = new BackupService({} as any, {} as any);

  function validBackupJson(): string {
    return JSON.stringify({
      app: 'TrackSelavu',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      data: { transactions: [], categories: [], budgets: [], accounts: [], smsImports: [], settings: {} },
    });
  }

  it('accepts a well-formed backup file', () => {
    const backup = service.parseAndValidate(validBackupJson());
    expect(backup.app).toBe('TrackSelavu');
  });

  it('rejects text that is not valid JSON', () => {
    expect(() => service.parseAndValidate('not json {{{')).toThrowError(InvalidBackupError);
  });

  it('rejects a file from a different app', () => {
    const json = JSON.stringify({ app: 'SomeOtherApp', schemaVersion: 1, data: {} });
    expect(() => service.parseAndValidate(json)).toThrowError(InvalidBackupError);
  });

  it('rejects a backup from a newer, unsupported schema version', () => {
    const json = JSON.stringify({
      app: 'TrackSelavu',
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
      exportedAt: Date.now(),
      data: { transactions: [], categories: [], budgets: [], accounts: [], smsImports: [] },
    });
    expect(() => service.parseAndValidate(json)).toThrowError(InvalidBackupError);
  });

  it('rejects a backup missing required data arrays', () => {
    const json = JSON.stringify({
      app: 'TrackSelavu',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      data: { transactions: [] },
    });
    expect(() => service.parseAndValidate(json)).toThrowError(InvalidBackupError);
  });
});
