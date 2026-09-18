import rawApps from '../../data/apps.json';
import { APP_IDS, type AppId } from '../core/types';

export interface AppDefinition {
  id: string;
  appId: AppId;
  title: string;
  act: number;
  phase: string;
  source: string;
  purpose: string;
  unlockCondition: string[];
  relatedFlags: string[];
  notes: string;
  assetId: string;
  glyph: string;
}

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const isAppId = (value: unknown): value is AppId => typeof value === 'string' && APP_IDS.includes(value as AppId);

const parseApp = (value: unknown): AppDefinition => {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid app metadata entry.');
  const app = value as Record<string, unknown>;
  if (
    typeof app.id !== 'string' || !isAppId(app.appId) || typeof app.title !== 'string' || typeof app.act !== 'number' ||
    typeof app.phase !== 'string' || typeof app.source !== 'string' || typeof app.purpose !== 'string' ||
    !isStringArray(app.unlockCondition) || !isStringArray(app.relatedFlags) || typeof app.notes !== 'string' ||
    typeof app.assetId !== 'string' || typeof app.glyph !== 'string'
  ) throw new Error('Invalid app metadata entry.');
  return { ...app, appId: app.appId, unlockCondition: app.unlockCondition, relatedFlags: app.relatedFlags } as AppDefinition;
};

if (rawApps.schemaVersion !== 1 || !Array.isArray(rawApps.items)) throw new Error('Invalid apps data schema.');
export const apps = rawApps.items.map(parseApp);

export const appById = Object.fromEntries(apps.map((app) => [app.appId, app])) as Record<AppId, AppDefinition>;
