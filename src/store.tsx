import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { agriculture339 } from './exam-engine/loader';
import * as store from './storage/db';
import type { ExamPackage, UserProfile, MasteryRecord, WrongItem, TodayTaskView } from './types';
import { todayStr, daysBetween, addDays } from './core/date';
import { todayTasks, progressStats, wrongCountOf } from './core/scheduler';
import { applyReview, nextReviewDate } from './core/review-engine';
import { computeScore } from './core/mastery-engine';
import { pct } from './core/utils';

export interface QuizOutcome {
  passed: boolean;
  need: number;
  correct: number;
  total: number;
}

interface AppState {
  pkg: ExamPackage;
  profile: UserProfile | null;
  mastery: Map<string, MasteryRecord>;
  wrong: WrongItem[];
  tasks: TodayTaskView[];
  stats: { total: number; learned: number; coverage: number; avgMastery: number; streak: number; todaySec: number; weekSec: number };
  today: string;
  planStart: string;
  loading: boolean;
  refresh: () => Promise<void>;
  createProfile: (p: { examDate: string; dailyTime: number; level: number }) => Promise<void>;
  markLearned: (knowledgeId: string, durationSec?: number) => Promise<void>;
  markReviewed: (knowledgeId: string) => Promise<void>;
  submitQuiz: (args: {
    knowledgeId: string;
    correct: number;
    total: number;
    wrongQuestionIds: string[];
    durationSec: number;
    asReview: boolean;
    asWrongRetry: boolean;
  }) => Promise<QuizOutcome>;
  addSession: (durationSec: number, source: 'plan' | 'free') => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const pkg = agriculture339;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mastery, setMastery] = useState<Map<string, MasteryRecord>>(new Map());
  const [wrong, setWrong] = useState<WrongItem[]>([]);
  const [tasks, setTasks] = useState<TodayTaskView[]>([]);
  const [stats, setStats] = useState<AppState['stats']>({ total: 0, learned: 0, coverage: 0, avgMastery: 0, streak: 0, todaySec: 0, weekSec: 0 });
  const [loading, setLoading] = useState(true);
  const today = todayStr();

  const refresh = useCallback(async () => {
    const [prof, m, w, doneDates, todaySec, weekSec] = await Promise.all([
      store.getProfile(),
      store.getMasteryAll(),
      store.getWrongAll(),
      store.learningDoneDates(),
      store.sessionsOfDate(today),
      store.sessionsWeek()
    ]);
    setProfile(prof ?? null);
    setMastery(m);
    setWrong(w);
    if (prof) {
      const planStart = prof.createdAt.slice(0, 10);
      setTasks(todayTasks({ pkg, mastery: m, wrong: w, today, planStart }));
      setStats({
        ...progressStats(pkg, m),
        streak: streakFrom(doneDates, today),
        todaySec,
        weekSec
      });
    }
    setLoading(false);
  }, [pkg, today]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const createProfile = useCallback(async (p: { examDate: string; dailyTime: number; level: number }) => {
    const prof: UserProfile = { id: 'main', examId: pkg.exam.id, examDate: p.examDate, dailyTime: p.dailyTime, level: p.level, createdAt: new Date().toISOString() };
    await store.db.userProfile.put(prof);
    await refresh();
  }, [pkg, refresh]);

  const markLearned = useCallback(async (knowledgeId: string, durationSec = 15 * 60) => {
    const existing = await store.getMastery(knowledgeId);
    const wrongCount = await store.wrongCountFor(knowledgeId);
    const rec: MasteryRecord = {
      knowledgeId,
      learned: true,
      score: computeScore({
        learned: true,
        quizAccuracy: existing?.score ? Math.max(0.5, Math.min(1, existing.score / 100)) : 0.5,
        reviewCount: existing?.reviewCount ?? 0,
        wrongCount,
        daysSinceStudy: existing?.lastStudy ? daysBetween(existing.lastStudy, today) : 0,
        strategy: pkg.strategy
      }),
      reviewCount: existing?.reviewCount ?? 0,
      lastStudy: today,
      lastReview: existing?.lastReview ?? null,
      nextReview: nextReviewDate({
        learned: true,
        reviewCount: existing?.reviewCount ?? 0,
        lastReview: existing?.lastReview ?? null,
        lastStudy: today,
        planStart: profile?.createdAt.slice(0, 10) ?? today,
        accuracy: null,
        strategy: pkg.strategy
      }),
      lastFail: existing?.lastFail
    };
    await store.saveMastery(rec);
    await store.db.learningRecords.add({
      knowledgeId,
      startTime: new Date(Date.now() - durationSec * 1000).toISOString(),
      finishTime: new Date().toISOString(),
      durationSec,
      status: 'learned'
    });
    await store.addStudySession(durationSec, 'plan');
    await refresh();
  }, [pkg, profile, refresh, today]);

  const markReviewed = useCallback(async (knowledgeId: string) => {
    const rec = (await store.getMastery(knowledgeId)) ?? {
      knowledgeId, learned: true, score: 0, reviewCount: 0, lastStudy: today, lastReview: null, nextReview: null
    };
    const r = applyReview(rec, true, 0.7, today, pkg.strategy);
    const wrongCount = await store.wrongCountFor(knowledgeId);
    await store.saveMastery({
      ...rec,
      learned: true,
      reviewCount: r.reviewCount,
      lastReview: r.lastReview,
      nextReview: r.nextReview,
      lastFail: undefined,
      score: computeScore({
        learned: true,
        quizAccuracy: 0.7,
        reviewCount: r.reviewCount,
        wrongCount,
        daysSinceStudy: rec.lastStudy ? daysBetween(rec.lastStudy, today) : 0,
        strategy: pkg.strategy
      })
    });
    await refresh();
  }, [pkg, refresh, today]);

  const submitQuiz = useCallback(async (args: {
    knowledgeId: string;
    correct: number;
    total: number;
    wrongQuestionIds: string[];
    durationSec: number;
    asReview: boolean;
    asWrongRetry: boolean;
  }): Promise<QuizOutcome> => {
    const { knowledgeId, correct, total, wrongQuestionIds, durationSec, asReview, asWrongRetry } = args;
    const strategy = pkg.strategy;
    const need = total <= 3 ? total : total - 1;
    const passed = correct >= need;
    const accuracy = total > 0 ? correct / total : 0;

    const existing = (await store.getMastery(knowledgeId)) ?? {
      knowledgeId, learned: false, score: 0, reviewCount: 0, lastStudy: null, lastReview: null, nextReview: null
    };

    // 错题入库
    for (const qid of wrongQuestionIds) await store.addWrong(qid, knowledgeId);
    const wrongCount = await store.wrongCountFor(knowledgeId);

    let rec: MasteryRecord = { ...existing };
    if (passed) {
      rec.lastFail = undefined;
      if (asReview) {
        const r = applyReview(rec, true, accuracy, today, strategy);
        rec = { ...rec, reviewCount: r.reviewCount, lastReview: r.lastReview, nextReview: r.nextReview, learned: true };
        if (asWrongRetry && strategy.wrongBook.retryPassRemoves) await store.removeWrongForKnowledge(knowledgeId);
      } else {
        if (!rec.learned) {
          rec = {
            ...rec,
            learned: true,
            lastStudy: today,
            nextReview: nextReviewDate({
              learned: true,
              reviewCount: rec.reviewCount,
              lastReview: rec.lastReview,
              lastStudy: today,
              planStart: profile?.createdAt.slice(0, 10) ?? today,
              accuracy,
              strategy
            }),
            lastFail: undefined
          };
          // 首次通过测评视为一次学习事件（计入连续学习）
          await store.db.learningRecords.add({
            knowledgeId,
            startTime: new Date(Date.now() - durationSec * 1000).toISOString(),
            finishTime: new Date().toISOString(),
            durationSec,
            status: 'learned'
          });
        }
      }
      rec.score = computeScore({
        learned: true,
        quizAccuracy: accuracy,
        reviewCount: rec.reviewCount,
        wrongCount,
        daysSinceStudy: rec.lastStudy ? daysBetween(rec.lastStudy, today) : 0,
        strategy
      });
    } else {
      rec.lastFail = new Date().toISOString();
      rec.score = computeScore({
        learned: rec.learned,
        quizAccuracy: accuracy,
        reviewCount: rec.reviewCount,
        wrongCount,
        daysSinceStudy: rec.lastStudy ? daysBetween(rec.lastStudy, today) : 0,
        strategy
      });
    }

    await store.saveMastery(rec);
    await store.db.quizRecords.add({ knowledgeId, correct, total, durationSec, date: today });
    await store.addStudySession(Math.round(durationSec), 'plan');
    await refresh();
    return { passed, need, correct, total };
  }, [pkg, profile, refresh, today]);

  const addSession = useCallback(async (durationSec: number, source: 'plan' | 'free') => {
    await store.addStudySession(durationSec, source);
    await refresh();
  }, [refresh]);

  const exportData = useCallback(async () => {
    const learningRecords = await store.db.learningRecords.toArray();
    const studySessions = await store.db.studySessions.toArray();
    const quizRecords = await store.db.quizRecords.toArray();
    return JSON.stringify(
      {
        type: 'ai-exam-os', v: 1, exportedAt: new Date().toISOString(),
        profile, mastery: [...mastery.values()], wrong,
        learningRecords, studySessions, quizRecords
      },
      null,
      2
    );
  }, [profile, mastery, wrong]);

  const importData = useCallback(async (json: string) => {
    const d = JSON.parse(json);
    if (!d || d.type !== 'ai-exam-os' || d.v !== 1) throw new Error('格式或版本不兼容');
    await store.clearAllData();
    const clampInt = (v: unknown, min: number, max: number, def: number) => {
      const n = Math.floor(Number(v));
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
    };
    const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
    if (d.profile && typeof d.profile === 'object' && d.profile.id === 'main') {
      const p = d.profile as UserProfile;
      await store.db.userProfile.put({
        id: 'main',
        examId: typeof p.examId === 'string' ? p.examId : pkg.exam.id,
        examDate: typeof p.examDate === 'string' && p.examDate.length === 10 ? p.examDate : pkg.exam.defaultExamDate,
        dailyTime: clampInt(p.dailyTime, 10, 600, 60),
        level: clampInt(p.level, 1, 5, 2),
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString()
      });
    }
    if (Array.isArray(d.mastery)) {
      for (const m of d.mastery) {
        if (!m || typeof m.knowledgeId !== 'string') continue;
        await store.db.mastery.put({
          knowledgeId: m.knowledgeId,
          learned: !!m.learned,
          score: clampInt(m.score, 0, 100, 0),
          reviewCount: clampInt(m.reviewCount, 0, 10, 0),
          lastStudy: strOrNull(m.lastStudy),
          lastReview: strOrNull(m.lastReview),
          nextReview: strOrNull(m.nextReview),
          lastFail: typeof m.lastFail === 'string' ? m.lastFail : undefined
        });
      }
    }
    if (Array.isArray(d.wrong)) {
      for (const w of d.wrong) {
        if (!w || typeof w.questionId !== 'string' || typeof w.knowledgeId !== 'string') continue;
        await store.db.wrongBook.add({
          questionId: w.questionId,
          knowledgeId: w.knowledgeId,
          wrongCount: clampInt(w.wrongCount, 1, 999, 1),
          lastWrong: typeof w.lastWrong === 'string' ? w.lastWrong : new Date().toISOString()
        });
      }
    }
    if (Array.isArray(d.learningRecords)) {
      for (const r of d.learningRecords) {
        if (!r || typeof r.knowledgeId !== 'string') continue;
        await store.db.learningRecords.add({
          knowledgeId: r.knowledgeId,
          startTime: typeof r.startTime === 'string' ? r.startTime : new Date().toISOString(),
          finishTime: typeof r.finishTime === 'string' ? r.finishTime : new Date().toISOString(),
          durationSec: clampInt(r.durationSec, 0, 86400 * 30, 0),
          status: 'learned'
        });
      }
    }
    if (Array.isArray(d.studySessions)) {
      for (const s of d.studySessions) {
        if (!s || typeof s.date !== 'string') continue;
        await store.db.studySessions.add({
          date: s.date,
          durationSec: clampInt(s.durationSec, 0, 86400 * 30, 0),
          source: s.source === 'free' ? 'free' : 'plan'
        });
      }
    }
    if (Array.isArray(d.quizRecords)) {
      for (const q of d.quizRecords) {
        if (!q || typeof q.knowledgeId !== 'string') continue;
        await store.db.quizRecords.add({
          knowledgeId: q.knowledgeId,
          correct: clampInt(q.correct, 0, 100, 0),
          total: clampInt(q.total, 1, 100, 1),
          durationSec: clampInt(q.durationSec, 0, 86400 * 30, 0),
          date: typeof q.date === 'string' ? q.date : new Date().toISOString()
        });
      }
    }
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await store.clearAllData();
    await refresh();
  }, [refresh]);

  const value: AppState = {
    pkg, profile, mastery, wrong, tasks, stats, today,
    planStart: profile?.createdAt.slice(0, 10) ?? today,
    loading,
    refresh, createProfile, markLearned, markReviewed, submitQuiz, addSession, exportData, importData, clearAll
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function streakFrom(doneDates: Set<string>, today: string): number {
  let n = 0;
  for (let i = 0; i < 1000; i++) {
    if (doneDates.has(addDays(today, -i))) n++;
    else break;
  }
  return n;
}

export { pct, wrongCountOf };
