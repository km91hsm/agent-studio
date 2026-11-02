/**
 * P01 Task 2 (T10) — Codex app-server 스키마 번들이 `packages/protocol/codex-schema/`에 고정돼 있고
 * S7 스파이크 위치에는 더 이상 없음을 단언한다. 번들 자체의 무결성(PROVENANCE sha, archive 대조)은
 * `spikes/s7-schema/s7-schema.test.ts`가 새 경로로 계속 검사한다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PROTOCOL_DIR = fileURLToPath(new URL("./", import.meta.url));
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SCHEMA_DIR = join(PROTOCOL_DIR, "codex-schema");
// docs/planning/archive/evidence/codex_schema_0.166.0/PROVENANCE.md 의 v2 번들 sha256(2026-11-01)
const ARCHIVE_V2_SHA = "f72bb03a3f519cd19b37a030b42453128ff5b88abaad8c1264cf1ca197dbbed0";

describe("packages/protocol/codex-schema (T10)", () => {
  it("번들·PROVENANCE·diff.sh 가 packages/protocol 아래에 있다", () => {
    expect(existsSync(join(SCHEMA_DIR, "PROVENANCE.md"))).toBe(true);
    expect(existsSync(join(SCHEMA_DIR, "diff.sh"))).toBe(true);
    expect(existsSync(join(SCHEMA_DIR, "codex_app_server_protocol.v2.schemas.json"))).toBe(true);
  });

  it("v2 번들 sha256 이 archive 대조값과 같다", () => {
    const bytes = readFileSync(join(SCHEMA_DIR, "codex_app_server_protocol.v2.schemas.json"));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(ARCHIVE_V2_SHA);
  });

  it("S7 스파이크 위치의 번들·diff.sh 는 제거됐다(단일 사본)", () => {
    expect(existsSync(join(REPO, "spikes/s7-schema/codex-schema"))).toBe(false);
    expect(existsSync(join(REPO, "spikes/s7-schema/diff.sh"))).toBe(false);
  });

  it("diff.sh 는 자기 디렉터리를 정본으로 삼는다", () => {
    const sh = readFileSync(join(SCHEMA_DIR, "diff.sh"), "utf8");
    expect(sh).toMatch(/CANON="\$HERE"/);
    expect(sh).not.toContain("spikes/s7-schema");
  });
});
