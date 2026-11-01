# codex app-server 생성 스키마 원본 (R8-08)

- 명령: `codex app-server generate-json-schema --out <scratchpad>/codex_schema --experimental` (2026-11-01, Claude Code 세션에서 실행, 저장소 밖 출력 → 이 폴더로 복사)
- `codex --version`: `codex-cli 0.166.0`
- 파일: `codex_app_server_protocol.v2.schemas.json` (808222 bytes)
- sha256: `f72bb03a3f519cd19b37a030b42453128ff5b88abaad8c1264cf1ca197dbbed0`
- `definitions.AskForApproval.oneOf[0].enum` = ["untrusted", "on-request", "never"] ; oneOf[1] = GranularAskForApproval
- `definitions.SandboxPolicy` type enum = ["dangerFullAccess", "readOnly", "externalSandbox", "workspaceWrite"]
- 발췌본 `../codex_0.166.0_v2_schema_excerpt.json`은 이 원본에서 두 정의만 뽑은 것. P00 S7은 같은 명령을 `spikes/s7-schema/`에서 재실행해 이 해시와 대조한다(TEST 없음 → S7 Step 1 diff).
