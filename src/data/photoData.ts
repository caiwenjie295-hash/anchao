import photosDocument from '../../data/photos.json';

export type PhotoRecord = { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string; filename: string; caption: string; editorHint: string; symbolLabel: string; findingText: string };
const items = (photosDocument as { items: PhotoRecord[] }).items;
export const photos = items;
export const photoById = new Map(items.map((photo) => [photo.id, photo]));

export const isSymbolVisible = (adjustment: { exposure: number; shadows: number; contrast: number }): boolean => adjustment.exposure >= 35 && adjustment.shadows >= 30 && adjustment.contrast >= 20;
