/**
 * launcher 단위 테스트(리뷰B#6): 토큰 저장소는 Shell 설정 모드가 기준이고, 락의 tokenRef 는 그 모드의 예상 참조와 일치해야 한다.
 * 조작된 락이 저장소 선택을 바꾸지 못한다(닫힌 실패).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileTokenStore } from "../token-store.js";
import { tokenStoreFor } from "./launcher.js";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("tokenStoreFor (리뷰B#6)", () => {
  it("file 모드 + 일치하는 file: 참조 → FileTokenStore, keyring 모드 + 기본 키링 참조 → 키링", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-launcher-"));
    dirs.push(dir);
    const expected = new FileTokenStore(dir).ref();
    const s = tokenStoreFor(dir, "file", { tokenRef: expected });
    expect(s).toBeInstanceOf(FileTokenStore);
    expect(s.ref()).toBe(expected);
    expect(tokenStoreFor(dir, "keyring", { tokenRef: "keyring:agent-studio/daemon-token" }).ref()).toBe("keyring:agent-studio/daemon-token");
  });

  it("락의 tokenRef 가 설정 모드와 다르면 throw — 저장소를 바꾸지 않는다", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-launcher-"));
    dirs.push(dir);
    expect(() => tokenStoreFor(dir, "keyring", { tokenRef: new FileTokenStore(dir).ref() })).toThrow(/tokenRef/);
    expect(() => tokenStoreFor(dir, "file", { tokenRef: "keyring:agent-studio/daemon-token" })).toThrow(/tokenRef/);
    expect(() => tokenStoreFor(dir, "file", { tokenRef: `file:${join(dir, "elsewhere", "token")}` })).toThrow(/tokenRef/);
    expect(() => tokenStoreFor(dir, "keyring", { tokenRef: "keyring:other-service/daemon-token" })).toThrow(/tokenRef/);
  });
});
