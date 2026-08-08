import { useMemo } from 'react';
import { useApp } from '../store';
import { Button, Card, Empty, Pill, SectionTitle } from '../components/ui';
import { addDays, todayStr } from '../core/date';

export function ReviewPage({ go }: { go: (tab: string, opts?: { focusId?: string | null; quizMode?: string }) => void }) {
  const { pkg, mastery } = useApp();
  const today = todayStr();

  const due = useMemo(() => {
    return pkg.knowledge
      .filter((k) => {
        const m = mastery.get(k.id);
        return m?.learned && m.nextReview !== null && m.nextReview <= today;
      })
      .sort((a, b) => (mastery.get(a.id)!.nextReview! < mastery.get(b.id)!.nextReview! ? -1 : 1));
  }, [pkg, mastery, today]);

  const upcoming = useMemo(() => {
    const horizon = addDays(today, 3);
    return pkg.knowledge
      .filter((k) => {
        const m = mastery.get(k.id);
        return m?.learned && m.nextReview !== null && m.nextReview > today && m.nextReview <= horizon;
      })
      .slice(0, 6);
  }, [pkg, mastery, today]);

  return (
    <div>
      <Card>
        <SectionTitle>今日到期复习（{due.length}）</SectionTitle>
        {due.length === 0 && <Empty text="今天没有待复习的知识点，保持得很好。" />}
        <div className="flex flex-col gap-2">
          {due.map((k) => {
            const m = mastery.get(k.id)!;
            return (
              <div key={k.id} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate">{k.name}</div>
                  <div className="text-[11px] text-[#8A7B80]">掌握 {m.score}% · 复习 {m.reviewCount}/{pkg.strategy.review.maxStep} 轮</div>
                </div>
                <Pill color="gold">到期</Pill>
                <Button variant="soft" className="min-h-[32px] px-3 text-[12px]" onClick={() => go('quiz', { focusId: k.id, quizMode: 'review' })}>
                  复习
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>未来 3 天待复习（{upcoming.length}）</SectionTitle>
        {upcoming.length === 0 && <Empty text="暂无近期复习安排。" />}
        <div className="flex flex-col gap-2">
          {upcoming.map((k) => (
            <div key={k.id} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold truncate">{k.name}</div>
                <div className="text-[11px] text-[#8A7B80]">下次复习 {mastery.get(k.id)?.nextReview}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
