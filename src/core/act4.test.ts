import { beforeEach, describe, expect, it } from "vitest";
import { EventBus } from "./eventBus";
import { createDefaultState } from "./defaultState";
import { hydrateState, loadState } from "./saveManager";
import { StateManager } from "./stateManager";
import { act2T07 } from "../data/act2T07Data";
import { act4OldMails } from "../data/act4/mail";
import { birthdayImageSlots } from "../data/act4/assets";
import { birthdayScenes } from "../data/act4/content";
import { laterScenesByStage, type LaterStage } from "../data/act4/laterContent";
import { mailById } from "../data/mailData";

const readyManager = () => {
  const state = createDefaultState();
  state.game.flags = {
    FLAG_A1_COMPLETE: true,
    FLAG_A1_SS_FOUND: true,
    FLAG_A2_TRANSFER_RULE_INFERRED: true,
    FLAG_A2_SCHOOL_ENTERED: true,
    FLAG_A2_SCHOOL_SS_FOUND: true,
    FLAG_A2_SS_MATCH_CONFIRMED: true,
    FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true,
    FLAG_A2_SCORE_CHANGE_KNOWN: true,
    FLAG_A2_QIMING_OFFICIAL_FOUND: true,
    FLAG_A2_QIMING_TESTIMONIALS_READ: true,
    FLAG_A2_QIMING_FORUM_FOUND: true,
    FLAG_A2_HUANG_MATCH_INFERRED: true,
    FLAG_A2_ZHONG_MATCH_INFERRED: true,
    FLAG_A2_OTHER_CASES_ABNORMAL: true,
    FLAG_A2_PROMO_VIDEO_FOUND: true,
    FLAG_A2_PROMO_VIDEO_WATCHED: true,
    FLAG_A2_PROMO_PHOTO_SS_FOUND: true,
    FLAG_A2_TEMPLE_FRAME_FOUND: true,
    FLAG_A2_QIMING_LOCATION_INFERRED: true,
    FLAG_A2_SECOND_TRIP_PLANNED: true,
    FLAG_A2_COMPLETE: true,
    FLAG_A3_KITCHEN_EXITED: true,
    FLAG_A3_NOTEBOOK_FOUND: true,
    FLAG_A3_SITE_EXITED: true,
    FLAG_A3_COMPLETE: true,
  };
  state.modules.act2Research.stage = "finale";
  state.modules.act2Research.school.visitedAreaIds = ["AREA_A2_T05_XIAOA_CLASSROOM", "AREA_A2_T05_HONOR_ROLL", "AREA_A2_T05_TEACHER_OFFICE"];
  state.modules.act2Research.school.inspectedHotspotIds = ["HOTSPOT_A2_T05_SCHOLAR_NOTE", "HOTSPOT_A2_T05_RANKS", "HOTSPOT_A2_T05_TEACHER"];
  state.modules.act2Research.school.selectedEvidenceIds = ["rank-record", "teacher-account"];
  state.modules.act2Research.school.selectedInferenceId = "bounded-timeline";
  state.modules.act2Research.school.symbolMatchConfirmed = true;
  state.modules.browser.visitedPageIds = [
    "PAGE_A2_T06_004",
    "PAGE_A2_T06_006",
    "PAGE_A2_T06_007",
    "PAGE_A2_T06_008",
    "PAGE_A2_T06_009",
  ];
  state.modules.act2Research.t07 = {
    viewedMaterialIds: [act2T07.video.materialId, act2T07.photoMaterialId],
    playedSegmentIds: act2T07.video.requiredSegmentIds,
    capturedFrameIds: [act2T07.video.keyFrames[0].id],
    comparedFrameIds: [act2T07.video.keyFrames[0].id],
  };
  state.modules.act3.stage = "T07";
  return new StateManager(new EventBus(), state);
};

const laterManager = () => {
  const manager = readyManager();
  const state = manager.getState();
  state.modules.act4.stage = "T05";
  state.modules.act4.birthdayNodeId = "taken";
  state.modules.act4.solvedPuzzleIds = ["A4_P01", "A4_P04", "A4_P06", "A4_P09", "A4_P11"];
  state.modules.act4.unlockedAccountIds = ["weibo", "mail"];
  state.modules.act4.checkedMailRecipients = ["protagonist", "xiaoyue"];
  state.modules.act4.timelineReadDates = ["04-19"];
  state.modules.act4.viewedWakeMail = true;
  for (let index = 1; index <= 4; index++) state.game.flags[`FLAG_A4_T0${index}_COMPLETE`] = true;
  state.game.flags.FLAG_A4_T05_COMPLETE = true;
  return manager;
};

