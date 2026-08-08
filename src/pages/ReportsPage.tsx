import { useRef, useState } from 'react';
import { useApp } from '../store';
import { Button, Card, Progress, SectionTitle } from '../components/ui';

export function ReportsPage() {
  const { pkg, mastery, wrong, stats, exportData, importData, clearAll } = useApp();
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ai-exam-os-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('已导出备份 JSON');
  };

  const doImport = async (f: File) => {
    try {
      const text = await f.text();
      await importData(text);
      setMsg('导入成功');
    } catch (e) {
      setMsg('导入失败：' + (e as Error).message);
    }
  };

  const subjects = pkg.subjects.map((s) => {
    const nodes = pkg.knowledge.filter((k) => k.subjectId === s.id);
    const learned = nodes.filter((k) => mastery.get(k.id)?.learned).length;
    const avg = nodes.length ? Math.round(nodes.reduce((a, k) => a + (mastery.get(k.id)?.score ?? 0), 0) / nodes.length) : 0;
    return { name: s.name, learned, total: nodes.length, avg };
  });

  return (
    <div>
      <Card>
        <SectionTitle>学习概览</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Mini label="知识覆盖" value={stats.coverage + '%'} />
          <Mini label="平均掌握度" value={stats.avgMastery + '%'} />
          <Mini label="连续学习" value={stats.streak + ' 天'} />
          <Mini label="错题数" value={String(wrong.length)} />
          <Mini label="今日专注" value={Math.round(stats.todaySec / 60) + ' 分'} />
          <Mini label="本周专注" value={Math.round(stats.weekSec / 60) + ' 分'} />
        </div>
      </Card>

      <Card>
        <SectionTitle>科目掌握度</SectionTitle>
        <div className="space-y-3">
          {subjects.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[12.5px] mb-1">
                <span className="font-bold">{s.name}</span>
                <span className="text-[#8A7B80]">{s.learned}/{s.total} · {s.avg}%</span>
              </div>
              <Progress value={s.avg} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>AI 能力（V1 说明）</SectionTitle>
        <div className="text-[12.5px] text-[#8A7B80] leading-relaxed">
          <p className="mb-2">当前为 L0 无 AI 模式：学习 / 测试 / 复习 / 统计全部本地运行，不发起任何 AI 请求。</p>
          <p className="mb-2">知识库内已提供「复制 AI 讲解」——固定提示词，粘贴到任意 AI 即可获得费曼式讲解（V1.5 将支持用户自带 Key 直连，遵循 Provider 模式）。</p>
        </div>
      </Card>

      <Card>
        <SectionTitle>数据管理</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" onClick={doExport}>导出备份</Button>
          <Button variant="soft" onClick={() => fileRef.current?.click()}>导入恢复</Button>
          <Button variant="ghost" onClick={async () => { if (confirm('确定清空全部本地数据吗？')) await clearAll(); }}>清空</Button>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        {msg && <div className="text-[12px] text-[#E8557A] mt-2">{msg}</div>}
        <div className="text-[11px] text-[#8A7B80] mt-2">数据仅保存在本机 IndexedDB；导出为 JSON，可在新设备导入恢复。</div>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white px-3 py-2.5">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] text-[#8A7B80]">{label}</div>
    </div>
  );
}
