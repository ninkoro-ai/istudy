import { useState } from 'react';
import { useApp } from '../store';
import { Button, Card, Field, inputCls, SectionTitle } from '../components/ui';

export function SetupPage() {
  const { pkg, createProfile } = useApp();
  const [examDate, setExamDate] = useState(pkg.exam.defaultExamDate);
  const [dailyTime, setDailyTime] = useState(60);
  const [level, setLevel] = useState(2);

  return (
    <div className="max-w-[480px] mx-auto h-full overflow-y-auto bg-[#FAF7F5] px-4 pt-[calc(20px+env(safe-area-inset-top))] pb-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-[#FF6B8A] to-[#E8557A] text-white text-3xl font-black shadow-lg shadow-pink-200 mb-3">A</div>
        <h1 className="text-2xl font-extrabold">AI Exam OS</h1>
        <p className="text-sm text-[#8A7B80] mt-1">本地优先 · AI 个性化考试学习系统</p>
      </div>

      <Card>
        <SectionTitle>创建考试目标</SectionTitle>
        <Field label="考试">
          <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[15px] font-semibold">
            {pkg.exam.name}（{pkg.exam.year} · A 部分：植物学 / 植物生理学 / 遗传学）
          </div>
        </Field>
        <Field label="考试日期">
          <input type="date" className={inputCls} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </Field>
        <Field label="每日可投入学习时间">
          <select className={inputCls} value={dailyTime} onChange={(e) => setDailyTime(Number(e.target.value))}>
            <option value={30}>30 分钟</option>
            <option value={60}>60 分钟（推荐）</option>
            <option value={90}>90 分钟</option>
            <option value={120}>120 分钟</option>
          </select>
        </Field>
        <Field label="当前基础水平（1=薄弱，5=较好）">
          <select className={inputCls} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            <option value={1}>1 · 薄弱</option>
            <option value={2}>2 · 一般</option>
            <option value={3}>3 · 中等</option>
            <option value={4}>4 · 良好</option>
            <option value={5}>5 · 较好</option>
          </select>
        </Field>
        <Button className="w-full mt-2" onClick={() => createProfile({ examDate, dailyTime, level })}>
          生成学习计划并开始
        </Button>
        <p className="text-[11px] text-[#8A7B80] text-center mt-3">
          所有数据仅保存在本机浏览器（IndexedDB），可导出备份迁移。
        </p>
      </Card>
    </div>
  );
}
