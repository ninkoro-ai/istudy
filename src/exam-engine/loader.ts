import examJson from '../../config/agriculture_339/exam.json';
import subjectsJson from '../../config/agriculture_339/subjects.json';
import knowledgeJson from '../../config/agriculture_339/knowledge.json';
import questionsJson from '../../config/agriculture_339/questions.json';
import strategyJson from '../../config/agriculture_339/learning_strategy.json';
import promptsJson from '../../config/agriculture_339/ai_prompt.json';
import type { AiPromptDef, ExamPackage, ExamStrategy, KnowledgeNode, Question } from '../types';

export function loadAgriculture339(): ExamPackage {
  const pkg: ExamPackage = {
    exam: examJson as ExamPackage['exam'],
    subjects: subjectsJson.subjects,
    knowledge: knowledgeJson.nodes as unknown as KnowledgeNode[],
    questions: questionsJson.questions as unknown as Question[],
    strategy: strategyJson as unknown as ExamStrategy,
    prompts: promptsJson.prompts as AiPromptDef[]
  };
  const errors = validatePackage(pkg);
  if (errors.length) throw new Error('Exam Package 校验失败: ' + errors.join('; '));
  return pkg;
}

export function validatePackage(pkg: ExamPackage): string[] {
  const errors: string[] = [];
  const ids = new Set(pkg.knowledge.map((k) => k.id));
  const subIds = new Set(pkg.subjects.map((s) => s.id));
  for (const k of pkg.knowledge) {
    if (!ids.has(k.id)) continue;
    if (!subIds.has(k.subjectId)) errors.push(`${k.id} subjectId 不存在`);
    for (const p of k.prerequisite) if (!ids.has(p)) errors.push(`${k.id} prerequisite 悬空 ${p}`);
    for (const r of k.related) if (!ids.has(r)) errors.push(`${k.id} related 悬空 ${r}`);
  }
  for (const q of pkg.questions) {
    if (!ids.has(q.knowledge_id)) errors.push(`${q.id} knowledge_id 悬空`);
  }
  const w = pkg.subjects.reduce((a, s) => a + Number(s.weight), 0);
  if (Math.abs(w - 1) > 0.01) errors.push(`科目权重合计 ${w.toFixed(2)}`);
  return errors;
}

export const agriculture339 = loadAgriculture339();
