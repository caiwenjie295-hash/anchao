export type PhotoPoint = { x: number; y: number; kind?: 'object' | 'sound' | 'memory' | 'direction' };
/** Coordinates are fractions of the photograph, kept separate from narrative data. */
export const act3PhotoLayout: Record<string, Record<string, PhotoPoint>> = {
  "LENS_A3_T00_001": {
    "CLUE_A3_T00_DEPART": { x: 0.52, y: 0.46, kind: 'direction' },
  },
  "LENS_A3_T00_002": {
    "CLUE_A3_T00_SUPPLIES": { x: 0.49, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T00_003": {
    "CLUE_A3_T00_APPROACH": { x: 0.55, y: 0.48, kind: 'direction' },
  },
  "LENS_A3_T00_004": {
    "CLUE_A3_T00_CABLE": { x: 0.53, y: 0.735, kind: 'object' },
  },
  "LENS_A3_T00_005": {
    "CLUE_A3_T00_CABLE_BREAK": { x: 0.55, y: 0.64, kind: 'object' },
  },
  "LENS_A3_T00_006": {
    "CLUE_A3_T00_CAVE_SHELTER": { x: 0.46, y: 0.49, kind: 'direction' },
  },
  "LENS_A3_T00_007": {
    "CLUE_A3_T00_CAVE_TALK": { x: 0.19, y: 0.42, kind: 'sound' },
  },
  "LENS_A3_T00_008": {
    "CLUE_A3_T00_TEMPLE_REVISIT": { x: 0.52, y: 0.55, kind: 'object' },
  },
  "LENS_A3_T00_009": {
    "CLUE_A3_T00_WATER_ODDITY": { x: 0.21, y: 0.28, kind: 'object' },
  },
  "LENS_A3_T00_010": {
    "CLUE_A3_T00_DRAIN_DISCOVERED": { x: 0.38, y: 0.67, kind: 'object' },
  },
  "LENS_A3_T00_011": {
    "CLUE_A3_T00_OLD_ROAD": { x: 0.54, y: 0.59, kind: 'object' },
  },
  "LENS_A3_T00_012": {
    "CLUE_A3_T00_GATE_REACHED": { x: 0.53, y: 0.47, kind: 'object' },
  },
  "LENS_A3_T01_001": {
    "CLUE_A3_T01_GATE_VIEW": { x: 0.67, y: 0.42, kind: 'object' },
  },
  "LENS_A3_T01_002": {
    "CLUE_A3_T01_PILLAR_CLOSE": { x: 0.65, y: 0.38, kind: 'object' },
  },
  "LENS_A3_T01_003": {
    "CLUE_A3_T01_SIGN_REVEALED": { x: 0.63, y: 0.31, kind: 'object' },
  },
  "LENS_A3_T01_004": {
    "CLUE_A3_T01_GATE_ENTERED": { x: 0.48, y: 0.48, kind: 'direction' },
  },
  "LENS_A3_T01_005": {
    "CLUE_A3_T01_INNER_FENCE": { x: 0.53, y: 0.53, kind: 'direction' },
  },
  "LENS_A3_T01_006": {
    "CLUE_A3_T01_BREAKER_OPTIONAL": { x: 0.83, y: 0.48, kind: 'object' },
    "CLUE_A3_T01_MAIN_BUILDING": { x: 0.61, y: 0.43, kind: 'direction' },
  },
  "LENS_A3_T02_001": {
    "CLUE_A3_T02_CORRIDOR": { x: 0.24, y: 0.52, kind: 'direction' },
  },
  "LENS_A3_T02_002": {
    "CLUE_A3_T02_CLASSROOM_DOOR": { x: 0.28, y: 0.49, kind: 'direction' },
  },
  "LENS_A3_T02_003": {
    "CLUE_A3_T02_BLACKBOARD": { x: 0.54, y: 0.36, kind: 'object' },
  },
  "LENS_A3_T02_004": {
    "CLUE_A3_T02_SS_SCRATCH": { x: 0.48, y: 0.57, kind: 'object' },
  },
  "LENS_A3_T02_005": {
    "CLUE_A3_T02_SLOGAN_SPEAKER": { x: 0.75, y: 0.22, kind: 'object' },
  },
  "LENS_A3_T02_006": {
    "CLUE_A3_T02_CORRIDOR_TURN": { x: 0.55, y: 0.5, kind: 'direction' },
  },
  "LENS_A3_T03_001": {
    "CLUE_A3_T03_CORRIDOR": { x: 0.29, y: 0.45, kind: 'object' },
  },
  "LENS_A3_T03_002": {
    "CLUE_A3_T03_24H": { x: 0.28, y: 0.55, kind: 'object' },
  },
  "LENS_A3_T03_003": {
    "CLUE_A3_T03_PEEPHOLES": { x: 0.52, y: 0.48, kind: 'object' },
  },
  "LENS_A3_T03_004": {
    "CLUE_A3_T03_48_72H": { x: 0.26, y: 0.45, kind: 'object' },
  },
  "LENS_A3_T03_005": {
    "CLUE_A3_T03_STAIRS": { x: 0.55, y: 0.58, kind: 'direction' },
  },
  "LENS_A3_T03_006": {
    "CLUE_A3_T03_DESCEND": { x: 0.49, y: 0.52, kind: 'direction' },
  },
  "LENS_A3_T04_001": {
    "CLUE_A3_T04_SIGN": { x: 0.75, y: 0.45, kind: 'object' },
  },
  "LENS_A3_T04_002": {
    "CLUE_A3_T04_EMPTY_ROOM": { x: 0.48, y: 0.5, kind: 'direction' },
  },
  "LENS_A3_T04_003": {
    "CLUE_A3_T04_LABELS": { x: 0.47, y: 0.48, kind: 'object' },
  },
  "LENS_A3_T04_004": {
    "CLUE_A3_T04_PAPER_EDGE": { x: 0.7, y: 0.69, kind: 'object' },
  },
  "LENS_A3_T04_005": {
    "CLUE_A3_T04_VVAKE_PAPER": { x: 0.79, y: 0.74, kind: 'object' },
  },
  "LENS_A3_T04_006": {
    "CLUE_A3_T04_BROADCAST_DOOR": { x: 0.55, y: 0.5, kind: 'direction' },
  },
  "LENS_A3_T05_001": {
    "CLUE_A3_T05_ENTRY": { x: 0.75, y: 0.51, kind: 'direction' },
  },
  "LENS_A3_T05_002": {
    "CLUE_A3_T05_EMPTY_EQUIPMENT": { x: 0.51, y: 0.34, kind: 'object' },
  },
  "LENS_A3_T05_003": {
    "CLUE_A3_T05_DESK": { x: 0.6, y: 0.6, kind: 'object' },
  },
  "LENS_A3_T05_004": {
    "CLUE_A3_T05_PAPER_EDGE": { x: 0.66, y: 0.65, kind: 'object' },
  },
  "LENS_A3_T05_005": {
    "CLUE_A3_T05_13ACK_PAPER": { x: 0.79, y: 0.76, kind: 'object' },
  },
  "LENS_A3_T05_006": {
    "CLUE_A3_T05_KITCHEN_DIRECTION": { x: 0.5, y: 0.48, kind: 'direction' },
  },
  "LENS_A3_T06_001": {
    "CLUE_A3_T06_DOOR": { x: 0.73, y: 0.35, kind: 'object' },
  },
  "LENS_A3_T06_002": {
    "CLUE_A3_T06_ROOM": { x: 0.53, y: 0.51, kind: 'object' },
  },
  "LENS_A3_T06_003": {
    "CLUE_A3_T06_POT_KNIFE": { x: 0.26, y: 0.44, kind: 'object' },
  },
  "LENS_A3_T06_004": {
    "CLUE_A3_T06_BONES": { x: 0.44, y: 0.75, kind: 'object' },
  },
  "LENS_A3_T06_005": {
    "CLUE_A3_T06_HOOKS": { x: 0.27, y: 0.37, kind: 'object' },
  },
  "LENS_A3_T06_006": {
    "CLUE_A3_T06_SHRINE": { x: 0.64, y: 0.49, kind: 'object' },
  },
  "LENS_A3_T06_007": {
    "CLUE_A3_T06_EMPTY_BASE": { x: 0.49, y: 0.53, kind: 'object' },
  },
  "LENS_A3_T06_008": {
    "CLUE_A3_T06_TEMPLE_COMPARE": { x: 0.49, y: 0.5, kind: 'memory' },
  },
  "LENS_A3_T07_001": {
    "CLUE_A3_T07_UPSTAIRS": { x: 0.55, y: 0.51, kind: 'direction' },
  },
  "LENS_A3_T07_002": {
    "CLUE_A3_T07_CORNER": { x: 0.22, y: 0.45, kind: 'sound' },
  },
  "LENS_A3_T07_003": {
    "CLUE_A3_T07_STANDING_HYDRANT": { x: 0.69, y: 0.62, kind: 'object' },
  },
  "LENS_A3_T07_004": {
    "CLUE_A3_T07_XIAOYUE_MEMORY": { x: 0.43, y: 0.58, kind: 'memory' },
  },
  "LENS_A3_T07_005": {
    "CLUE_A3_T07_BACK_GAP": { x: 0.68, y: 0.54, kind: 'object' },
  },
  "LENS_A3_T07_006": {
    "CLUE_A3_T07_NOTEBOOK_PICKUP": { x: 0.44, y: 0.57, kind: 'object' },
  },
  "LENS_A3_T07_007": {
    "CLUE_A3_T07_FIRST_PAGE": { x: 0.29, y: 0.64, kind: 'object' },
  },
  "LENS_A3_T07_008": {
    "CLUE_A3_T07_EXIT_ROUTE": { x: 0.52, y: 0.51, kind: 'direction' },
  },
};
