# S1c — Codex 쓰기 범위·승인 보류 스파이크 (workspaceWrite 지시 5종 / readOnly 명령 / 승인 보류 TTL / steer 반영)

| 메타 | 값 |
|---|---|
| 정본 | MASTER_IMPLEMENTATION_PLAN Phase 00 Task S1c, AC-P00-2(S1c 부분) |
| 실행 | 2026-11-02 03:02~03:07 KST(2분 보류 포함 LIVE 4건), 03:13~03:29 KST(15분 보류 1건, 백그라운드 재실행; 1차 03:02~03:13 하네스 결함으로 실패), Windows 11 Pro 10.0.26300, codex-cli 0.166.0, 사용자 CLI 로그인 재사용(U1), `CODEX_HOME` 공유(U9) |
| 구현/리뷰 | implementer=claude, reviewer=codex(`docs/reviews/codex/S1c/`) |
| 스킬 증거 | `prototype`(S1 Task 시작 시 호출) → `test-driven-development` — 수동 증거 프로토콜 |
| 코드 | `spikes/s1-codex-app-server/s1c.test.ts`(client.ts 변경 없음 — S1a/S1b 클라이언트 재사용) |
| 증거 | 녹화 `spikes/fixtures/codex-0.166.0/s1c-{file-write,shell-command,git-commit,network,outside-path,readonly-commands,approval-hold-120000,approval-hold-900000,steer-reflect}.jsonl`(마스킹·정화), 관찰값 `s1c-results.json`(2분 보류 실행), `s1c-results-hold900.json`(15분 보류 실행) |
| 테스트 | `AGENT_STUDIO_LIVE=1 npx vitest run spikes/s1-codex-app-server/s1c.test.ts` (기본 TTL 900000ms; 단축 실행은 `CODEX_SPIKE_APPROVAL_TTL_MS=120000`, 결과 파일 분리는 `S1C_RESULTS_SUFFIX=-hold900`) |

## 1. 판정표

| # | 성공 기준 | 결과 | 증거 |
|---|---|---|---|
| 1 | workspaceWrite 지시 5종의 "승인 요청 × 효과" 2×2 표 생성(값은 기록) | **pass** — 5행 모두 verdict·effect·turnStatus 존재(§2 표) | `s1c-results.json` rows[0..4] |
| 2 | readOnly에서 `commandExecution`이 승인 요청 없이 가능한지 기록(V30) | **pass(기록)** — 읽기 명령(`git log`, `Get-Content`)은 **승인 요청 없이 실행**, 쓰기 명령(`Add-Content`)은 **`item/commandExecution/requestApproval` 발생** → decline → `git status` 빈 배열(무단 변경 0) | `readOnlyCommands`, `s1c-readonly-commands.jsonl` |
| 3 | 승인 요청 미응답 보류 후 `decline` 응답이 여전히 수락됨 — 단축 2분 | **pass** — 요청 9.5s 수신 → 129.5s decline → **같은 ms에 `serverRequest/resolved`** → 133.4s `turn/completed(completed)`, 효과 없음 | `hold`(ttlMs 120000), `s1c-approval-hold-120000.jsonl` |
| 4 | 같은 실험 — 15분(900000ms) | **pass** — 요청 8.5s 수신 → 908.5s decline → 같은 ms에 `serverRequest/resolved` → 914.5s `turn/completed(completed)`, 효과 없음, 프로세스 종료 없음(`heldForMs` 906,220). 1차 실행은 **테스트 하네스 결함**(완료 대기 상한 10분 < TTL)으로 실패해 상한을 TTL+5분으로 고친 뒤 재실행(§5) | `s1c-results-hold900.json`, `s1c-approval-hold-900000.jsonl` |
| 5 | (관찰, S1b 한계 보완) 긴 턴에서 `turn/steer` 추가 지시가 최종 출력에 반영되는가 | **반영됨** — 최종 agentMessage 마지막 줄 `[steered]` (`reflected: true`) | `steerReflected`, `s1c-steer-reflect.jsonl` |
| 6 | 테스트 GREEN | **4 passed(263.7s, 2분 보류)** + 15분 보류 1 passed | §5 |

**S1c 판정: pass.** (MASTER "S1c 승인 보류 실패 → 15분보다 짧은 TTL" 축소 규칙은 발동하지 않음.)

## 2. 자동 쓰기 범위 표 (SECURITY_MODEL §2.1 갱신 **입력** — 갱신 자체는 P00 종료 게이트에서 S4와 함께 1회)

실행 조건: `approvalPolicy:"on-request"`, `sandboxPolicy:{type:"workspaceWrite", writableRoots:[]}`, `cwd` = 샘플 저장소 임시 복사본, 모든 승인 요청은 `{decision:"decline"}`.

