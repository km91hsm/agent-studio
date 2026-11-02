/**
 * 데몬 토큰 저장소 (P01 T2, 검토 #12). 기본은 OS 키링(`@napi-rs/keyring`)이며 키링 실패는 **닫힌 실패**(throw → 기동 중단,
 * 파일로 자동 대체하지 않음). 파일 저장소는 `AGENT_STUDIO_TOKEN_STORE=file`(또는 `--token-store file`)이 명시된 경우에만 선택되고
 * `ref()` 가 `file:` 로 시작해 저널·상태 응답에서 비제품 모드가 드러난다(테스트·CI 전용, P10a 에서 제품 빌드 금지 단언).
 */
import { randomBytes } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  /** 저장 위치 참조(비밀 아님): `keyring:<service>/<account>` 또는 `file:<path>` */
  ref(): string;
}

export class FileTokenStore implements TokenStore {
  constructor(private readonly dir: string) {}
  private get path(): string {
    return join(this.dir, "token");
  }
  get(): string | null {
    try {
      return readFileSync(this.path, "utf8").trim() || null;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  /** 임시 파일(`wx`, 0600) + rename 으로 원자 교체 — 읽는 쪽은 항상 old 또는 new 전체를 본다. */
  set(token: string): void {
    mkdirSync(this.dir, { recursive: true });
    const tmp = join(this.dir, `token.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
    const fd = openSync(tmp, "wx", 0o600);
    try {
      writeFileSync(fd, token, "utf8");
    } finally {
      closeSync(fd);
    }
    try {
      renameSync(tmp, this.path);
    } catch (e) {
      rmSync(tmp, { force: true });
      throw e;
    }
  }
  ref(): string {
    return `file:${this.path}`;
  }
}

interface KeyringEntry {
  getPassword(): string | null | undefined;
  setPassword(password: string): void;
  deletePassword(): boolean;
}

export class KeyringTokenStore implements TokenStore {
  private readonly entry: KeyringEntry;
  constructor(
    readonly service = "agent-studio",
    readonly account = "daemon-token",
  ) {
    // 네이티브 모듈 로드·항목 생성 실패는 그대로 throw(닫힌 실패)
    const mod = createRequire(import.meta.url)("@napi-rs/keyring") as { Entry: new (service: string, account: string) => KeyringEntry };
    this.entry = new mod.Entry(service, account);
  }
  get(): string | null {
    return this.entry.getPassword() ?? null;
  }
  set(token: string): void {
    this.entry.setPassword(token);
  }
  delete(): void {
    try {
      this.entry.deletePassword();
    } catch {
      /* 없는 항목 삭제는 무시 */
    }
  }
  ref(): string {
    return `keyring:${this.service}/${this.account}`;
  }
}

/** env 없음 → Keyring(기본), `file` 명시 → File, 그 외 값은 오류. Keyring 생성 실패는 그대로 throw. */
export function selectTokenStore(env: Record<string, string | undefined>, opts: { dir: string; keyring?: () => TokenStore }): TokenStore {
  const mode = env.AGENT_STUDIO_TOKEN_STORE ?? "keyring";
  if (mode === "file") return new FileTokenStore(opts.dir);
  if (mode === "keyring") return (opts.keyring ?? (() => new KeyringTokenStore()))();
  throw new Error(`AGENT_STUDIO_TOKEN_STORE must be "keyring" or "file" (got ${JSON.stringify(mode)})`);
}

/** 저장된 토큰이 없으면 생성해 저장한다. */
export function ensureToken(store: TokenStore): string {
  const existing = store.get();
  if (existing) return existing;
  const token = randomBytes(32).toString("hex");
  store.set(token);
  return token;
}
