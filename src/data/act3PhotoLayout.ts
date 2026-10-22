export type PhotoPoint = {
  x: number;
  y: number;
  kind?: 'object' | 'sound' | 'memory' | 'direction';
  /** Region dimensions are fractions of the complete source image, centered on x/y. */
  region?: { width: number; height: number };
};

/** Photo-only calibration stays separate from authored narrative and clue data. */
export const act3PhotoLayout: Record<string, Record<string, PhotoPoint>> = {
  LENS_A3_T00_001: {
    CLUE_A3_T00_DEPART: { x: 0.52, y: 0.46, kind: 'direction', region: { width: 0.42, height: 0.2 } },
  },
  LENS_A3_T00_002: {
    CLUE_A3_T00_SUPPLIES: { x: 0.54, y: 0.72, kind: 'object', region: { width: 0.42, height: 0.26 } },
  },
  LENS_A3_T00_003: {
    CLUE_A3_T00_APPROACH: { x: 0.54, y: 0.38, kind: 'direction', region: { width: 0.4, height: 0.22 } },
  },
  LENS_A3_T00_004: {
    CLUE_A3_T00_CABLE: { x: 0.5, y: 0.72, kind: 'object', region: { width: 0.36, height: 0.17 } },
  },
  LENS_A3_T00_005: {
    CLUE_A3_T00_CABLE_BREAK: { x: 0.43, y: 0.6, kind: 'object', region: { width: 0.3, height: 0.23 } },
  },
  LENS_A3_T00_006: {
    CLUE_A3_T00_CAVE_SHELTER: { x: 0.6, y: 0.48, kind: 'direction', region: { width: 0.38, height: 0.24 } },
  },
  LENS_A3_T00_007: {
    CLUE_A3_T00_CAVE_TALK: { x: 0.43, y: 0.52, kind: 'sound', region: { width: 0.19, height: 0.24 } },
  },
  LENS_A3_T00_008: {
    CLUE_A3_T00_TEMPLE_REVISIT: { x: 0.52, y: 0.62, kind: 'object', region: { width: 0.22, height: 0.18 } },
  },
  LENS_A3_T00_009: {
    CLUE_A3_T00_WATER_ODDITY: { x: 0.68, y: 0.56, kind: 'object', region: { width: 0.26, height: 0.24 } },
  },
  LENS_A3_T00_010: {
    CLUE_A3_T00_DRAIN_DISCOVERED: { x: 0.32, y: 0.56, kind: 'object', region: { width: 0.24, height: 0.42 } },
  },
  LENS_A3_T00_011: {
    CLUE_A3_T00_OLD_ROAD: { x: 0.34, y: 0.6, kind: 'object', region: { width: 0.42, height: 0.48 } },
  },
  LENS_A3_T00_012: {
    CLUE_A3_T00_GATE_REACHED: { x: 0.52, y: 0.58, kind: 'object', region: { width: 0.4, height: 0.42 } },
  },
  LENS_A3_T01_001: {
    CLUE_A3_T01_GATE_VIEW: { x: 0.67, y: 0.52, kind: 'object', region: { width: 0.42, height: 0.48 } },
  },
  LENS_A3_T01_002: {
    CLUE_A3_T01_PILLAR_CLOSE: { x: 0.65, y: 0.21, kind: 'object', region: { width: 0.28, height: 0.28 } },
  },
  LENS_A3_T01_003: {
    CLUE_A3_T01_SIGN_REVEALED: { x: 0.67, y: 0.29, kind: 'object', region: { width: 0.3, height: 0.32 } },
  },
  LENS_A3_T01_004: {
    CLUE_A3_T01_GATE_ENTERED: { x: 0.5, y: 0.5, kind: 'direction', region: { width: 0.42, height: 0.44 } },
  },
  LENS_A3_T01_005: {
    CLUE_A3_T01_INNER_FENCE: { x: 0.52, y: 0.62, kind: 'direction', region: { width: 0.52, height: 0.38 } },
  },
  LENS_A3_T01_006: {
    CLUE_A3_T01_BREAKER_OPTIONAL: { x: 0.85, y: 0.49, kind: 'object', region: { width: 0.14, height: 0.22 } },
    CLUE_A3_T01_MAIN_BUILDING: { x: 0.58, y: 0.5, kind: 'direction', region: { width: 0.38, height: 0.5 } },
  },
  LENS_A3_T02_001: {
    CLUE_A3_T02_CORRIDOR: { x: 0.24, y: 0.52, kind: 'direction', region: { width: 0.32, height: 0.42 } },
  },
  LENS_A3_T02_002: {
    CLUE_A3_T02_CLASSROOM_DOOR: { x: 0.55, y: 0.5, kind: 'direction', region: { width: 0.38, height: 0.38 } },
  },
  LENS_A3_T02_003: {
    CLUE_A3_T02_BLACKBOARD: { x: 0.59, y: 0.4, kind: 'object', region: { width: 0.48, height: 0.24 } },
  },
  LENS_A3_T02_004: {
    CLUE_A3_T02_SS_SCRATCH: { x: 0.5, y: 0.46, kind: 'object', region: { width: 0.34, height: 0.22 } },
  },
  LENS_A3_T02_005: {
    CLUE_A3_T02_SLOGAN_SPEAKER: { x: 0.8, y: 0.145, kind: 'object', region: { width: 0.27, height: 0.28 } },
  },
  LENS_A3_T02_006: {
    CLUE_A3_T02_CORRIDOR_TURN: { x: 0.52, y: 0.48, kind: 'direction', region: { width: 0.38, height: 0.42 } },
  },
  LENS_A3_T03_001: {
    CLUE_A3_T03_CORRIDOR: { x: 0.23, y: 0.43, kind: 'object', region: { width: 0.18, height: 0.48 } },
  },
  LENS_A3_T03_002: {
    CLUE_A3_T03_24H: { x: 0.305, y: 0.51, kind: 'object', region: { width: 0.15, height: 0.17 } },
  },
  LENS_A3_T03_003: {
    CLUE_A3_T03_PEEPHOLES: { x: 0.438, y: 0.49, kind: 'object', region: { width: 0.19, height: 0.25 } },
  },
  LENS_A3_T03_004: {
    CLUE_A3_T03_48_72H: { x: 0.49, y: 0.4, kind: 'object', region: { width: 0.17, height: 0.25 } },
  },
  LENS_A3_T03_005: {
    CLUE_A3_T03_STAIRS: { x: 0.52, y: 0.66, kind: 'direction', region: { width: 0.24, height: 0.25 } },
  },
  LENS_A3_T03_006: {
    CLUE_A3_T03_DESCEND: { x: 0.55, y: 0.62, kind: 'direction', region: { width: 0.22, height: 0.22 } },
  },
  LENS_A3_T04_001: {
    CLUE_A3_T04_SIGN: { x: 0.765, y: 0.455, kind: 'object', region: { width: 0.14, height: 0.23 } },
  },
  LENS_A3_T04_002: {
    CLUE_A3_T04_EMPTY_ROOM: { x: 0.49, y: 0.5, kind: 'direction', region: { width: 0.22, height: 0.24 } },
  },
  LENS_A3_T04_003: {
    CLUE_A3_T04_LABELS: { x: 0.165, y: 0.5, kind: 'object', region: { width: 0.16, height: 0.1 } },
  },
  LENS_A3_T04_004: {
    CLUE_A3_T04_PAPER_EDGE: { x: 0.565, y: 0.455, kind: 'object', region: { width: 0.19, height: 0.21 } },
  },
  LENS_A3_T04_005: {
    CLUE_A3_T04_VVAKE_PAPER: { x: 0.47, y: 0.49, kind: 'object', region: { width: 0.32, height: 0.36 } },
  },
  LENS_A3_T04_006: {
    CLUE_A3_T04_BROADCAST_DOOR: { x: 0.365, y: 0.44, kind: 'direction', region: { width: 0.18, height: 0.26 } },
  },
  LENS_A3_T05_001: {
    CLUE_A3_T05_ENTRY: { x: 0.57, y: 0.47, kind: 'direction', region: { width: 0.18, height: 0.25 } },
  },
  LENS_A3_T05_002: {
    CLUE_A3_T05_EMPTY_EQUIPMENT: { x: 0.4, y: 0.4, kind: 'object', region: { width: 0.28, height: 0.5 } },
  },
  LENS_A3_T05_003: {
    CLUE_A3_T05_DESK: { x: 0.595, y: 0.66, kind: 'object', region: { width: 0.32, height: 0.43 } },
  },
  LENS_A3_T05_004: {
    CLUE_A3_T05_PAPER_EDGE: { x: 0.767, y: 0.837, kind: 'object', region: { width: 0.075, height: 0.08 } },
  },
  LENS_A3_T05_005: {
    CLUE_A3_T05_13ACK_PAPER: { x: 0.697, y: 0.785, kind: 'object', region: { width: 0.12, height: 0.13 } },
  },
  LENS_A3_T05_006: {
    CLUE_A3_T05_KITCHEN_DIRECTION: { x: 0.39, y: 0.46, kind: 'direction', region: { width: 0.18, height: 0.26 } },
  },
  LENS_A3_T06_001: {
    CLUE_A3_T06_DOOR: { x: 0.742, y: 0.268, kind: 'object', region: { width: 0.18, height: 0.15 } },
  },
  LENS_A3_T06_002: {
    CLUE_A3_T06_ROOM: { x: 0.53, y: 0.51, kind: 'object', region: { width: 0.22, height: 0.22 } },
  },
  LENS_A3_T06_003: {
    CLUE_A3_T06_POT_KNIFE: { x: 0.545, y: 0.555, kind: 'object', region: { width: 0.25, height: 0.18 } },
  },
  LENS_A3_T06_004: {
    CLUE_A3_T06_BONES: { x: 0.445, y: 0.78, kind: 'object', region: { width: 0.28, height: 0.24 } },
  },
  LENS_A3_T06_005: {
    CLUE_A3_T06_HOOKS: { x: 0.14, y: 0.29, kind: 'object', region: { width: 0.16, height: 0.19 } },
  },
  LENS_A3_T06_006: {
    CLUE_A3_T06_SHRINE: { x: 0.645, y: 0.355, kind: 'object', region: { width: 0.24, height: 0.32 } },
  },
  LENS_A3_T06_007: {
    CLUE_A3_T06_EMPTY_BASE: { x: 0.612, y: 0.607, kind: 'object', region: { width: 0.25, height: 0.14 } },
  },
  LENS_A3_T06_008: {
    CLUE_A3_T06_TEMPLE_COMPARE: { x: 0.49, y: 0.5, kind: 'memory', region: { width: 0.18, height: 0.18 } },
  },
  LENS_A3_T07_001: {
    CLUE_A3_T07_UPSTAIRS: { x: 0.53, y: 0.53, kind: 'direction', region: { width: 0.18, height: 0.22 } },
  },
  LENS_A3_T07_002: {
    CLUE_A3_T07_CORNER: { x: 0.22, y: 0.45, kind: 'sound', region: { width: 0.12, height: 0.15 } },
  },
  LENS_A3_T07_003: {
    CLUE_A3_T07_STANDING_HYDRANT: { x: 0.655, y: 0.607, kind: 'object', region: { width: 0.24, height: 0.4 } },
  },
  LENS_A3_T07_004: {
    CLUE_A3_T07_XIAOYUE_MEMORY: { x: 0.43, y: 0.58, kind: 'memory', region: { width: 0.18, height: 0.23 } },
  },
  LENS_A3_T07_005: {
    CLUE_A3_T07_BACK_GAP: { x: 0.56, y: 0.585, kind: 'object', region: { width: 0.075, height: 0.2 } },
  },
  LENS_A3_T07_006: {
    CLUE_A3_T07_NOTEBOOK_PICKUP: { x: 0.44, y: 0.49, kind: 'object', region: { width: 0.16, height: 0.35 } },
  },
  LENS_A3_T07_007: {
    CLUE_A3_T07_FIRST_PAGE: { x: 0.414, y: 0.632, kind: 'object', region: { width: 0.35, height: 0.54 } },
  },
  LENS_A3_T07_008: {
    CLUE_A3_T07_EXIT_ROUTE: { x: 0.56, y: 0.6, kind: 'direction', region: { width: 0.2, height: 0.2 } },
  },
};
