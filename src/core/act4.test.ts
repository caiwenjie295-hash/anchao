import { beforeEach, describe, expect, it } from "vitest";
import { EventBus } from "./eventBus";
import { createDefaultState } from "./defaultState";
import { hydrateState, loadState } from "./saveManager";
import { StateManager } from "./stateManager";
import { act2T07 } from "../data/act2T07Data";
import { act4OldMails } from "../data/act4/mail";
import { birthdayImageSlots } from "../data/act4/assets";
import { birthdayScenes } from "../data/act4/content";
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
  state.modules.act2Research.school.inspectedHotspotIds = [
    "HOTSPOT_A2_T05_SCHOLAR_NOTE",
  ];
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

describe("fourth act semantic progress", () => {
  beforeEach(() => localStorage.clear());

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
    expect(manager.solveAct4Puzzle("A4_P01", ["cave", "gate", "hydrant"])).toBe(
      false,
    );
    for (const page of [2, 4, 8]) manager.readAct4NotebookPage(page);
    expect(manager.solveAct4Puzzle("A4_P01", ["cave", "gate", "hydrant"])).toBe(
      true,
    );
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T01");
    for (const page of [1, 3, 5, 6, 7, 9]) manager.readAct4NotebookPage(page);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T02");
    manager.checkAct4OldMail("protagonist");
    expect(manager.solveAct4Puzzle("A4_P04", ["20200419"])).toBe(false);
    manager.checkAct4OldMail("xiaoyue");
    expect(manager.solveAct4Puzzle("A4_P04", ["20200419"])).toBe(true);
    expect(manager.loginAct4Accounts("wrong")).toBe(false);
    expect(manager.getState().modules.act4.unlockedAccountIds).toEqual([]);
    expect(manager.loginAct4Accounts("20200419")).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe("T03");
    expect(manager.solveAct4Puzzle("A4_P06", ["04-03", "04-09", "04-19"])).toBe(
      true,
    );
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
    expect(migrated.schemaVersion).toBe(8);
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
