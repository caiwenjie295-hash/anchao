import { describe, expect, it } from 'vitest';
import { act4NarrativeExplanations, act4NarrativeSections, act4NarrativeSources } from './act4Narrative';
import type { ActiveAct4NarrativeStage } from '../../story/act4/narrativePolicy';

const sectionsByStage = new Map(act4NarrativeSections.map((section) => [section.stage, section]));
const block = (stage: ActiveAct4NarrativeStage, id: string) => sectionsByStage.get(stage)?.blocks.find((item) => item.id === id);

describe('fourth act source-mapped narrative', () => {
  it('keeps ten uniquely identified reading sections with source references for every excerpt', () => {
    expect(act4NarrativeSections).toHaveLength(10);
    expect(new Set(act4NarrativeSections.map((section) => section.id)).size).toBe(10);

    const excerpts = act4NarrativeSections.flatMap((section) => section.blocks)
      .filter((item) => item.kind === 'novel-excerpt');
    expect(excerpts.length).toBeGreaterThan(10);
    expect(new Set(excerpts.map((item) => item.id)).size).toBe(excerpts.length);
    for (const excerpt of excerpts) {
      const source = act4NarrativeSources[excerpt.sourceRefId!];
      expect(source, excerpt.id).toBeDefined();
      expect(source.sourcePages.length, excerpt.id).toBeGreaterThan(0);
      expect(excerpt.paragraphs.length, excerpt.id).toBeGreaterThan(0);
    }
  });

  it('reveals password, opened mail, archive, hiding, broadcast, and final mail only after their story actions', () => {
    expect(block('T02', 'T02_PASSWORD_REVEAL')?.revealAfterActionId).toBe('A4_T02_LOGIN_SUCCEEDED');
    expect(block('T04', 'T04_ORIGINAL')?.revealAfterActionId).toBe('A4_T04_WAKE_MAIL_OPENED');
    expect(block('T08', 'T08_ARCHIVE')?.revealAfterActionId).toBe('A4_T08_ARCHIVE_OPENED');
    expect(block('T09', 'T09_NOTE_HIDDEN')?.revealAfterActionId).toBe('A4_T09_NOTE_HIDDEN');
    expect(block('T09', 'T09_WALK_TO_DOOR')?.revealAfterActionId).toBe('A4_T09_NOTE_HIDDEN');
    expect(block('T09', 'T09_BROADCAST')?.revealAfterActionId).toBe('A4_T09_DOOR_EXITED');
    expect(block('T10', 'T10_FINAL_MAIL')?.revealAfterActionId).toBe('A4_T10_FINAL_MAIL_OPENED');

    for (const [stage, action] of [['T02', 'A4_T02_LOGIN_SUCCEEDED'], ['T04', 'A4_T04_WAKE_MAIL_OPENED'], ['T08', 'A4_T08_ARCHIVE_OPENED'], ['T09', 'A4_T09_DOOR_EXITED'], ['T10', 'A4_T10_FINAL_MAIL_OPENED']] as const) {
      expect(sectionsByStage.get(stage)?.explanationRevealAfterActionId).toBe(action);
    }
  });

  it('keeps the T02 explanation within the mail dates already read', () => {
    const text = act4NarrativeExplanations.A4_EXPLAIN_T02.text;
    expect(text).not.toContain('微博');
    expect(text).not.toContain('玩家');
    expect(text).toContain('2020 年 4 月 19 日 23:41');
  });
});
