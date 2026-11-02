/**
 * task-transitions.json → mermaid stateDiagram-v2 텍스트 (PHASE_MANAGEMENT §2 "다이어그램은 이 파일에서 생성").
 *   npx tsx scripts/gen-transitions.ts
 */
import { loadTransitions } from "@agent-studio/protocol";

export function renderMermaid(): string {
  const table = loadTransitions();
  const lines = ["stateDiagram-v2", "  [*] --> QUEUED"];
  const grouped = new Map<string, string[]>();
  for (const t of table.transitions) {
    const to = t.to === "$resume" ? "<resumeFrom>" : t.to;
    const key = `${t.from} --> ${to}`;
    grouped.set(key, [...(grouped.get(key) ?? []), t.event]);
  }
  for (const [edge, events] of grouped) lines.push(`  ${edge}: ${events.join("|")}`);
  for (const s of table.terminal) lines.push(`  ${s} --> [*]`);
  return lines.join("\n");
}

if (process.argv[1] && /gen-transitions\.ts$/.test(process.argv[1])) {
  process.stdout.write(renderMermaid() + "\n");
}
