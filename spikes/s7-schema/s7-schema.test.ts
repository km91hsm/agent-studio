/**
 * S7 Step 1 — Codex app-server 스키마 고정 (MASTER Phase 00 Task S7, AC-P00-6)
 * - 산출물 `spikes/s7-schema/codex-schema/`는 `diff.sh --update`로 생성·커밋한다(PROVENANCE.md에 버전·sha256·archive 대조 기록).
 * - `diff.sh`는 재생성 후 커밋본과 `diff -r`로 비교해 변경 시 비0으로 종료한다(P01 T10 CI 입력).
 * CI(코덱스 없음): 커밋본 무결성만 검사. LIVE: 재생성 diff 0 / 변조본 비0.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE = !!process.env.AGENT_STUDIO_LIVE;
const ROOT = fileURLToPath(new URL("./", import.meta.url));
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SCHEMA_DIR = join(ROOT, "codex-schema");
const DIFF_SH = join(ROOT, "diff.sh");
/** archive/evidence/codex_schema_0.166.0/PROVENANCE.md 의 v2 번들 sha256(2026-11-01 생성) */
const ARCHIVE_V2_SHA = "f72bb03a3f519cd19b37a030b42453128ff5b88abaad8c1264cf1ca197dbbed0";

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const runDiff = (env: Record<string, string> = {}) => spawnSync("bash", [DIFF_SH], { cwd: REPO, encoding: "utf8", env: { ...process.env, ...env }, timeout: 120_000 });

describe("S7 schema bundle (CI)", () => {
  it("커밋된 스키마 번들이 존재하고 JSON으로 파싱되며 PROVENANCE.md의 sha256과 일치한다", () => {
    expect(existsSync(SCHEMA_DIR)).toBe(true);
    const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    const provenance = readFileSync(join(SCHEMA_DIR, "PROVENANCE.md"), "utf8");
    for (const f of files) {
      const text = readFileSync(join(SCHEMA_DIR, f), "utf8");
      expect(() => JSON.parse(text), f).not.toThrow();
      expect(provenance, `${f} sha in PROVENANCE`).toContain(sha256(join(SCHEMA_DIR, f)));
    }
    expect(provenance).toMatch(/codex-cli 0\.\d+\.\d+/);
  });

  it("v2 번들이 archive/evidence 사본(2026-11-01)과 같고 그 결과가 PROVENANCE.md에 기록돼 있다", () => {
    const provenance = readFileSync(join(SCHEMA_DIR, "PROVENANCE.md"), "utf8");
    expect(provenance).toMatch(/archive_match: (true|false)/);
    const v2 = readdirSync(SCHEMA_DIR).find((f) => /v2.*\.json$/.test(f));
    expect(v2, "v2 bundle file").toBeDefined();
    const match = sha256(join(SCHEMA_DIR, v2!)) === ARCHIVE_V2_SHA;
    expect(provenance).toContain(`archive_match: ${match}`);
    // 리뷰 #10: 기록 일치만이 아니라 archive 사본과의 해시 동등성 자체를 단언한다(0.166.0 고정; 버전이 바뀌면 ARCHIVE_V2_SHA 갱신이 명시적 절차)
    expect(match, "v2 bundle must equal the 2026-11-01 archive copy").toBe(true);
  });
});

describe.skipIf(!LIVE)("S7 schema diff script (LIVE)", () => {
  it("diff.sh: 재생성 결과가 커밋본과 같으면 0으로 종료한다", () => {
    const r = runDiff();
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
  }, 180_000);

  it("diff.sh: 비교 대상이 변조되면 비0으로 종료한다", () => {
    const tmp = mkdtempSync(join(tmpdir(), "s7-schema-"));
    try {
      cpSync(SCHEMA_DIR, tmp, { recursive: true });
      const f = readdirSync(tmp).find((x) => x.endsWith(".json"))!;
      writeFileSync(join(tmp, f), readFileSync(join(tmp, f), "utf8").replace(/\{/, '{"__tampered":1,'));
      const r = runDiff({ S7_SCHEMA_DIR: tmp });
      expect(r.status, `${r.stdout}\n${r.stderr}`).not.toBe(0);
      expect(r.stdout + r.stderr).toMatch(/__tampered|differ/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 180_000);
});
