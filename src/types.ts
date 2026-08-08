export type KnowledgeType = 'concept' | 'structure' | 'process' | 'comparison' | 'memory';
export type QuestionType = 'single' | 'judge' | 'short' | 'ai_open';
export type Importance = 'high' | 'medium' | 'low';
export type TaskKind = 'new' | 'review' | 'quiz';

export interface Subject {
  id: string;
  name: string;
  weight: number;
  chapters: { id: string; name: string }[];
}

export interface KnowledgeNode {
  id: string;
  name: string;
  subjectId: string;
  subject: string;
  chapterId: string;
  chapter: string;
  type: KnowledgeType;
  importance: Importance;
  difficulty: number;
  prerequisite: string[];
  related: string[];
  estimatedMinutes: number;
  elements: {
    summary: string;
    plain: string;
    definition: string;
    keyPoints: string[];
    pitfalls: string[];
    mnemonic: string;
  };
}

export interface Question {
  id: string;
  knowledge_id: string;
  type: QuestionType;
  difficulty: number;
  content: string;
  options?: string[];
  answer?: number | boolean;
  analysis?: string;
  reference?: string;
  grading_dimensions?: string[];
}

export interface ExamStrategy {
  plan: { defaultDays: number; phases: { name: string; ratio: number; desc: string }[] };
  dailyTask: { newKps: number; reviewKps: number; quizQuestions: number; priorityFormula: Record<string, number> };
  review: {
    intervals: number[];
    baseline: string;
    wrongResetTo: number;
    adaptive: {
      enabled: boolean;
      highAccuracyThreshold: number;
      highIntervalMultiplier: number;
      highStepAdvance: number;
      lowAccuracyThreshold: number;
      lowIntervalMultiplier: number;
      lowStepAdvance: number;
    };
    maxStep: number;
  };
  mastery: {
    weights: { learningCompletion: number; quizAccuracy: number; reviewPerformance: number; forgettingDecay: number };
    levels: { max: number; name: string }[];
    range: [number, number];
  };
  quiz: { passRule: string; attemptsPerMastery: number; cooldownAfterFail: string; timeLimitSeconds: number };
  pomodoro: { enabled: boolean; studyMinutes: number; breakMinutes: number; quizMinutes: number };
  wrongBook: { retryIntervals: number[]; retryPassRemoves: boolean };
}

export interface AiPromptDef {
  id: string;
  name: string;
  system: string;
  template: string;
}

export interface ExamPackage {
  exam: { id: string; name: string; type: string; year: string; version: string; description: string; defaultExamDate: string };
  subjects: Subject[];
  knowledge: KnowledgeNode[];
  questions: Question[];
  strategy: ExamStrategy;
  prompts: AiPromptDef[];
}

export interface UserProfile {
  id: 'main';
  examId: string;
  examDate: string;
  dailyTime: number;
  level: number;
  createdAt: string;
}

export interface MasteryRecord {
  knowledgeId: string;
  learned: boolean;
  score: number;
  reviewCount: number;
  lastStudy: string | null;
  lastReview: string | null;
  nextReview: string | null;
  lastFail?: string;
}

export interface LearningRecord {
  id?: number;
  knowledgeId: string;
  startTime: string;
  finishTime: string;
  durationSec: number;
  status: 'learned';
}

export interface QuizRecord {
  id?: number;
  knowledgeId: string;
  correct: number;
  total: number;
  durationSec: number;
  date: string;
}

export interface WrongItem {
  id?: number;
  questionId: string;
  knowledgeId: string;
  wrongCount: number;
  reason?: string;
  lastWrong: string;
}

export interface StudySession {
  id?: number;
  date: string;
  durationSec: number;
  source: 'plan' | 'free';
}

export interface DailyTask {
  id?: number;
  date: string;
  knowledgeId: string;
  kind: TaskKind;
  status: 'todo' | 'done';
}

export interface TodayTaskView {
  kind: TaskKind;
  knowledge: KnowledgeNode;
  done: boolean;
  due?: boolean;
}
