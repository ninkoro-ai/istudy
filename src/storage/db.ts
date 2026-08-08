import Dexie, { type Table } from 'dexie';
import type {
  UserProfile, MasteryRecord, LearningRecord, QuizRecord, WrongItem, StudySession, DailyTask
} from '../types';

class AppDB extends Dexie {
  userProfile!: Table<UserProfile, string>;
  mastery!: Table<MasteryRecord, string>;
  learningRecords!: Table<LearningRecord, number>;
  quizRecords!: Table<QuizRecord, number>;
  wrongBook!: Table<WrongItem, number>;
  studySessions!: Table<StudySession, number>;
  dailyTasks!: Table<DailyTask, number>;

  constructor() {
    super('ai-exam-os');
    this.version(1).stores({
      userProfile: 'id',
      mastery: 'knowledgeId',
      learningRecords: '++id, knowledgeId, finishTime',
      quizRecords: '++id, knowledgeId, date',
      wrongBook: '++id, knowledgeId, questionId, lastWrong',
      studySessions: '++id, date',
      dailyTasks: '++id, date, knowledgeId, kind'
    });
  }
}

export const db = new AppDB();

export async function getProfile(): Promise<UserProfile | undefined> {
  return db.userProfile.get('main');
}

export async function getMasteryAll(): Promise<Map<string, MasteryRecord>> {
  const rows = await db.mastery.toArray();
  return new Map(rows.map((r) => [r.knowledgeId, r]));
}

export async function getMastery(knowledgeId: string): Promise<MasteryRecord | undefined> {
  return db.mastery.get(knowledgeId);
}

export async function saveMastery(rec: MasteryRecord): Promise<void> {
  await db.mastery.put(rec);
}

export async function getWrongAll(): Promise<WrongItem[]> {
  return db.wrongBook.toArray();
}

export async function wrongCountFor(knowledgeId: string): Promise<number> {
  const rows = await db.wrongBook.where('knowledgeId').equals(knowledgeId).toArray();
  return rows.reduce((a, r) => a + r.wrongCount, 0);
}

export async function addWrong(questionId: string, knowledgeId: string): Promise<void> {
  const existing = await db.wrongBook.where('questionId').equals(questionId).first();
  if (existing) {
    await db.wrongBook.update(existing.id!, { wrongCount: existing.wrongCount + 1, lastWrong: todayISO() });
  } else {
    await db.wrongBook.add({ questionId, knowledgeId, wrongCount: 1, lastWrong: todayISO() });
  }
}

export async function removeWrongForKnowledge(knowledgeId: string): Promise<void> {
  const rows = await db.wrongBook.where('knowledgeId').equals(knowledgeId).toArray();
  await db.wrongBook.bulkDelete(rows.map((r) => r.id!).filter((x) => x !== undefined));
}

export async function addStudySession(durationSec: number, source: 'plan' | 'free'): Promise<void> {
  if (durationSec <= 0) return;
  await db.studySessions.add({ date: todayISO(), durationSec, source });
}

export async function sessionsOfDate(date: string): Promise<number> {
  const rows = await db.studySessions.where('date').equals(date).toArray();
  return rows.reduce((a, r) => a + r.durationSec, 0);
}

export async function sessionsWeek(): Promise<number> {
  const rows = await db.studySessions.toArray();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const key = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
  return rows.filter((r) => r.date >= key).reduce((a, r) => a + r.durationSec, 0);
}

export async function learningDoneDates(): Promise<Set<string>> {
  const rows = await db.learningRecords.toArray();
  const set = new Set<string>();
  for (const r of rows) set.add(r.finishTime.slice(0, 10));
  return set;
}

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.userProfile.clear(),
    db.mastery.clear(),
    db.learningRecords.clear(),
    db.quizRecords.clear(),
    db.wrongBook.clear(),
    db.studySessions.clear(),
    db.dailyTasks.clear()
  ]);
}