describe("fourth act later progression", () => {
  beforeEach(() => localStorage.clear());

  it("migrates a completed schema 8 T05 save and keeps voluntary T06 entry", () => {
    const old = readyManager().getState();
    old.schemaVersion = 8 as 10;
    old.modules.act4.stage = "T05";
    old.modules.act4.readNotebookPages = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    old.modules.act4.solvedPuzzleIds = ["A4_P01", "A4_P04", "A4_P06", "A4_P09", "A4_P11"];
    old.modules.act4.unlockedAccountIds = ["weibo", "mail"];
    old.modules.act4.timelineReadDates = ["04-19"];
    old.modules.act4.viewedWakeMail = true;
    old.modules.act4.birthdayNodeId = "taken";
    for (let index = 1; index <= 5; index++) old.game.flags[`FLAG_A4_T0${index}_COMPLETE`] = true;
    const saved = JSON.parse(JSON.stringify(old));
    for (const key of ["laterNodeId", "seenLaterNodeIds", "packageStep", "broadcastIndex", "finalMailOpened"]) delete saved.modules.act4[key];
    const migrated = hydrateState(saved);
    expect(migrated.schemaVersion).toBe(10);
    expect(migrated.modules.act4.stage).toBe("T05");
    const manager = new StateManager(new EventBus(), migrated);
    manager.startAct4T06();
    expect(manager.getState().modules.act4.stage).toBe("T06");
  });

  it("returns malformed later saves to the valid completed T05 stage", () => {
    const base = readyManager().getState();
    base.modules.act4.stage = "T07";
    base.modules.act4.readNotebookPages = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    base.modules.act4.solvedPuzzleIds = ["A4_P01", "A4_P04", "A4_P06", "A4_P09", "A4_P11", "A4_P13"];
    base.modules.act4.broadcastPeriodsConfirmed = ["morning", "night"];
    base.modules.act4.unlockedAccountIds = ["weibo", "mail"];
    base.modules.act4.timelineReadDates = ["04-19"];
    base.modules.act4.viewedWakeMail = true;
    base.modules.act4.birthdayNodeId = "taken";
    base.modules.act4.laterNodeId = "A4_T07_DREAM";
    base.modules.act4.seenLaterNodeIds = laterScenesByStage("T06").map((scene) => scene.id).concat("A4_T07_DREAM");
    for (let index = 1; index <= 5; index++) base.game.flags[`FLAG_A4_T0${index}_COMPLETE`] = true;
    base.game.flags.FLAG_A4_T06_COMPLETE = true;
    const missingFlag = JSON.parse(JSON.stringify(base));
    delete missingFlag.game.flags.FLAG_A4_T06_COMPLETE;
    expect(hydrateState(missingFlag)).toMatchObject({ game: { phase: "A4_T05" }, modules: { act4: { stage: "T05", laterNodeId: null } } });
    expect(hydrateState(missingFlag).game.flags.FLAG_A4_T07_COMPLETE).not.toBe(true);
    const missingPuzzle = JSON.parse(JSON.stringify(base));
    missingPuzzle.modules.act4.solvedPuzzleIds = missingPuzzle.modules.act4.solvedPuzzleIds.filter((id: string) => id !== "A4_P13");
    missingPuzzle.game.flags.FLAG_A4_T07_COMPLETE = true;
    const repaired = hydrateState(missingPuzzle);
    expect(repaired.modules.act4.stage).toBe("T05");
    expect(repaired.modules.act4.solvedPuzzleIds).not.toContain("A4_P13");
    expect(repaired.game.flags.FLAG_A4_T06_COMPLETE).not.toBe(true);
    expect(repaired.game.flags.FLAG_A4_T07_COMPLETE).not.toBe(true);
    const brokenNode = JSON.parse(JSON.stringify(base));
    brokenNode.modules.act4.laterNodeId = "broken";
    expect(hydrateState(brokenNode).modules.act4.stage).toBe("T05");
  });

  it("requires scene evidence and ordered actions while optional puzzles remain optional", () => {
    const manager = laterManager();
    manager.startAct4T06();
    expect(manager.getState().modules.act4.stage).toBe("T06");
    const visit = (stage: LaterStage, until: string) => {
      for (const scene of laterScenesByStage(stage).slice(1)) {
        if (manager.getState().modules.act4.laterNodeId === until) break;
        manager.visitAct4LaterNode(scene.id);
      }
    };
    visit("T06", "A4_T06_BROADCAST");
    expect(manager.confirmAct4BroadcastPeriod("morning", "13aCK")).toBe(true);
    expect(manager.getState().modules.act4.solvedPuzzleIds).not.toContain("A4_P13");
    expect(manager.confirmAct4BroadcastPeriod("night", "VVaKe")).toBe(true);
    expect(manager.getState().modules.act4.solvedPuzzleIds).toContain("A4_P13");
    visit("T06", "A4_T06_CONFINEMENT");
    manager.advanceAct4LaterStage();
    expect(manager.getState().modules.act4.stage).toBe("T07");
    visit("T07", "A4_T07_MIRROR");
    manager.visitAct4LaterNode("A4_T07_KITCHEN");
    expect(manager.getState().modules.act4.laterNodeId).toBe("A4_T07_MIRROR");
    expect(manager.solveAct4Puzzle("A4_P16", ["huang", "wangao"])).toBe(true);
    visit("T07", "A4_T07_SCHOOL");
    manager.advanceAct4LaterStage();
    visit("T08", "A4_T08_ARCHIVE");
    manager.visitAct4LaterNode("A4_T08_MIRROR");
    expect(manager.getState().modules.act4.laterNodeId).toBe("A4_T08_ARCHIVE");
    expect(manager.solveAct4Puzzle("A4_P18", ["2008", "huang"])).toBe(true);
    visit("T08", "A4_T08_KITCHEN");
    manager.advanceAct4LaterStage();
    visit("T09", "A4_T09_NOTE");
    manager.advanceAct4Package("tape");
    expect(manager.getState().modules.act4.packageStep).toBe(0);
    for (const action of ["bag", "tape", "hide"] as const) manager.advanceAct4Package(action);
    expect(manager.getState().modules.act4.packageStep).toBe(3);
    visit("T09", "A4_T09_EXIT");
    manager.visitAct4LaterNode("A4_T09_BLACKOUT");
    expect(manager.getState().modules.act4.laterNodeId).toBe("A4_T09_EXIT");
    for (let index = 0; index < 6; index++) manager.advanceAct4Broadcast();
    manager.visitAct4LaterNode("A4_T09_BLACKOUT");
    manager.advanceAct4LaterStage();
    visit("T10", "A4_T10_WORDS");
    visit("T10", "A4_T10_MAIL");
    manager.advanceAct4LaterStage();
    expect(manager.getState().game.flags.FLAG_A4_COMPLETE).not.toBe(true);
    manager.openAct4FinalMail();
    manager.advanceAct4LaterStage();
    expect(manager.getState().game.flags.FLAG_A4_COMPLETE).toBe(true);
    expect(manager.getState().modules.act4.solvedPuzzleIds).toHaveLength(8);
    const restored = hydrateState(JSON.parse(JSON.stringify(manager.getState())));
    expect(restored).toMatchObject({ game: { flags: { FLAG_A4_T10_COMPLETE: true, FLAG_A4_COMPLETE: true } }, modules: { act4: { stage: 'T10', finalMailOpened: true, packageStep: 3, broadcastIndex: 6 } } });
    expect(restored.modules.act4.solvedPuzzleIds).not.toContain('A4_P23');
  });
});

