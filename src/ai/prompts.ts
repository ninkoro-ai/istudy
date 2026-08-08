import type { AiPromptDef } from '../types';

export function renderPrompt(def: AiPromptDef, vars: Record<string, string>): string {
  let out = def.template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split('{' + k + '}').join(v);
  }
  return out;
}

export function buildPromptText(prompts: AiPromptDef[], id: string, vars: Record<string, string>): string {
  const def = prompts.find((p) => p.id === id) ?? prompts[0];
  return (def.system ? def.system + '\n\n' : '') + renderPrompt(def, vars);
}
