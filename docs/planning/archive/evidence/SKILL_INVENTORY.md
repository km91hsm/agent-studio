# SKILL_INVENTORY — 설치본 인벤토리·무결성

| 메타 | 값 |
|---|---|
| 상태 | FINAL (STEP 2) |
| 기준 | `~/.claude/skills` 52개 vs `D:\LLM\claude-skills\skills` 사본, 2026-11-01 |
| 집계 해시 | 스킬 폴더 내 전체 파일의 sha256 목록(경로 정렬)을 다시 sha256 |
| 상태 정의 | 설치됨=폴더 존재·해시 일치 / 인식됨=Claude Code 세션 스킬 목록 노출 / 실행 검증됨=Skill 도구 호출 후 지시대로 산출물 생성 확인 |

| 스킬 | 저장소@커밋 | 파일 수 | 집계 SHA256(앞 16) | 사본 일치 | 설치됨 | 인식됨 | 실행 검증됨 | 모델 호출 |
|---|---|---|---|---|---|---|---|---|
| agent-browser | vercel-labs/agent-browser@5868f7c | 1 | `ee142e8e4bfa45ee` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| brainstorming | obra/superpowers@2ce8aa1 | 8 | `d311b2f997d82f7b` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| cavecrew | JuliusBrussee/caveman@9b68f7e | 2 | `b435290b81d4b6ea` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| caveman | JuliusBrussee/caveman@9b68f7e | 2 | `ff022bb6987086ca` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| caveman-compress | JuliusBrussee/caveman@9b68f7e | 10 | `d8fb839a5d3f024c` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| caveman-review | JuliusBrussee/caveman@9b68f7e | 2 | `bdf8a3cd3e743cd1` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| codebase-design | mattpocock/skills@4ae2317 | 4 | `2a137cbf24b47a48` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| code-review | mattpocock/skills@4ae2317 | 2 | `060a6376131e6d31` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| design-mobile-apps | designed-by-ai/skills@03c20ae | 7 | `3ea33cae628b930c` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| design-taste-frontend | leonxlnx/taste-skill@12af471 | 39 | `95c81e1887bc72c2` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| diagnosing-bugs | mattpocock/skills@4ae2317 | 3 | `16ef98bad736eaf8` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| diagnosing-superpowers | obra/superpowers@2ce8aa1 | 20 | `6237a84feb21e30b` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| dispatching-parallel-agents | obra/superpowers@2ce8aa1 | 1 | `5a252d8046b750d6` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| executing-plans | obra/superpowers@2ce8aa1 | 3 | `55b5b4a4693addbc` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| find-skills | vercel-labs/skills@92a9a34 | 1 | `42eb2accf85ead95` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| finishing-a-development-branch | obra/superpowers@2ce8aa1 | 1 | `0bdc4e4ab573238c` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| frontend-design | anthropics/skills@ca45fc4 | 2 | `20d3381f8b0ebec7` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| git-guardrails-claude-code | mattpocock/skills@4ae2317 | 3 | `ad59abc2bbb0fd25` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| grill-me | mattpocock/skills@4ae2317 | 2 | `83c1137ddb965e69` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| grill-with-docs | mattpocock/skills@4ae2317 | 2 | `6e5bd70c88092e13` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| handoff | mattpocock/skills@4ae2317 | 2 | `d185f32f30988ef6` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| impeccable | pbakaus/impeccable@4f95649 | 58 | `3248a376b3af65b0` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| implement-spec | mattpocock/skills@4ae2317 | 2 | `2f7af6fb717e2395` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| improve-codebase-architecture | mattpocock/skills@4ae2317 | 3 | `12c79ff7dc1da24a` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| orchestration | stablyai/orca@4e2fcfe9 | 1 | `484c7bd8ba807a78` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| ponytail | DietrichGebert/ponytail@96608e0 | 1 | `fc206f50a226492d` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| prototype | mattpocock/skills@4ae2317 | 4 | `66b4d2653c058036` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| receiving-code-review | obra/superpowers@2ce8aa1 | 1 | `8117db15359cea72` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| requesting-code-review | obra/superpowers@2ce8aa1 | 2 | `9b307dc3f22ae575` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| research | mattpocock/skills@4ae2317 | 2 | `91b9f16fa5299b6e` | ✅ | ✅ | ✅ | ✅ research(계획 중 적용) | 허용 |
| setup-pre-commit | mattpocock/skills@4ae2317 | 2 | `b037e536e9b7d17a` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| skill-creator | anthropics/skills@ca45fc4 | 18 | `730b45df2939b161` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| subagent-driven-development | obra/superpowers@2ce8aa1 | 14 | `397952ad9051749a` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| supabase | supabase/agent-skills@c9be0e9 | 4 | `25ff7da1f4a8b138` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| supabase-postgres-best-practices | supabase/agent-skills@c9be0e9 | 36 | `0f7f71b46aa68817` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| systematic-debugging | obra/superpowers@2ce8aa1 | 11 | `cd0d4d8069dd38f0` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| tdd | mattpocock/skills@4ae2317 | 4 | `f46cb3a894fa2515` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| test-driven-development | obra/superpowers@2ce8aa1 | 2 | `1c84aecba6ce0fd4` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| to-spec | mattpocock/skills@4ae2317 | 2 | `bb85db8e675da6ce` | ✅ | ✅ | ✅ | 거부(사용자 전용) | 사용자 전용(`disable-model-invocation`) |
| to-tickets | mattpocock/skills@4ae2317 | 2 | `fd628c9a7f646e58` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| triage | mattpocock/skills@4ae2317 | 4 | `5621e805f5c3408b` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill@3a13158 | 73 | `e40235be86097242` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| using-git-worktrees | obra/superpowers@2ce8aa1 | 1 | `0a64767ff8fc4aec` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| using-superpowers | obra/superpowers@2ce8aa1 | 8 | `8e7daada451dee8c` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| vercel-composition-patterns | vercel-labs/agent-skills@1a2c79d | 14 | `f905e820984f441b` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| vercel-react-best-practices | vercel-labs/agent-skills@1a2c79d | 76 | `86e7972f7351cf02` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| vercel-react-native-skills | vercel-labs/agent-skills@1a2c79d | 42 | `09bc807c3121b70a` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| verification-before-completion | obra/superpowers@2ce8aa1 | 1 | `40cae6d90879f5b7` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| wayfinder | mattpocock/skills@4ae2317 | 2 | `b7a4badf16092691` | ✅ | ✅ | ✅ | 미실시 | 사용자 전용(`disable-model-invocation`) |
| web-design-guidelines | vercel-labs/agent-skills@1a2c79d | 1 | `9e101b83a57153ad` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| writing-plans | obra/superpowers@2ce8aa1 | 1 | `4e690938dd7278ef` | ✅ | ✅ | ✅ | 미실시 | 허용 |
| writing-skills | obra/superpowers@2ce8aa1 | 10 | `e8e7bc788a08af5f` | ✅ | ✅ | ✅ | 미실시 | 허용 |

전체 해시 값: `skill_hashes.tsv`.

## 범위 밖 폴더

- `~/.claude/skills/synced/<uuid>_<uuid>/` — Claude Desktop 동기화 폴더. 후보 아님. 변경·삭제하지 않음.
- `~/.codex/skills/.system/*` — OpenAI 시스템 스킬 5개. 후보 아님.

## 미설치(원저자 폐기·통합)

| 후보 | 상태 | 근거 |
|---|---|---|
| resolving-merge-conflicts | mattpocock/skills에서 삭제, 대체 없음 | 지시서 §4.1(CHANGELOG #1120). 설치본에 없음 확인 |
| redesign-existing-projects | leonxlnx/taste-skill 2.1.1부터 design-taste-frontend에 통합 | 지시서 §4.1. 설치본에 없음 확인. design-taste-frontend SKILL.md에 redesign 5단계 경로 존재(skill_analysis_part2.md) |
