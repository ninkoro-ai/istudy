import { useState } from 'react';
import { AppProvider, useApp } from './store';
import { SetupPage } from './pages/SetupPage';
import { TodayPage } from './pages/TodayPage';
import { LearnPage } from './pages/LearnPage';
import { QuizPage } from './pages/QuizPage';
import { ReviewPage } from './pages/ReviewPage';
import { ReportsPage } from './pages/ReportsPage';
import { todayStr } from './core/date';

type Tab = 'today' | 'learn' | 'quiz' | 'review' | 'reports';

function Shell() {
  const { profile, loading, pkg } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<'normal' | 'review' | 'wrongRetry'>('normal');

  const go = (t: string, opts?: { focusId?: string | null; quizMode?: string }) => {
    if (opts) {
      if (opts.focusId !== undefined) setFocusId(opts.focusId);
      if (opts.quizMode === 'review' || opts.quizMode === 'wrongRetry') setQuizMode(opts.quizMode);
      else if (opts.quizMode === 'normal') setQuizMode('normal');
    }
    setTab(t as Tab);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-sm text-[#8A7B80]">加载中…</div>;
  }
  if (!profile) return <SetupPage />;

  return (
    <div className="app max-w-[480px] mx-auto h-full flex flex-col bg-[#FAF7F5] relative overflow-hidden">
      <header className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3.5 pt-[calc(8px+env(safe-area-inset-top))] pb-2 bg-white border-b border-black/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B8A] to-[#E8557A] flex items-center justify-center text-white text-sm font-black shrink-0">A</div>
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold leading-tight">AI Exam OS</div>
            <div className="text-[10.5px] text-[#8A7B80]">{pkg.exam.name}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[13px] font-extrabold text-[#E8557A]">{todayStr()}</div>
          <div className="text-[10px] text-[#8A7B80]">考研备考</div>
        </div>
        <div className="justify-self-end text-right text-[10.5px] text-[#8A7B80]">
          <div>目标 {profile.examDate}</div>
          <div>{profile.dailyTime} 分/天</div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 pt-3 pb-[calc(60px+env(safe-area-inset-bottom)+16px)]">
        {tab === 'today' && <TodayPage go={go} />}
        {tab === 'learn' && <LearnPage focusId={focusId} go={go} />}
        {tab === 'quiz' && <QuizPage focusId={focusId} quizMode={quizMode} go={go} />}
        {tab === 'review' && <ReviewPage go={go} />}
        {tab === 'reports' && <ReportsPage />}
      </main>

      <nav className="tabbar fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white border-t border-black/5 flex z-50">
        {(
          [
            ['today', '今日', 'M12 3v10m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'],
            ['learn', '知识库', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
            ['quiz', '测评', 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
            ['review', '复习', 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'],
            ['reports', '报告', 'M3 3v18h18M7 14l4-4 3 3 5-6']
          ] as [Tab, string, string][]
        ).map(([id, label, path]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              'flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ' +
              (tab === id ? 'text-[#FF6B8A]' : 'text-[#8A7B80]')
            }
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={path} />
            </svg>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
