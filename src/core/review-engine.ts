import type { MasteryRecord, ExamStrategy } from '../types';
import { addDays, daysBetween, todayStr } from './date';
import { clamp } from './utils';

export interface NextReviewInput {
  learned: boolean;
  reviewCount: number;
  lastReview: string | null;
  lastStudy: string | null;
  planStart: string;
  accuracy: number | null;
  strategy: ExamStrategy;
}

export function nextReviewDate(input: NextReviewInput): string | null {
  if (!input.learned) return null;
  if (input.reviewCount >= input.strategy.review.maxStep) return null;
  const base = input.lastReview || input.lastStudy || input.planStart;
  const step = Math.min(input.reviewCount, input.strategy.review.intervals.length - 1);
  let interval = input.strategy.review.intervals[step];
  const ad = input.strategy.review.adaptive;
  if (ad.enabled && input.accuracy !== null) {
    if (input.accuracy >= ad.highAccuracyThreshold) interval = Math.round(interval * ad.highIntervalMultiplier);
    else if (input.accuracy < ad.lowAccuracyThreshold) interval = Math.max(1, Math.round(interval * ad.lowIntervalMultiplier));
  }
  return addDays(base, interval);
}

export interface ReviewResult {
  reviewCount: number;
  lastReview: string;
  nextReview: string | null;
}

export function applyReview(rec: MasteryRecord, correct: boolean, accuracy: number, today: string, strategy: ExamStrategy): ReviewResult {
  const ad = strategy.review.adaptive;
  let step = rec.reviewCount;
  if (correct) {
    let inc = 1;
    if (ad.enabled) {
      if (accuracy >= ad.highAccuracyThreshold) inc = Math.max(1, ad.highStepAdvance);
      else if (accuracy < ad.lowAccuracyThreshold) inc = ad.lowStepAdvance;
    }
    step = clamp(step + inc, 0, strategy.review.maxStep);
  } else {
    step = 0; // 答错回到 Day 1 间隔（intervals[0]）
  }
  const next = step >= strategy.review.maxStep
    ? null
    : nextReviewDate({
        learned: true,
        reviewCount: step,
        lastReview: today,
        lastStudy: rec.lastStudy,
        planStart: today,
        accuracy,
        strategy
      });
  return { reviewCount: step, lastReview: today, nextReview: next };
}

export function isDue(rec: MasteryRecord, today: string): boolean {
  return rec.learned && rec.nextReview !== null && rec.nextReview <= today;
}

export function accuracyFrom(_rec: MasteryRecord, correct: number, total: number): number {
  return total > 0 ? correct / total : 0;
}

export function streakDays(doneDates: Set<string>, today: string): number {
  let n = 0;
  for (let i = 0; i < 1000; i++) {
    const d = addDays(today, -i);
    if (doneDates.has(d)) n++;
    else break;
  }
  return n;
}

export { daysBetween, todayStr };