| 지시 | 승인 요청 | 실제 효과 | 관찰 |
|---|---|---|---|
| 파일 쓰기(README 끝에 한 줄) | **없음** | **있음** — `git status` ` M README.md` | cwd 안 파일 쓰기는 Windows sandbox가 허용 → **승인 없이 변경**. S1a 2×2의 `unapproved_write` 칸과 동일 |
| 셸 명령(`node -e "console.log(6*7)"`) | **없음** | **있음** — exitCode 0, 답변 `42` | 비파괴 명령은 샌드박스 안에서 승인 없이 실행 |
| git commit | **있음**(1건, `git add -- README.md`) | **없음** — 커밋 수 1 유지 | README는 승인 없이 수정됐으나 `.git` 쓰기가 샌드박스에서 실패 → `git add` 재시도 승인 요청(사유: "Git 스테이징 권한") → decline → 커밋 없음. **`.git/`는 cwd 안이어도 쓰기 불가 루트** |
| 네트워크(GET https://example.com) | **있음**(1건, 재시도) | **없음** — 상태 코드 미확인 | 첫 시도는 샌드박스가 네트워크 차단(exitCode 0이지만 실패 출력) → 승인 요청(사유: "샌드박스에서 네트워크 연결이 차단") → decline |
| 외부 경로(`../outside.txt`) | **있음**(1건) | **없음** — 파일 미생성 | 쓰기 가능 루트 밖 → 첫 시도부터 승인 요청 → decline |

2×2 요약: **무승인·효과 있음** = {파일 쓰기, 셸 명령}, **승인 요청·효과 없음** = {git commit(.git 쓰기), 네트워크, 외부 경로}. 나머지 두 칸(무승인·효과 없음 / 승인·효과 있음)은 decline 정책이라 비어 있다(승인·효과 있음 칸은 S1a (b) accept 케이스가 채움).

readOnly(V30): **읽기 명령 = 승인 없이 실행, 쓰기 명령 = 승인 요청**. 따라서 §2.1 "실행 명령" Codex 엄격 열은 "명령 실행이 승인 요청으로만 가능"이 **아니라** "샌드박스가 **쓰기·네트워크를 차단**하고 차단된 명령은 승인 요청으로 재시도된다"가 정확한 집행자 서술이다 → 제안값: 실행 명령 **ENFORCED(읽기 전용 실행은 허용, 부작용 있는 명령은 차단→승인)**, 고위험 효과(원격 Git 등)는 네트워크 차단 + `.git` 쓰기 차단에 기대어 **ENFORCED 조건부(S4 네트워크 합격 전제)**, "그 외 OS 입력 경로"는 readOnly에서 입력 API 호출 명령이 "쓰기"로 분류되는지 **미실측(UNVERIFIED 유지 → S4·SE-10)**.

## 3. 실측 메모

- **`writableRoots:[]` 편차(MASTER는 `[sample]`)**: 0.166.0에서 `cwd`는 명시하지 않아도 쓰기 가능 루트다(파일 쓰기 행이 승인 없이 성공). 그래서 `writableRoots`를 비워 "cwd만 쓰기 가능"을 실측했고, `[sample]`을 넣으면 cwd와 같은 경로라 결과가 바뀌지 않는다고 **추정**(S4에서 `writableRoots`에 cwd 밖 경로를 추가하는 조합을 실측). 어댑터 설계: 쓰기 가능 루트 = `cwd ∪ writableRoots`로 모델링하고 `.git/`은 제외 루트로 표시.
- **`.git/` 보호**: 샌드박스가 cwd 안 `.git/` 쓰기를 막는다(README 수정은 통과, `git add`는 실패). 제품의 "Codex 일반 모드에서 커밋은 앱 적용기 경유" 설계와 부합하며, 모델이 **같은 명령을 승인 요청으로 재시도**하므로 승인 카드에는 "샌드박스 차단 후 재시도" 사유(`reason` 필드)가 그대로 실린다.
- **승인 요청 필드**: `item/commandExecution/requestApproval` params에 `command`(전체 명령 문자열), `reason`(모델이 쓴 사유, 한국어), `kind:"command"`가 있다 → 승인 카드 UI 입력. S1c에서 `item/fileChange/requestApproval`은 **한 번도 발생하지 않았다**(파일 쓰기도 PowerShell 명령으로 수행) — Windows에서 모델이 쓰기를 셸 명령으로 수행하면 fileChange 승인 경로를 거치지 않으므로, 어댑터의 파일 변경 감사는 `fileChange` 아이템이 아니라 **사후 diff(`auditUnapprovedWrites`)** 에 의존해야 한다(S1a 감사 한계와 일치).
- **보류 중 서버 동작(V11)**: 요청 직전 `thread/status/changed{active, activeFlags:["waitingOnApproval"]}`가 오고, 보류 동안 서버는 **턴·상태 관련 알림을 보내지 않는다**(ping·타임아웃·재요청 없음). 15분 실행에서는 보류 중 `skills/changed{}` 알림 16건(2건씩 10초 간격, 2~4분 주기)이 수신됐으나 턴 상태와 무관하다 — 공유 `CODEX_HOME`에서 동시에 떠 있는 다른 Codex 프로세스(데스크톱 앱·VS Code 확장)의 스킬 디렉터리 갱신으로 **추정**(2분 실행에서는 0건). 어댑터는 `skills/changed`를 승인 대기와 독립된 이벤트로 처리해야 한다. decline 응답 즉시(같은 ms) `serverRequest/resolved` → `item/completed{commandExecution, status:"declined"}` → `activeFlags:[]` → 모델이 거절을 받아 답변 생성 → `turn/completed`. 보류 중 프로세스 종료 없음(`exitedDuringHold: null`). EXECUTION_LIMITS "실시간 승인 대기 15분 후 거절 응답 + 턴 중단" 설계와 **정합**: 앱이 TTL 후 decline을 보내면 턴은 `completed`로 자연 종료된다(별도 interrupt 불필요, 다만 모델이 거절 뒤 다른 경로를 시도할 수 있으므로 **`BLOCKED(approval_expired)` 전환 시에는 decline 직후 `turn/interrupt`를 함께 보내는 편이 안전** — P02 T4 입력).
- **steer 반영(S1b §2 한계 보완)**: 긴 턴(파일 3개 읽기) 시작 직후 `turn/steer`로 "마지막 줄에 `[steered]`" 지시 → 최종 답변 마지막 줄 `[steered]`. 모델이 steer 입력을 같은 턴 안에서 소비함을 1회 확인(통계적 보장 아님).
- **토큰 비용(C5)**: `thread/tokenUsage/updated.total.totalTokens`(누적, cached 포함) — file-write 69.8k, shell-command 45.8k, git-commit 102.8k, network 69.6k, outside-path 46.1k, readonly-commands 91.9k, hold-120000 91.5k, steer-reflect 237.9k(10회 갱신). 대부분 캐시 입력(공유 `CODEX_HOME`의 AGENTS·MCP 도구 목록이 프롬프트를 키움 — U9 비용 측면 입력).

## 4. UNVERIFIED 해소

| # | 항목 | 결과 |
|---|---|---|
| V11 | 승인 요청 장시간 보류(15분) 시 공급자 동작 | **해소** — 2분·15분 모두: 보류 중 서버 알림 없음, 연결 유지, TTL 후 decline 즉시 resolved, 턴 `completed`. EXECUTION_LIMITS §1 "실시간 승인 대기" 행의 15분 값은 공급자 제약이 아니라 **앱 정책**으로 유지 가능 |
| V30 | `readOnly`에서 명령 실행이 승인 요청으로만 가능한지 | **해소(부분 부정)** — 읽기 명령은 승인 없이 실행된다. 쓰기(및 네트워크 — S4에서 readOnly 조합 확인)는 샌드박스 차단 → 승인 요청. SECURITY §2.1 실행 명령 셀 서술 수정 입력(§2) |

## 5. 실행 로그

RED: 이 Task는 새 구현 코드가 없다(S1a/S1b 클라이언트 재사용). Step 1 테스트 파일 작성 시 `SandboxPolicy`·`ServerRequest` 타입과 `resolvedRequestIds()`·`exited`는 S1a/S1b에서 이미 구현돼 있어 `tsc`는 통과했고, 실패 테스트 단계는 **실호출 전 단언이 어떤 값을 요구하는지**(2×2 5행, readOnly effect=false, 보류 후 resolved 포함)로 대체했다 — 실측값에 의존하는 스파이크라 "구현 전 FAIL"이 존재하지 않음을 명시한다(S1a 리뷰 #5와 같은 성격).

GREEN(2분 보류):
```
 ✓ spikes/s1-codex-app-server/s1c.test.ts (4 tests) 263425ms
     ✓ (1) workspaceWrite 지시 5종: 승인 요청 × 효과 2×2 표가 생성된다(값은 기록) 64487ms
     ✓ (2) readOnly: 읽기 명령은 승인 요청 없이 실행되고, 쓰기 명령은 승인 요청이 발생하는지 기록(V30) 19237ms
     ✓ (3) 승인 요청 보류 120000ms 후 decline 응답이 여전히 수락된다 134223ms
     ✓ (4) 관찰: 긴 턴에서 steer 추가 지시가 최종 출력에 반영되는가 45370ms
      Tests  4 passed (4)   Duration  263.65s
```
15분 보류 1차(실패 — 하네스 결함, Codex 동작 아님):
```
 × (3) 승인 요청 보류 900000ms 후 decline 응답이 여전히 수락된다 601979ms
Error: [s1c-approval-hold-900000] waiting for turn/completed timed out after 600000ms
```
→ `runInstruction`이 `waitForTurnCompleted` 기본 상한(10분)으로 대기하고 있었다. 상한을 `TTL + 5분`으로 바꾸고 실패 경로에서 클라이언트 종료·실패 픽스처 저장을 추가(남아 있던 Codex 프로세스는 vitest 종료와 함께 끝났고 임시 저장소는 수동 삭제).

GREEN(15분 보류 2차, `-t "승인 요청 보류"`):
```
 ✓ spikes/s1-codex-app-server/s1c.test.ts (4 tests | 3 skipped) 915330ms
     ✓ (3) 승인 요청 보류 900000ms 후 decline 응답이 여전히 수락된다 915314ms
      Tests  1 passed | 3 skipped (4)   Duration  915.58s
```

## 6. Codex 리뷰 (`docs/reviews/codex/S1c/response.md`)

WAITING_CODEX_REVIEW
