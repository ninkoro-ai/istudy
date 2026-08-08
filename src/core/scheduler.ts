import type { ExamPackage, MasteryRecord, WrongItem, TodayTaskView, KnowledgeNode, TaskKind } from '../types';
import { nextReviewDate, isDue } from './review-engine';

export interface SchedulerArgs {
  pkg: ExamPackage;
  mastery: Map<string, MasteryRecord>;
  wrong: WrongItem[];
  today: string;
  planStart: string;
}

const IMPORTANCE: Record<string, number> = { high: 5, medium: 3, low: 1 };

export function priorityOf(kp: KnowledgeNode, rec: MasteryRecord | undefined, wrongCount: number): number {
  const importance = IMPORTANCE[kp.importance] ?? 3;
  const forgetting = rec ? Math.min(Math.max(0, 1 - (rec.score ?? 0) / 100), 1) * 5 + 1 : 5;
  const weakness = Math.min(wrongCount, 5) + 1;
  const duration = Math.max(kp.estimatedMinutes, 1);
  return (importance * forgetting * weakness) / duration;
}

export function todayTasks(args: SchedulerArgs): TodayTaskView[] {
  const { pkg, mastery, today } = args;
  const views: TodayTaskView[] = [];

  // 新学：未学习且优先级高，取 dailyTask.newKps
  const unlearned = pkg.knowledge
    .filter((k) => !(mastery.get(k.id)?.learned))
    .map((k) => ({ k, p: priorityOf(k, mastery.get(k.id), wrongCountOf(args.wrong, k.id)) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, pkg.strategy.dailyTask.newKps);
  for (const { k } of unlearned) views.push({ kind: 'new', knowledge: k, done: false });

  // 复习：到期知识点，按到期先后取 dailyTask.reviewKps
  const due = pkg.knowledge
    .filter((k) => {
      const m = mastery.get(k.id);
      return m ? isDue(m, today) : false;
    })
    .sort((a, b) => {
      const na = mastery.get(a.id)!.nextReview!;
      const nb = mastery.get(b.id)!.nextReview!;
      return na < nb ? -1 : na > nb ? 1 : 0;
    })
    .slice(0, pkg.strategy.dailyTask.reviewKps);
  for (const k of due) views.push({ kind: 'review', knowledge: k, done: false, due: true });

  // 测试：从今日新学 + 到期复习中取 dailyTask.quizQuestions 个知识点作为测试任务
  const quizPool = [...unlearned.map((x) => x.k), ...due];
  const quizKps = quizPool.slice(0, Math.min(pkg.strategy.dailyTask.quizQuestions, quizPool.length));
  for (const k of quizKps) {
    if (!views.some((v) => v.knowledge.id === k.id && v.kind === 'quiz')) {
      views.push({ kind: 'quiz', knowledge: k, done: false });
    }
  }

  // 按 kind 排序：新学 → 复习 → 测试
  const order: Record<TaskKind, number> = { new: 0, review: 1, quiz: 2 };
  views.sort((a, b) => order[a.kind] - order[b.kind]);
  return views;
}

export function wrongCountOf(wrong: WrongItem[], knowledgeId: string): number {
  return wrong.filter((w) => w.knowledgeId === knowledgeId).reduce((a, w) => a + w.wrongCount, 0);
}

export function progressStats(pkg: ExamPackage, mastery: Map<string, MasteryRecord>) {
  const total = pkg.knowledge.length;
  const learned = pkg.knowledge.filter((k) => mastery.get(k.id)?.learned).length;
  const avg = total > 0 ? Math.round(pkg.knowledge.reduce((a, k) => a + (mastery.get(k.id)?.score ?? 0), 0) / total) : 0;
  return { total, learned, coverage: total > 0 ? Math.round((learned / total) * 100) : 0, avgMastery: avg };
}

export function nextReviewOf(_kp: KnowledgeNode, m: MasteryRecord | undefined, planStart: string, strategy: ExamPackage['strategy']): string | null {
  if (!m) return null;
  return nextReviewDate({
    learned: m.learned,
    reviewCount: m.reviewCount,
    lastReview: m.lastReview,
    lastStudy: m.lastStudy,
    planStart,
    accuracy: m.score != null ? Math.max(0, Math.min(1, m.score / 100)) : null,
    strategy
  });
}
