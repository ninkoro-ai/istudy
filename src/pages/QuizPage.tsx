import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Button, Card, Chip, Empty, Pill, SectionTitle } from '../components/ui';
import { addDays, todayStr } from '../core/date';
import type { KnowledgeNode, Question } from '../types';

export function QuizPage({ focusId, quizMode, go }: { focusId: string | null; quizMode: string; go: (tab: string, opts?: { focusId?: string | null; quizMode?: string }) => void }) {
  const { pkg, mastery, wrong, submitQuiz, markReviewed } = useApp();
  const [sub, setSub] = useState<'quiz' | 'wrong'>('quiz');
  const [kp, setKp] = useState<KnowledgeNode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number | boolean | null>>({});
  const [selfRate, setSelfRate] = useState<Record<number, boolean>>({});
  const [seconds, setSeconds] = useState(pkg.strategy.quiz.timeLimitSeconds);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; need: number; correct: number; total: number } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState('');

  const startQuiz = (k: KnowledgeNode, mode: string) => {
    const qs = pkg.questions.filter((q) => q.knowledge_id === k.id).slice(0, 5);
    setKp(k);
    setQuestions(qs);
    setAnswers({});
    setSelfRate({});
    setSeconds(pkg.strategy.quiz.timeLimitSeconds);
    setSubmitted(false);
    setResult(null);
    setAttempts(0);
    setBlocked('');
    const rec = mastery.get(k.id);
    if (mode === 'normal' && rec?.lastFail) {
      const elapsed = Date.now() - new Date(rec.lastFail).getTime();
      if (elapsed < 24 * 3600 * 1000) {
        setBlocked('该知识点 24 小时冷却期内，请先复习或明天再挑战。');
        return;
      }
    }
    void mode;
  };

  useEffect(() => {
    if (focusId) {
      const k = pkg.knowledge.find((x) => x.id === focusId);
      if (k) startQuiz(k, quizMode);
    }
  }, [focusId]);

  useEffect(() => {
    if (!kp || submitted) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [kp, submitted]);

  useEffect(() => {
    if (kp && !submitted && seconds <= 0) handleSubmit();
  }, [seconds, kp, submitted]);

  const answeredCount = questions.filter((q, i) => {
    if (q.type === 'single' || q.type === 'judge') return answers[i] !== undefined && answers[i] !== null;
    return selfRate[i] !== undefined;
  }).length;

  const handleSubmit = async () => {
    if (!kp || submitted) return;
    let correct = 0;
    const wrongIds: string[] = [];
    questions.forEach((q, i) => {
      let ok = false;
      if (q.type === 'single') ok = answers[i] === q.answer;
      else if (q.type === 'judge') ok = answers[i] === q.answer;
      else if (q.type === 'short' || q.type === 'ai_open') ok = selfRate[i] === true;
      if (ok) correct++;
      else wrongIds.push(q.id);
    });
    setSubmitted(true);
    const r = await submitQuiz({
      knowledgeId: kp.id,
      correct,
      total: questions.length,
      wrongQuestionIds: wrongIds,
      durationSec: pkg.strategy.quiz.timeLimitSeconds - seconds,
      asReview: quizMode === 'review',
      asWrongRetry: quizMode === 'wrongRetry'
    });
    setResult(r);
    setAttempts((a) => a + 1);
  };

  const dueRetry = (knowledgeId: string, wrongCount: number) => {
    const intervals = pkg.strategy.wrongBook.retryIntervals;
    const gap = intervals[Math.min(Math.max(wrongCount - 1, 0), intervals.length - 1)];
    const row = wrong.filter((w) => w.knowledgeId === knowledgeId).sort((a, b) => (a.lastWrong < b.lastWrong ? -1 : 1))[0];
    if (!row) return true;
    return addDays(row.lastWrong.slice(0, 10), gap) <= todayStr();
  };

  const wrongGroups = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const w of wrong) {
      const k = pkg.knowledge.find((x) => x.id === w.knowledgeId);
      const cur = map.get(w.knowledgeId) ?? { name: k?.name ?? w.knowledgeId, count: 0 };
      cur.count += w.wrongCount;
      map.set(w.knowledgeId, cur);
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  }, [wrong, pkg]);

  if (kp) {
    return (
      <div>
        <button onClick={() => { setKp(null); go('quiz', { focusId: null }); }} className="text-[13px] font-bold text-[#E8557A] mb-2">‹ 返回测评</button>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <Pill color={quizMode === 'review' ? 'gold' : quizMode === 'wrongRetry' ? 'green' : 'pink'}>
                {quizMode === 'review' ? '复习模式' : quizMode === 'wrongRetry' ? '错题重练' : '掌握测评'}
              </Pill>
              <div className="text-lg font-extrabold mt-1">{kp.name}</div>
            </div>
            <div className="text-xl font-extrabold font-mono text-[#E8557A]">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
          </div>

          {questions.length === 0 && (
            <>
              <Empty text="该知识点暂无题目，请先回知识库学习。" />
              {quizMode === 'review' ? (
                <Button className="w-full" onClick={async () => { await markReviewed(kp.id); setKp(null); }}>标记已复习</Button>
              ) : (
                <Button variant="soft" className="w-full" onClick={() => go('learn', { focusId: kp.id })}>去知识库学习</Button>
              )}
            </>
          )}

          {blocked && <Empty text={blocked} />}

          {!submitted && !blocked && questions.length > 0 && (
            <div className="space-y-3 mt-3">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl bg-[#FFF6F0] border border-black/5 p-3">
                  <div className="text-[14px] font-bold mb-2">{i + 1}. {q.content} <span className="text-[10px] text-[#8A7B80] font-normal">({typeName(q.type)})</span></div>
                  {q.type === 'single' && q.options && (
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((op, oi) => (
                        <button
                          key={oi}
                          onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                          className={'text-left rounded-lg border px-3 py-2 text-[13.5px] ' + (answers[i] === oi ? 'border-[#FF6B8A] bg-pink-50 text-[#E8557A] font-bold' : 'border-black/10 bg-white')}
                        >
                          {['A', 'B', 'C', 'D'][oi]}. {op}
                        </button>
                      ))}
                    </div>
                  )}
                  {q.type === 'judge' && (
                    <div className="flex gap-2">
                      {[true, false].map((v) => (
                        <button
                          key={String(v)}
                          onClick={() => setAnswers((a) => ({ ...a, [i]: v }))}
                          className={'flex-1 rounded-lg border px-3 py-2 text-[13.5px] ' + (answers[i] === v ? 'border-[#FF6B8A] bg-pink-50 text-[#E8557A] font-bold' : 'border-black/10 bg-white')}
                        >
                          {v ? '正确' : '错误'}
                        </button>
                      ))}
                    </div>
                  )}
                  {(q.type === 'short' || q.type === 'ai_open') && (
                    <div>
                      <div className="rounded-lg bg-white border border-black/10 p-3 text-[12.5px] text-[#8A7B80]">参考答案：{q.reference}</div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setSelfRate((r) => ({ ...r, [i]: true }))} className={'flex-1 rounded-lg border px-3 py-2 text-[13px] ' + (selfRate[i] === true ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-black/10 bg-white')}>我答对了</button>
                        <button onClick={() => setSelfRate((r) => ({ ...r, [i]: false }))} className={'flex-1 rounded-lg border px-3 py-2 text-[13px] ' + (selfRate[i] === false ? 'border-red-400 bg-red-50 text-red-600 font-bold' : 'border-black/10 bg-white')}>未答对</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Button className="w-full" onClick={handleSubmit} disabled={answeredCount < questions.length}>
                提交答卷（已答 {answeredCount}/{questions.length}）
              </Button>
            </div>
          )}

          {submitted && result && (
            <div className="mt-3">
              <div className={'rounded-xl p-4 text-center font-extrabold text-[16px] ' + (result.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                {result.passed ? '✓ 通过' : '✗ 未通过'} · 答对 {result.correct}/{result.total}（需 {result.need}）
              </div>
              {!result.passed && attempts >= pkg.strategy.quiz.attemptsPerMastery && (
                <div className="text-[12px] text-center text-[#8A7B80] mt-2">已达本次测评上限，请复习后再试（24 小时后可重新挑战）。</div>
              )}
              <div className="mt-3 space-y-2">
                {questions.map((q, i) => {
                  const ok = q.type === 'single' || q.type === 'judge' ? answers[i] === q.answer : selfRate[i] === true;
                  return (
                    <div key={q.id} className={'rounded-xl border p-3 ' + (ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50')}>
                      <div className="text-[13px] font-bold">{ok ? '✓' : '✗'} {q.content}</div>
                      {q.analysis && <div className="text-[12px] text-[#8A7B80] mt-1">{q.analysis}</div>}
                      {q.reference && !ok && <div className="text-[12px] text-emerald-700 mt-1">参考答案：{q.reference}</div>}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="soft" onClick={() => setKp(null)}>返回列表</Button>
                <Button onClick={() => startQuiz(kp, quizMode)} disabled={!result.passed && attempts >= pkg.strategy.quiz.attemptsPerMastery}>再测一次</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Chip active={sub === 'quiz'} onClick={() => setSub('quiz')}>测评</Chip>
        <Chip active={sub === 'wrong'} onClick={() => setSub('wrong')}>错题（{wrong.length}）</Chip>
      </div>

      {sub === 'quiz' && (
        <Card>
          <SectionTitle>今日测评</SectionTitle>
          {(() => {
            const pool = pkg.knowledge.filter((k) => pkg.questions.some((q) => q.knowledge_id === k.id)).slice(0, 12);
            return (
              <div className="flex flex-col gap-2">
                {pool.map((k) => (
                  <div key={k.id} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold truncate">{k.name}</div>
                      <div className="text-[11px] text-[#8A7B80]">{k.subject} · {pkg.questions.filter((q) => q.knowledge_id === k.id).length} 题</div>
                    </div>
                    <Button variant="soft" className="min-h-[32px] px-3 text-[12px]" onClick={() => startQuiz(k, 'normal')}>开始</Button>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      )}

      {sub === 'wrong' && (
        <Card>
          <SectionTitle>错题本</SectionTitle>
          {wrongGroups.length === 0 && <Empty text="还没有错题，继续保持。" />}
          <div className="flex flex-col gap-2">
            {wrongGroups.map((g) => {
              const due = dueRetry(g.id, g.count);
              return (
                <div key={g.id} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate">{g.name}</div>
                    <div className="text-[11px] text-[#8A7B80]">错 {g.count} 次 · {due ? '可重练' : '按 [1,3,7] 天排期'}</div>
                  </div>
                  <Button variant="soft" className="min-h-[32px] px-3 text-[12px]" disabled={!due} onClick={() => startQuiz(pkg.knowledge.find((x) => x.id === g.id)!, 'wrongRetry')}>
                    {due ? '去重练' : '未到期'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function typeName(t: string): string {
  return ({ single: '单选', judge: '判断', short: '简答', ai_open: 'AI 问答' } as Record<string, string>)[t] ?? t;
}
