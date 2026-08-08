import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { Button, Card, Empty, Pill, Progress, SectionTitle } from '../components/ui';
import { daysUntilExam, phaseName } from '../core/date';

export function TodayPage({ go }: { go: (tab: string, opts?: { focusId?: string | null; quizMode?: string }) => void }) {
  const { pkg, profile, tasks, stats, today, planStart, markLearned, addSession } = useApp();
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [focused, setFocused] = useState<null | { kind: string; id: string; name: string }>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secRef = useRef(0);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        secRef.current += 1;
        setTimer(secRef.current);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  useEffect(() => {
    const commit = () => {
      if (running && secRef.current > 0) {
        void addSession(secRef.current, 'plan');
        secRef.current = 0;
        setTimer(0);
        setRunning(false);
      }
    };
    const onHide = () => { if (document.hidden) commit(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (running) commit();
    };
  }, [running, addSession]);

  if (!profile) return null;
  const remain = daysUntilExam(profile.examDate);
  const phase = phaseName(pkg.strategy, planStart, today);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const learnNew = async () => {
    if (!focused || busy) return;
    setBusy(true);
    try {
      await markLearned(focused.id);
      setFocused(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Card className="bg-gradient-to-br from-[#FF6B8A] to-[#E8557A] border-0 text-white relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="text-[12px] font-bold bg-white/20 rounded-full px-3 py-1 inline-block mb-2">距离考试 {remain} 天</div>
        <h2 className="text-[22px] font-extrabold leading-tight mb-1">今天按计划学习</h2>
        <div className="text-[12.5px] opacity-95 mb-4">{phase}阶段 · 每日 {profile.dailyTime} 分钟</div>
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <Stat label="知识覆盖" value={stats.coverage + '%'} />
          <Stat label="平均掌握度" value={stats.avgMastery + '%'} />
          <Stat label="连续学习" value={stats.streak + ' 天'} />
          <Stat label="今日专注" value={fmt(stats.todaySec)} />
        </div>
      </Card>

      <Card>
        <SectionTitle
          right={
            <button
              onClick={() => {
                if (running) {
                  if (secRef.current > 0) void addSession(secRef.current, 'plan');
                  secRef.current = 0;
                  setTimer(0);
                  setRunning(false);
                }
                else { setRunning(true); secRef.current = 0; setTimer(0); }
              }}
              className="text-[12px] font-bold text-[#E8557A]"
            >
              {running ? '结束计时' : '开始计时'}
            </button>
          }
        >
          专注计时
        </SectionTitle>
        <div className="text-center text-3xl font-extrabold font-mono text-[#2B2328]">{fmt(timer)}</div>
        <p className="text-center text-[11px] text-[#8A7B80] mt-1">计时数据计入学习报告；切后台超过 2 分钟自动暂停</p>
      </Card>

      <Card>
        <SectionTitle>今日任务</SectionTitle>
        {tasks.length === 0 && <Empty text="今天没有安排，好好休息。" />}
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <div key={t.kind + t.knowledge.id} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
              <Pill color={t.kind === 'new' ? 'pink' : t.kind === 'review' ? 'gold' : 'green'}>
                {t.kind === 'new' ? '新学' : t.kind === 'review' ? '复习' : '测试'}
              </Pill>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold truncate">{t.knowledge.name}</div>
                <div className="text-[11px] text-[#8A7B80] truncate">{t.knowledge.chapter} · 约 {t.knowledge.estimatedMinutes} 分钟</div>
              </div>
              {t.kind === 'new' && (
                <Button variant="soft" className="min-h-[32px] px-3 text-[12px]" onClick={() => setFocused({ kind: 'new', id: t.knowledge.id, name: t.knowledge.name })}>
                  学习
                </Button>
              )}
              {t.kind === 'review' && (
                <Button variant="soft" className="min-h-[32px] px-3 text-[12px]" onClick={() => go('quiz', { focusId: t.knowledge.id, quizMode: 'review' })}>
                  复习
                </Button>
              )}
              {t.kind === 'quiz' && (
                <Button variant="soft" className="min-h-[32px] px-3 text-[12px]" onClick={() => go('quiz', { focusId: t.knowledge.id, quizMode: 'normal' })}>
                  测试
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>学习进度</SectionTitle>
        <div className="text-[12px] text-[#8A7B80] mb-1.5">知识覆盖 {stats.learned}/{stats.total}</div>
        <Progress value={stats.coverage} />
        <div className="text-[11px] text-[#8A7B80] mt-2">本周专注 {Math.round(stats.weekSec / 60)} 分钟 · 全部数据仅存本机</div>
      </Card>

      {focused && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center" onClick={() => setFocused(null)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-5 pb-[calc(20px+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-9 h-1.5 rounded-full bg-black/10 mb-4" />
            <div className="text-lg font-extrabold mb-1">{focused.name}</div>
            <p className="text-[13px] text-[#8A7B80] mb-4">学习完成后将记录为“已学习”，进入复习排期。</p>
            <Button className="w-full" onClick={learnNew} disabled={busy}>{busy ? '记录中…' : '我已学会，记录学习'}</Button>
            <Button variant="ghost" className="w-full mt-2" onClick={() => go('learn', { focusId: focused.id })}>先去知识库阅读</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 border border-white/20 px-3 py-2.5">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] opacity-90">{label}</div>
    </div>
  );
}
