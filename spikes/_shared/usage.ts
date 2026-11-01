/** 스파이크 보고서용 실호출 사용량 집계 (C5: 상한 없음, 기록 의무). */
export interface UsageRecord {
  agent: "claude" | "codex";
  calls: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
}

export function emptyUsage(agent: UsageRecord["agent"]): UsageRecord {
  return { agent, calls: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 };
}

export function addUsage(u: UsageRecord, delta: Partial<Omit<UsageRecord, "agent">>): UsageRecord {
  return {
    agent: u.agent,
    calls: u.calls + (delta.calls ?? 0),
    inputTokens: u.inputTokens + (delta.inputTokens ?? 0),
    cachedInputTokens: u.cachedInputTokens + (delta.cachedInputTokens ?? 0),
    outputTokens: u.outputTokens + (delta.outputTokens ?? 0),
    reasoningOutputTokens: u.reasoningOutputTokens + (delta.reasoningOutputTokens ?? 0),
  };
}

export function usageTable(rows: UsageRecord[]): string {
  const head = "| agent | calls | input | cached | output | reasoning |\n|---|---|---|---|---|---|";
  return [head, ...rows.map((r) => `| ${r.agent} | ${r.calls} | ${r.inputTokens} | ${r.cachedInputTokens} | ${r.outputTokens} | ${r.reasoningOutputTokens} |`)].join("\n");
}
