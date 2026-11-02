/**
 * T2 토큰 저장소(검토 #12): 기본은 키링이며 실패는 닫힌 실패(파일로 자동 대체 안 함). 파일 저장소는
 * AGENT_STUDIO_TOKEN_STORE=file 명시 시에만 선택되고 ref() 가 `file:` 접두로 비제품 모드를 드러낸다.
 */
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileTokenStore, KeyringTokenStore, selectTokenStore } from "./token-store.js";

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "as-tok-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("FileTokenStore", () => {
  it("없으면 null, set 뒤 get 왕복, ref 는 file: 접두, 임시 파일 잔존 0", () => {
    const dir = tmp();
    const s = new FileTokenStore(dir);
    expect(s.get()).toBeNull();
    s.set("tok-1");
    expect(s.get()).toBe("tok-1");
    expect(s.ref()).toMatch(/^file:/);
    expect(s.ref()).toContain("token");
    expect(readdirSync(dir)).toEqual(["token"]);
  });
  it("두 번째 set 은 원자 교체 — 읽기 값은 old 또는 new 이고 임시 파일이 남지 않는다", () => {
    const dir = tmp();
    const s = new FileTokenStore(dir);
    s.set("old");
    s.set("new");
    expect(s.get()).toBe("new");
    expect(readdirSync(dir)).toEqual(["token"]);
    const reader = new FileTokenStore(dir);
    expect(["old", "new"]).toContain(reader.get());
  });
  it.skipIf(process.platform === "win32")("POSIX 에서 token 파일 mode 0600", () => {
    const dir = tmp();
    new FileTokenStore(dir).set("x");
    expect(statSync(join(dir, "token")).mode & 0o777).toBe(0o600);
  });
});

describe("selectTokenStore", () => {
  it("env 없음 → Keyring(기본), file 명시 → File", () => {
    const dir = tmp();
    const fake = { get: () => null, set: () => {}, ref: () => "keyring:fake" };
    expect(selectTokenStore({}, { dir, keyring: () => fake })).toBe(fake);
    expect(selectTokenStore({ AGENT_STUDIO_TOKEN_STORE: "keyring" }, { dir, keyring: () => fake })).toBe(fake);
    const f = selectTokenStore({ AGENT_STUDIO_TOKEN_STORE: "file" }, { dir, keyring: () => fake });
    expect(f).toBeInstanceOf(FileTokenStore);
    expect(f.ref()).toMatch(/^file:/);
  });
  it("Keyring 생성 실패는 throw — 파일로 대체하지 않는다(닫힌 실패)", () => {
    const dir = tmp();
    expect(() =>
      selectTokenStore(
        {},
        {
          dir,
          keyring: () => {
            throw new Error("keyring backend unavailable");
          },
        },
      ),
    ).toThrow(/keyring backend unavailable/);
    expect(readdirSync(dir)).toEqual([]);
  });
  it("알 수 없는 값은 throw", () => {
    expect(() => selectTokenStore({ AGENT_STUDIO_TOKEN_STORE: "cloud" }, { dir: tmp() })).toThrow(/AGENT_STUDIO_TOKEN_STORE/);
  });
});

describe.skipIf(!process.env.AGENT_STUDIO_LIVE || process.platform !== "win32")("KeyringTokenStore (LIVE win32)", () => {
  it("실제 키링 왕복 후 삭제", () => {
    const account = `daemon-token-${process.pid}`;
    const s = new KeyringTokenStore("agent-studio-test", account);
    try {
      s.set("live-tok");
      expect(s.get()).toBe("live-tok");
      expect(s.ref()).toBe(`keyring:agent-studio-test/${account}`);
    } finally {
      s.delete();
    }
    expect(s.get()).toBeNull();
  });
});
