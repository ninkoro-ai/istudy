import { describe, expect, it } from 'vitest';
import { agriculture339 } from '../exam-engine/loader';
import { computeScore, levelOf } from './mastery-engine';
import { nextReviewDate, applyReview, isDue } from './review-engine';
import { todayTasks, progressStats } from './scheduler';
import { addDays } from './date';

const strategy = agriculture339.strategy;

describe('Mastery Engine', () => {
  it('未学习为 0，学习后升高', () => {
    const s0 = computeScore({ learned: false, quizAccuracy: null, reviewCount: 0, wrongCount: 0, daysSinceStudy: 0, strategy });
    const s1 = computeScore({ learned: true, quizAccuracy: 0.5, reviewCount: 0, wrongCount: 0, daysSinceStudy: 0, strategy });
    expect(s0).toBe(0);
    expect(s1).toBeGreaterThan(s0);
  });
  it('正确率越高分数越高，范围恒在 0-100', () => {
    const low = computeScore({ learned: true, quizAccuracy: 0.3, reviewCount: 0, wrongCount: 3, daysSinceStudy: 10, strategy });
    const high = computeScore({ learned: true, quizAccuracy: 1, reviewCount: 3, wrongCount: 0, daysSinceStudy: 0, strategy });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
    expect(low).toBeGreaterThanOrEqual(0);
  });
  it('等级映射边界', () => {
    expect(levelOf(20, strategy)).toBe('陌生');
    expect(levelOf(50, strategy)).toBe('初步理解');
    expect(levelOf(70, strategy)).toBe('掌握');
    expect(levelOf(90, strategy)).toBe('熟练');
    expect(levelOf(98, strategy)).toBe('精通');
  });
});

describe('Review Engine', () => {
  it('按间隔表排期（基线=上次复习日）', () => {
    const d = nextReviewDate({
      learned: true, reviewCount: 0, lastReview: '2026-08-01', lastStudy: '2026-08-01', planStart: '2026-08-01', accuracy: null, strategy
    });
    expect(d).toBe('2026-08-02');
  });
  it('答错回到 Day 1 间隔', () => {
    const rec = { knowledgeId: 'x', learned: true, score: 80, reviewCount: 2, lastStudy: '2026-08-01', lastReview: '2026-08-05', nextReview: '2026-08-08' };
    const r = applyReview(rec, false, 0.2, '2026-08-06', strategy);
    expect(r.reviewCount).toBe(0); // 答错重置，下一次为 Day 1 间隔
    expect(r.nextReview).toBe(addDays('2026-08-06', 1));
  });
  it('高正确率跳步', () => {
    const rec = { knowledgeId: 'x', learned: true, score: 90, reviewCount: 0, lastStudy: '2026-08-01', lastReview: '2026-08-01', nextReview: '2026-08-02' };
    const r = applyReview(rec, true, 1, '2026-08-02', strategy);
    expect(r.reviewCount).toBe(strategy.review.adaptive.highStepAdvance);
  });
  it('到期判定', () => {
    expect(isDue({ knowledgeId: 'x', learned: true, score: 60, reviewCount: 1, lastStudy: null, lastReview: '2026-08-01', nextReview: '2026-08-02' }, '2026-08-02')).toBe(true);
    expect(isDue({ knowledgeId: 'x', learned: true, score: 60, reviewCount: 1, lastStudy: null, lastReview: '2026-08-01', nextReview: '2026-08-03' }, '2026-08-02')).toBe(false);
  });
});

describe('Scheduler', () => {
  it('生成新学/复习/测试任务且数量受策略约束', () => {
    const mastery = new Map();
    const tasks = todayTasks({
      pkg: agriculture339,
      mastery,
      wrong: [],
      today: '2026-08-01',
      planStart: '2026-08-01'
    });
    const news = tasks.filter((t) => t.kind === 'new').length;
    expect(news).toBeLessThanOrEqual(strategy.dailyTask.newKps);
    expect(news).toBeGreaterThan(0);
  });
  it('进度统计', () => {
    const mastery = new Map([['botany_cell', { knowledgeId: 'botany_cell', learned: true, score: 80, reviewCount: 1, lastStudy: '2026-08-01', lastReview: null, nextReview: null }]]);
    const s = progressStats(agriculture339, mastery);
    expect(s.learned).toBe(1);
    expect(s.total).toBe(agriculture339.knowledge.length);
  });
});
