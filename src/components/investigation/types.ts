export type InvestigationActionKind = 'observe' | 'move' | 'return' | 'story' | 'memory' | 'review';
export type InvestigationActionState = 'unavailable' | 'blocked' | 'ready' | 'completed';

export interface InvestigationMaterialLink {
  id: string;
  label: string;
}

export interface InvestigationAction {
  actionId: string;
  kind: InvestigationActionKind;
  target?: string;
  label: string;
  state: InvestigationActionState;
  reason?: string;
  relatedMaterials?: InvestigationMaterialLink[];
  onActivate?: (trigger: HTMLButtonElement) => void;
  onOpenMaterial?: (material: InvestigationMaterialLink) => void;
}
