# Round 2-3 — Security model · Execution limits · Background execution · OS deployment · Phase order

Same Codex thread, same rules (READ-ONLY, primary sources, `UNVERIFIED`, Korean). Target 1,500–2,500 words. This is the last debate round; be decisive and give final recommendations.

## Read
- `D:\LLM\agent-studio\docs\planning\06_codesign\CLAUDE_INITIAL_PROPOSAL.md` §5–§8
- `D:\LLM\agent-studio\docs\planning\00_product\PRODUCT_REQUIREMENTS.md` §10–§12, §15 (gaps/contradictions table)
- `D:\LLM\agent-studio\docs\planning\evidence\research\RESEARCH_DESKTOP_STACK.md` §2.5 (background mechanisms), §3

## Issues — for EACH: 당신의 입장 / Claude 안에 대한 동의·반박 / 근거 / 위험 / 합의 여부

1. **승인 정책 매트릭스**: Fill a table for the 11 permission areas in the directive §11.1 (프로젝트 신뢰, 파일 시스템 범위, 실행 명령, 네트워크, 원격 Git, DB 변경, 의존성 설치, Hook 활성화, MCP 실행, 외부 서비스 변경, 배포) with default = `AUTO | ASK | ALWAYS_ASK | DENY`, approval scope (once / session / project / until-expiry), and how the broker detects the category from Codex `requestApproval` items and Claude `canUseTool` inputs.
2. **격리**: Codex has `sandboxPolicy` (read-only / workspace-write / danger-full-access, `[windows] sandbox = "elevated"` is set on this PC). Claude Code has no OS sandbox of its own on Windows (UNVERIFIED — confirm or correct). What isolation can Agent Studio actually guarantee per OS for MVP, and what must be labelled "not a sandbox" (git worktree, path allow-lists)?
3. **프롬프트 인젝션 대응**: concrete controls for malicious CLAUDE.md/AGENTS.md/README in a project: e.g., treat project instruction files as untrusted, require approval for any instruction that widens permissions, strip/flag URLs… What does each agent offer natively?
4. **비밀 마스킹과 저장 암호화**: journal/log redaction rules (patterns, where applied), whether SQLite at rest needs encryption for a single-user desktop (your stance), backup protection.
5. **실행 제한 최종값**: You proposed agent-call limit 30 min (Claude: 20). Settle it. Also settle: approval-wait exclusion, "1 concurrent modifying task per worktree" (Claude) vs per project, retry 0 for auth/quota, and a maximum approval-wait before `BLOCKED` (Claude suggests 24h). Give the final table: 항목 | 권장값 | 조정 범위 | 예외 | 검증 테스트.
6. **백그라운드 실행 — MVP 범위 결정**: Claude: detached Node daemon (`detached`+`unref`, reconnect via lock/port file) in MVP, OS service in V2. You: if the installed-prototype spike fails, MVP = safe-stop-and-resume. Decide the MVP acceptance criterion precisely (e.g., "closing the window keeps the daemon and running turns alive; quitting from tray stops safely; reboot → recovery manager offers resume"). Address Windows specifics: console-less detached Node, process tree cleanup, zombie `codex`/`claude` children.
7. **OS별 배포 전략**: Windows MVP first? Signing for dev builds? Linux update channel without Electron autoUpdater? Give the MVP/V1/V2 deployment matrix.
8. **Phase 순서 최종안**: You proposed "security/state core before Gateway" and "Diff viewer before editor"; Claude proposed Gateway → queue → chat. Reconcile into one ordered list of phases (keep all 13 original scopes traceable), with the Phase 00 spike list merged from both proposals (dedupe), and name the MVP/V1/V2 cut line.
9. **Codex가 보는 최대 위험 3개** for the whole plan, each with a mitigation and the Phase where it is tested.

## Output format
`### 쟁점 N — <제목>` ×9, then `### 합의 요약 표`, then `### UNVERIFIED`.
