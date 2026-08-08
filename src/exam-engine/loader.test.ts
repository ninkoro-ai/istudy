import { describe, expect, it } from 'vitest';
import { agriculture339, validatePackage } from './loader';

describe('Exam Package', () => {
  it('加载通过并含完整内容', () => {
    expect(agriculture339.exam.id).toBe('agriculture_339');
    expect(agriculture339.knowledge.length).toBeGreaterThan(5);
    expect(agriculture339.questions.length).toBeGreaterThan(3);
    expect(agriculture339.strategy.review.intervals).toEqual([1, 3, 7, 15, 30]);
  });
  it('校验器能发现悬空引用', () => {
    const errors = validatePackage({
      ...agriculture339,
      knowledge: [{ ...agriculture339.knowledge[0], id: 'x1', prerequisite: ['missing'] }]
    });
    expect(errors.some((e) => e.includes('悬空'))).toBe(true);
  });
});