describe("fourth act semantic progress", () => {
  beforeEach(() => localStorage.clear());

  it("migrates a schema 9 broadcast judgement and persists split period confirmations", () => {
    const old = laterManager().getState();
    old.schemaVersion = 9 as 10;
    old.modules.act4.stage = "T07";
    old.modules.act4.solvedPuzzleIds = ["A4_P01", "A4_P04", "A4_P06", "A4_P09", "A4_P11", "A4_P13"];
    old.modules.act4.broadcastPeriodsConfirmed = [];
    old.modules.act4.readNotebookPages = [1];
    old.modules.act4.unlockedAccountIds = ["weibo", "mail"];
    old.modules.act4.timelineReadDates = ["04-19"];
    old.modules.act4.viewedWakeMail = true;
    old.modules.act4.birthdayNodeId = "taken";
    old.game.flags.FLAG_A4_T01_COMPLETE = true; old.game.flags.FLAG_A4_T02_COMPLETE = true; old.game.flags.FLAG_A4_T03_COMPLETE = true; old.game.flags.FLAG_A4_T04_COMPLETE = true; old.game.flags.FLAG_A4_T05_COMPLETE = true; old.game.flags.FLAG_A4_T06_COMPLETE = true;
    old.modules.act4.laterNodeId = "A4_T07_DREAM";
    old.modules.act4.seenLaterNodeIds = ["A4_T06_WAKE","A4_T06_BREAKFAST","A4_T06_RECITE","A4_T06_BROADCAST","A4_T06_ROOMMATE","A4_T06_CONFINEMENT","A4_T07_DREAM"];
    const restored = hydrateState(JSON.parse(JSON.stringify(old)));
    expect(restored.modules.act4.broadcastPeriodsConfirmed).toEqual(["morning", "night"]);
    expect(restored.modules.act4.stage).toBe("T07");
  });

  it("uses the existing protagonist mail and keeps seven birthday image slots aligned", () => {
    const oldMail = mailById.get("MAIL_A1_C_001")!;
    expect(act4OldMails[0].body).toBe(oldMail.body);
    expect(act4OldMails[0].sentAt).toBe(oldMail.sentAt);
    expect(act4OldMails[1].sentAt).toBe("2020-04-19T23:41:00+08:00");
    expect(birthdayImageSlots.map((slot) => slot.nodeId)).toEqual(birthdayScenes.map((scene) => scene.id));
    expect(birthdayImageSlots.every((slot) => slot.path.startsWith("src/第四幕/T05/"))).toBe(true);
  });

  it("requires third act completion and explicit entry", () => {
    const manager = new StateManager(new EventBus(), createDefaultState());
    manager.startAct4();
    expect(manager.getState().modules.act4.stage).toBe("inactive");
    manager.getState().game.flags.FLAG_A3_COMPLETE = true;
    manager.startAct4();
    expect(manager.getState().modules.act4.stage).toBe("inactive");
    const ready = readyManager();
    ready.startAct4();
    expect(ready.getState().modules.act4.stage).toBe("T01");
  });

  it("plays all five required puzzles without optional puzzles and retains a reload", () => {
    const manager = readyManager();
    manager.startAct4();
    manager.readAct4NotebookPage(7);
    expect(manager.solveAct4Puzzle("A4_P01", ["cave", "gate", "hydrant"])).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T02");
    manager.checkAct4OldMail("protagonist");
    expect(manager.solveAct4Puzzle("A4_P04", ["20200419"])).toBe(false);
    manager.checkAct4OldMail("xiaoyue");
    expect(manager.solveAct4Puzzle("A4_P04", ["20200419"])).toBe(false);
    expect(manager.loginAct4Accounts("wrong")).toBe(false);
    expect(manager.getState().modules.act4.unlockedAccountIds).toEqual([]);
    expect(manager.loginAct4Accounts("20200419")).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T03");
    manager.readAct4Timeline("04-10");
    expect(manager.getState().modules.act4.timelineReadDates).toContain("04-10");
    expect(manager.solveAct4Puzzle("A4_P06", ["04-03", "04-09", "04-19"])).toBe(true);
    manager.readAct4Timeline("04-10");
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T03");
    manager.readAct4Timeline("04-19");
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T04");
    expect(manager.solveAct4Puzzle("A4_P09", ["VVaKe"])).toBe(false);
    manager.viewAct4WakeMail();
    expect(manager.solveAct4Puzzle("A4_P09", ["VVaKe"])).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T05");
    for (const node of ["teacher", "home", "river", "dinner", "door"])
      manager.visitAct4BirthdayNode(node);
    expect(manager.solveAct4Puzzle("A4_P11", ["contact", "two-months"])).toBe(
      true,
    );
    manager.visitAct4BirthdayNode("taken");
    manager.advanceAct4Stage();
    expect(manager.getState().game.flags.FLAG_A4_T05_COMPLETE).toBe(true);
    expect(manager.getState().modules.act4.solvedPuzzleIds).toEqual([
      "A4_P01",
      "A4_P04",
      "A4_P06",
      "A4_P09",
      "A4_P11",
    ]);
    const reloaded = loadState(localStorage);
    expect(reloaded.modules.act4.stage).toBe("T05");
    expect(reloaded.modules.act4.birthdayNodeId).toBe("taken");
    expect(reloaded.modules.act4.timelineReadDates).toContain("04-10");
  });

  it("migrates schema 7 and rejects an A4 stage without its gate", () => {
    const old = createDefaultState();
    (old as unknown as { schemaVersion: number }).schemaVersion = 7;
    old.modules.mail.readIds = ["MAIL_A1_C_001"];
    const migrated = hydrateState(old);
    expect(migrated.schemaVersion).toBe(10);
    expect(migrated.modules.mail.readIds).toContain("MAIL_A1_C_001");
    expect(migrated.modules.act4.stage).toBe("inactive");
    const forged = createDefaultState();
    forged.game.phase = "A4_T05";
    forged.modules.act4.stage = "T05";
    forged.modules.act4.solvedPuzzleIds = [
      "A4_P01",
      "A4_P04",
      "A4_P06",
      "A4_P09",
      "A4_P11",
    ];
    const cleaned = hydrateState(forged);
    expect(cleaned.modules.act4.stage).toBe("inactive");
    expect(cleaned.game.phase).not.toBe("A4_T05");
    forged.game.flags.FLAG_A3_COMPLETE = true;
    forged.modules.act4.stage = "T01";
    const forgedGate = hydrateState(forged);
    expect(forgedGate.modules.act4.stage).toBe("inactive");
    expect(forgedGate.game.flags.FLAG_A3_COMPLETE).not.toBe(true);
  });
});
