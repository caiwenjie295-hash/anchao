export type PhotoPoint = { x: number; y: number; kind?: 'object' | 'sound' | 'memory' | 'direction' };
/** Coordinates are fractions of the photograph, kept separate from narrative data. */
export const act3PhotoLayout: Record<string, Record<string, PhotoPoint>> = {
  "LENS_A3_T00_001": {
    "CLUE_A3_T00_DEPART": { x: 0.51, y: 0.52, kind: 'direction' },
  },
  "LENS_A3_T00_002": {
    "CLUE_A3_T00_SUPPLIES": { x: 0.47, y: 0.69, kind: 'object' },
  },
  "LENS_A3_T00_003": {
    "CLUE_A3_T00_APPROACH": { x: 0.51, y: 0.52, kind: 'direction' },
  },
  "LENS_A3_T00_004": {
    "CLUE_A3_T00_CABLE": { x: 0.6, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T00_005": {
    "CLUE_A3_T00_CABLE_BREAK": { x: 0.58, y: 0.67, kind: 'object' },
  },
  "LENS_A3_T00_006": {
    "CLUE_A3_T00_CAVE_SHELTER": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T00_007": {
    "CLUE_A3_T00_CAVE_TALK": { x: 0.1, y: 0.26, kind: 'sound' },
  },
  "LENS_A3_T00_008": {
    "CLUE_A3_T00_TEMPLE_REVISIT": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T00_009": {
    "CLUE_A3_T00_WATER_ODDITY": { x: 0.53, y: 0.73, kind: 'object' },
  },
  "LENS_A3_T00_010": {
    "CLUE_A3_T00_DRAIN_DISCOVERED": { x: 0.54, y: 0.76, kind: 'object' },
  },
  "LENS_A3_T00_011": {
    "CLUE_A3_T00_OLD_ROAD": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T00_012": {
    "CLUE_A3_T00_GATE_REACHED": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T01_001": {
    "CLUE_A3_T01_GATE_VIEW": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T01_002": {
    "CLUE_A3_T01_PILLAR_CLOSE": { x: 0.73, y: 0.5, kind: 'object' },
  },
  "LENS_A3_T01_003": {
    "CLUE_A3_T01_SIGN_REVEALED": { x: 0.62, y: 0.39, kind: 'object' },
  },
  "LENS_A3_T01_004": {
    "CLUE_A3_T01_GATE_ENTERED": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T01_005": {
    "CLUE_A3_T01_INNER_FENCE": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T01_006": {
    "CLUE_A3_T01_BREAKER_OPTIONAL": { x: 0.25, y: 0.59, kind: 'object' },
    "CLUE_A3_T01_MAIN_BUILDING": { x: 0.72, y: 0.46, kind: 'object' },
  },
  "LENS_A3_T02_001": {
    "CLUE_A3_T02_CORRIDOR": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T02_002": {
    "CLUE_A3_T02_CLASSROOM_DOOR": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T02_003": {
    "CLUE_A3_T02_BLACKBOARD": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T02_004": {
    "CLUE_A3_T02_SS_SCRATCH": { x: 0.56, y: 0.53, kind: 'object' },
  },
  "LENS_A3_T02_005": {
    "CLUE_A3_T02_SLOGAN_SPEAKER": { x: 0.61, y: 0.27, kind: 'object' },
  },
  "LENS_A3_T02_006": {
    "CLUE_A3_T02_CORRIDOR_TURN": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T03_001": {
    "CLUE_A3_T03_CORRIDOR": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T03_002": {
    "CLUE_A3_T03_24H": { x: 0.55, y: 0.43, kind: 'object' },
  },
  "LENS_A3_T03_003": {
    "CLUE_A3_T03_PEEPHOLES": { x: 0.56, y: 0.55, kind: 'object' },
  },
  "LENS_A3_T03_004": {
    "CLUE_A3_T03_48_72H": { x: 0.59, y: 0.45, kind: 'object' },
  },
  "LENS_A3_T03_005": {
    "CLUE_A3_T03_STAIRS": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T03_006": {
    "CLUE_A3_T03_DESCEND": { x: 0.51, y: 0.52, kind: 'direction' },
  },
  "LENS_A3_T04_001": {
    "CLUE_A3_T04_SIGN": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T04_002": {
    "CLUE_A3_T04_EMPTY_ROOM": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T04_003": {
    "CLUE_A3_T04_LABELS": { x: 0.64, y: 0.48, kind: 'object' },
  },
  "LENS_A3_T04_004": {
    "CLUE_A3_T04_PAPER_EDGE": { x: 0.57, y: 0.77, kind: 'object' },
  },
  "LENS_A3_T04_005": {
    "CLUE_A3_T04_VVAKE_PAPER": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T04_006": {
    "CLUE_A3_T04_BROADCAST_DOOR": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T05_001": {
    "CLUE_A3_T05_ENTRY": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T05_002": {
    "CLUE_A3_T05_EMPTY_EQUIPMENT": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T05_003": {
    "CLUE_A3_T05_DESK": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T05_004": {
    "CLUE_A3_T05_PAPER_EDGE": { x: 0.57, y: 0.77, kind: 'object' },
  },
  "LENS_A3_T05_005": {
    "CLUE_A3_T05_13ACK_PAPER": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T05_006": {
    "CLUE_A3_T05_KITCHEN_DIRECTION": { x: 0.12, y: 0.28, kind: 'direction' },
  },
  "LENS_A3_T06_001": {
    "CLUE_A3_T06_DOOR": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T06_002": {
    "CLUE_A3_T06_ROOM": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T06_003": {
    "CLUE_A3_T06_POT_KNIFE": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T06_004": {
    "CLUE_A3_T06_BONES": { x: 0.48, y: 0.73, kind: 'object' },
  },
  "LENS_A3_T06_005": {
    "CLUE_A3_T06_HOOKS": { x: 0.52, y: 0.23, kind: 'object' },
  },
  "LENS_A3_T06_006": {
    "CLUE_A3_T06_SHRINE": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T06_007": {
    "CLUE_A3_T06_EMPTY_BASE": { x: 0.5, y: 0.68, kind: 'object' },
  },
  "LENS_A3_T06_008": {
    "CLUE_A3_T06_TEMPLE_COMPARE": { x: 0.5, y: 0.4, kind: 'object' },
  },
  "LENS_A3_T07_001": {
    "CLUE_A3_T07_UPSTAIRS": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T07_002": {
    "CLUE_A3_T07_CORNER": { x: 0.12, y: 0.28, kind: 'sound' },
  },
  "LENS_A3_T07_003": {
    "CLUE_A3_T07_STANDING_HYDRANT": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T07_004": {
    "CLUE_A3_T07_XIAOYUE_MEMORY": { x: 0.12, y: 0.28, kind: 'memory' },
  },
  "LENS_A3_T07_005": {
    "CLUE_A3_T07_BACK_GAP": { x: 0.69, y: 0.66, kind: 'object' },
  },
  "LENS_A3_T07_006": {
    "CLUE_A3_T07_NOTEBOOK_PICKUP": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T07_007": {
    "CLUE_A3_T07_FIRST_PAGE": { x: 0.51, y: 0.52, kind: 'object' },
  },
  "LENS_A3_T07_008": {
    "CLUE_A3_T07_EXIT_ROUTE": { x: 0.51, y: 0.52, kind: 'direction' },
  },
};
