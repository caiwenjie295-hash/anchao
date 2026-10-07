import type { AppState } from './types';
import { createDefaultState } from './defaultState';
import { clearAct4ReadingPositions } from './uiPreferences';
import { resolveSaveStorage, type SaveStoragePort } from './persistence/browserStorage';
import { hydrateState } from './compatibility/saveMigration';
import { isRecord, isValidSaveImportEnvelope } from './compatibility/saveValidation';
import { isSupportedSaveSchemaVersion } from './compatibility/saveSchema';

export { hydrateState } from './compatibility/saveMigration';

export const SAVE_KEY = 'anchao.save.v1';
export const SAVE_BACKUP_KEY = 'anchao.save.backup.v1';
export const SAVE_RECOVERY_KEY = 'anchao.save.recovery.v1';
export type SaveReadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; state: AppState }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'unsupported-version'; raw: string; version: number }
  | { kind: 'unavailable'; raw?: string };

export type SaveWriteFailureReason =
  | 'storage-unavailable'
  | 'backup-unavailable'
  | 'recovery-required'
  | 'recovery-protection-failed'
  | 'recovery-slot-occupied';

export type SaveWriteResult = { ok: true } | { ok: false; reason: SaveWriteFailureReason; recovery?: Exclude<SaveReadResult, { kind: 'empty' | 'loaded' | 'unavailable' }> };

export type SaveRecoveryWriteOptions = { replaceProtectedOriginal?: boolean; preserveOriginalText?: string };

function decodeSaveText(raw: string): SaveReadResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', raw };
  }
  if (!isRecord(candidate) || typeof candidate.schemaVersion !== 'number') return { kind: 'corrupt', raw };
  if (!isSupportedSaveSchemaVersion(candidate.schemaVersion)) return { kind: 'unsupported-version', raw, version: candidate.schemaVersion };
  if (!isValidSaveImportEnvelope(candidate)) return { kind: 'corrupt', raw };
  const state = hydrateState(candidate);
  return state.schemaVersion === 13 ? { kind: 'loaded', state } : { kind: 'corrupt', raw };
}

export const readSave = (storage?: SaveStoragePort): SaveReadResult => {
  const target = resolveSaveStorage(storage);
  if (!target) return { kind: 'unavailable' };
  try {
    const raw = target.getItem(SAVE_KEY);
    return raw === null ? { kind: 'empty' } : decodeSaveText(raw);
  } catch {
    return { kind: 'unavailable' };
  }
};

/** Compatibility API: exceptional reads still return a usable in-memory default state. */
export const loadState = (storage?: SaveStoragePort): AppState => {
  const result = readSave(storage);
  return result.kind === 'loaded' ? result.state : createDefaultState();
};

function preserveOriginal(raw: string, target: SaveStoragePort, replaceProtectedOriginal: boolean): SaveWriteFailureReason | null {
  try {
    const existing = target.getItem(SAVE_RECOVERY_KEY);
    if (existing === raw) return null;
    if (existing !== null && !replaceProtectedOriginal) return 'recovery-slot-occupied';
    target.setItem(SAVE_RECOVERY_KEY, raw);
    return target.getItem(SAVE_RECOVERY_KEY) === raw ? null : 'recovery-protection-failed';
  } catch {
    return 'recovery-protection-failed';
  }
}

/** Writes the last valid primary save to a single bounded backup slot before replacing it. */
export const writeSaveState = (
  state: AppState,
  storage?: SaveStoragePort,
  options: SaveRecoveryWriteOptions & { allowInvalidOverwrite?: boolean } = {},
): SaveWriteResult => {
  const target = resolveSaveStorage(storage);
  if (!target) return { ok: false, reason: 'storage-unavailable' };
  try {
    if (options.preserveOriginalText !== undefined) {
      const protectionFailure = preserveOriginal(options.preserveOriginalText, target, options.replaceProtectedOriginal === true);
      if (protectionFailure) return { ok: false, reason: protectionFailure };
    }
    const currentRaw = target.getItem(SAVE_KEY);
    if (currentRaw !== null) {
      const current = decodeSaveText(currentRaw);
      if (current.kind === 'loaded') {
        try {
          target.setItem(SAVE_BACKUP_KEY, currentRaw);
        } catch {
          return { ok: false, reason: 'backup-unavailable' };
        }
      } else if (current.kind === 'corrupt' || current.kind === 'unsupported-version') {
        const protectionFailure = preserveOriginal(current.raw, target, options.replaceProtectedOriginal === true);
        if (protectionFailure) return { ok: false, reason: protectionFailure, recovery: current };
        if (!options.allowInvalidOverwrite) return { ok: false, reason: 'recovery-required', recovery: current };
      } else {
        return { ok: false, reason: 'storage-unavailable' };
      }
    }
    target.setItem(SAVE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
};

export const saveState = (state: AppState, storage?: SaveStoragePort): boolean => writeSaveState(state, storage).ok;

export const readRecentSaveBackup = (storage?: SaveStoragePort): SaveReadResult => {
  const target = resolveSaveStorage(storage);
  if (!target) return { kind: 'unavailable' };
  try {
    const raw = target.getItem(SAVE_BACKUP_KEY);
    return raw === null ? { kind: 'empty' } : decodeSaveText(raw);
  } catch {
    return { kind: 'unavailable' };
  }
};

export const readProtectedOriginalSave = (storage?: SaveStoragePort): string | null => {
  const target = resolveSaveStorage(storage);
  if (!target) return null;
  try {
    return target.getItem(SAVE_RECOVERY_KEY);
  } catch {
    return null;
  }
};

export type SaveBackupRestoreResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: SaveWriteFailureReason | 'backup-not-found' };

export const restoreRecentSaveBackup = (storage?: SaveStoragePort, options: SaveRecoveryWriteOptions = {}): SaveBackupRestoreResult => {
  const backup = readRecentSaveBackup(storage);
  if (backup.kind !== 'loaded') return { ok: false, reason: backup.kind === 'unavailable' ? 'storage-unavailable' : 'backup-not-found' };
  const result = writeSaveState(backup.state, storage, { ...options, allowInvalidOverwrite: true });
  return result.ok ? { ok: true, state: backup.state } : { ok: false, reason: result.reason };
};

export type SaveImportResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: 'invalid-file' | 'storage-unavailable' | 'backup-unavailable' | 'recovery-required' | 'recovery-protection-failed' | 'recovery-slot-occupied' | 'backup-not-found' };

/** Validate the save envelope before hydration, then write only the normalized, schema-13 state. */
export const importSaveText = (serialized: string, storage?: SaveStoragePort, options: SaveRecoveryWriteOptions = {}): SaveImportResult => {
  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!isValidSaveImportEnvelope(candidate)) return { ok: false, reason: 'invalid-file' };
    const state = hydrateState(candidate);
    if (state.schemaVersion !== 13) return { ok: false, reason: 'invalid-file' };
    const result = writeSaveState(state, storage, { ...options, allowInvalidOverwrite: true });
    if (!result.ok) return { ok: false, reason: result.reason };
    return { ok: true, state };
  } catch {
    return { ok: false, reason: 'invalid-file' };
  }
};

/** Clear reading-only progress when the story save is reset; keep the reader size preference. */
export const clearReadingUiState = (): boolean => clearAct4ReadingPositions();
