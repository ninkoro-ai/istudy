import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Button, Card, Empty, Pill, SectionTitle } from '../components/ui';
import { buildPromptText } from '../ai/prompts';
import type { KnowledgeNode } from '../types';

export function LearnPage({ focusId, go }: { focusId: string | null; go: (tab: string, opts?: { focusId?: string | null; quizMode?: string }) => void }) {
  const { pkg, mastery, markLearned } = useApp();
  const [subjectId, setSubjectId] = useState(pkg.subjects[0]?.id);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [selected, setSelected] = useState<KnowledgeNode | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (focusId) {
      const kp = pkg.knowledge.find((k) => k.id === focusId);
      if (kp) {
        setSubjectId(kp.subjectId);
        setChapterId(kp.chapterId);
        setSelected(kp);
      }
    }
  }, [focusId, pkg]);

  const subject = pkg.subjects.find((s) => s.id === subjectId);
  const nodes = useMemo(() => {
    let list = pkg.knowledge;
    if (subjectId) list = list.filter((k) => k.subjectId === subjectId);
    if (chapterId) list = list.filter((k) => k.chapterId === chapterId);
    return list;
  }, [pkg, subjectId, chapterId]);

  const copyPrompt = async () => {
    const text = buildPromptText(pkg.prompts, 'teacher', {
      knowledge: selected?.name ?? '',
      subject: selected?.subject ?? '',
      level: selected ? (mastery.get(selected.id)?.learned ? '学习中' : '未学') : ''
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略 */
    }
  };

  if (selected) {
    const rec = mastery.get(selected.id);
    const pre = selected.prerequisite.map((id) => pkg.knowledge.find((k) => k.id === id)).filter(Boolean) as KnowledgeNode[];
    const rel = selected.related.map((id) => pkg.knowledge.find((k) => k.id === id)).filter(Boolean) as KnowledgeNode[];
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-[13px] font-bold text-[#E8557A] mb-2">‹ 返回知识库</button>
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Pill color="pink">{selected.subject}</Pill>
            <Pill color="gray">{selected.chapter}</Pill>
            <Pill color={rec?.learned ? 'green' : 'gray'}>{rec?.learned ? '学习中' : '未学'}</Pill>
          </div>
          <h2 className="text-xl font-extrabold mb-3">{selected.name}</h2>
          <div className="space-y-3 text-[14px] leading-relaxed">
            <Block title="一句话理解">{selected.elements.summary}</Block>
            <Block title="通俗解释">{selected.elements.plain}</Block>
            <Block title="专业定义">{selected.elements.definition}</Block>
            <Block title="核心考点">
              <ul className="list-disc pl-4 space-y-0.5">{selected.elements.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </Block>
            <Block title="易错点">
              <ul className="list-disc pl-4 space-y-0.5 text-[#C0392B]">{selected.elements.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </Block>
            <Block title="记忆方法">
              <span className="font-semibold">{selected.elements.mnemonic}</span>
            </Block>
          </div>
          {!rec?.learned && (
            <Button className="w-full mt-4" disabled={busy} onClick={async () => {
              if (busy) return;
              setBusy(true);
              try { await markLearned(selected.id); } finally { setBusy(false); }
            }}>
              {busy ? '记录中…' : '我已学会，记录学习'}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button variant="soft" onClick={() => go('quiz', { focusId: selected.id, quizMode: 'normal' })}>去测试</Button>
            <Button variant="gold" onClick={copyPrompt}>{copied ? '已复制 ✓' : '复制 AI 讲解'}</Button>
          </div>
        </Card>
        {(pre.length > 0 || rel.length > 0) && (
          <Card>
            <SectionTitle>关联知识点</SectionTitle>
            {pre.length > 0 && <div className="text-[12px] text-[#8A7B80] mb-1">前置：{pre.map((k) => k.name).join('、')}</div>}
            {rel.length > 0 && <div className="text-[12px] text-[#8A7B80]">相关：{rel.map((k) => k.name).join('、')}</div>}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      <Card>
        <SectionTitle>科目</SectionTitle>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pkg.subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSubjectId(s.id); setChapterId(null); }}
              className={'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border ' + (subjectId === s.id ? 'bg-[#FF6B8A] border-[#FF6B8A] text-white' : 'bg-white border-black/10 text-[#8A7B80]')}
            >
              {s.name}
            </button>
          ))}
        </div>
        {subject && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {subject.chapters.map((c) => (
              <button
                key={c.id}
                onClick={() => setChapterId(chapterId === c.id ? null : c.id)}
                className={'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ' + (chapterId === c.id ? 'bg-black/80 border-black text-white' : 'bg-white border-black/10 text-[#8A7B80]')}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>知识点（{nodes.length}）</SectionTitle>
        {nodes.length === 0 && <Empty text="该章节暂无知识点" />}
        <div className="flex flex-col gap-2">
          {nodes.map((k) => {
            const rec = mastery.get(k.id);
            return (
              <button key={k.id} onClick={() => setSelected(k)} className="text-left rounded-xl border border-black/5 bg-white px-3 py-2.5 flex items-center gap-2 active:scale-[.99] transition">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate">{k.name}</div>
                  <div className="text-[11px] text-[#8A7B80] truncate">{k.elements.summary}</div>
                </div>
                <Pill color={rec?.learned ? 'green' : 'gray'}>{rec ? rec.score + '%' : '未学'}</Pill>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#FFF6F0] border border-black/5 p-3">
      <div className="text-[11px] font-extrabold text-[#E8557A] mb-1">{title}</div>
      <div className="text-[13.5px] text-[#2B2328]">{children}</div>
    </div>
  );
}
