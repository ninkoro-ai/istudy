import type { ExamStrategy } from '../types';
import { clamp } from './utils';

export interface MasteryInput {
  learned: boolean;
  quizAccuracy: number | null;
  reviewCount: number;
  wrongCount: number;
  daysSinceStudy: number;
  strategy: ExamStrategy;
}

export function computeScore(input: MasteryInput): number {
  if (!input.learned) return 0;
  const w = input.strategy.mastery.weights;
  const maxStep = input.strategy.review.maxStep;
  const positiveWeight = w.learningCompletion + w.quizAccuracy + w.reviewPerformance;
  const positive =
    ((input.learned ? 1 : 0) * w.learningCompletion +
      (input.quizAccuracy ?? 0.5) * w.quizAccuracy +
      Math.min(input.reviewCount / maxStep, 1) * w.reviewPerformance) /
    Math.max(positiveWeight, 0.001);
  const decay = Math.min(Math.max(input.daysSinceStudy, 0), 30) / 30 * w.forgettingDecay;
  return clamp(Math.round(positive * 100 - decay * 100), 0, 100);
}

export function levelOf(score: number, strategy: ExamStrategy): string {
  const levels = strategy.mastery.levels;
  for (const lv of levels) {
    if (score <= lv.max) return lv.name;
  }
  return levels[levels.length - 1].name;
}

export { clamp };
