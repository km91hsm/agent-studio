"""S0 공개 저장소 마스킹 스크립트 (CHECKLIST §2, R22).

사용: python -I -X utf8 scripts/mask_archive.py [--dry-run] [--root docs] [--user NAME ...]

치환 규칙
- 사용자명(--user, 기본 현재 사용자) -> <user>      (C:\\Users\\<user>, /c/Users/<user> 등 모든 경로 변형 포함)
- Codex thread id(UUID v7 01a1…)  -> <thread-id>
삭제(로컬 비공개 보관으로 이동)
- docs/planning/archive/evidence/USER_DIRECTIVE.md
- docs/planning/archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md
출력: 파일별 치환 건수 표(마크다운) -> stdout
"""
from __future__ import annotations

import argparse
import getpass
import re
import shutil
import socket
import sys
from pathlib import Path

# spikes/_shared/mask.ts 의 THREAD_ID 와 동일 규칙(UUID v7, `01` 접두) — 최종 리뷰 #9: `01a1` 고정 해제
THREAD_ID = re.compile(r"\b01[0-9a-f]{6}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\b")
# Cloudflare 챌린지(원격 MCP 403 HTML)의 요청 상관 토큰 — mask.ts CF_QUERY/CF_OPTS 와 동일 규칙(최종 리뷰 #2)
CF_QUERY = re.compile(r"(__cf_chl_tk|__cf_chl_rt_tk|__cf_chl_f_tk|cf_chl_rc_i)=(?!<cf-token>)[^&\"'\s<\\]+")
CF_OPTS = re.compile(r"\b(cH|cRay|md|mdrd|cUPMDTk|cFPWv|cNounce|cTplV|cZone|cvId|cITimeS)(\s*:\s*)(['\"])(?!<cf-token>)(?:(?!\3).)*\3")
TEXT_SUFFIXES = {".md", ".json", ".jsonl", ".log", ".tsv", ".txt", ".toml", ".yaml", ".yml"}
REMOVE = [
    "docs/planning/archive/evidence/USER_DIRECTIVE.md",
    "docs/planning/archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md",
]
PRIVATE_DIR = Path(r"D:\LLM\agent-studio-private\evidence")


def mask_text(text: str, usernames: list[str], hostnames: list[str] = ()) -> tuple[str, int, int]:
    users = 0
    for name in usernames:
        users += text.count(name)
        text = text.replace(name, "<user>")
    for host in hostnames:
        if host:
            users += text.count(host)
            text = text.replace(host, "<host>")
    text, threads = THREAD_ID.subn("<thread-id>", text)
    text, cf_q = CF_QUERY.subn(r"\1=<cf-token>", text)
    text, cf_o = CF_OPTS.subn(r"\1\2\3<cf-token>\3", text)
    return text, users, threads + cf_q + cf_o


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--root", default="docs")
    ap.add_argument("--user", action="append", default=[], help="마스킹할 사용자명(반복 가능). 기본: 현재 로그인 사용자")
    ap.add_argument("--host", action="append", default=[], help="마스킹할 호스트명(반복 가능). 기본: 현재 호스트명")
    ap.add_argument("--no-remove", action="store_true", help="제거 대상 파일 처리를 건너뛴다(docs/reviews 등 재마스킹용)")
    args = ap.parse_args()
    usernames = args.user or [getpass.getuser()]
    hostnames = args.host or [socket.gethostname()]

    rows: list[tuple[str, int, int]] = []
    total_u = total_t = 0
    for p in sorted(Path(args.root).rglob("*")):
        if not p.is_file() or p.suffix not in TEXT_SUFFIXES:
            continue
        raw = p.read_bytes()
        text = raw.decode("utf-8")
        new, u, t = mask_text(text, usernames, hostnames)
        if u or t:
            rows.append((p.as_posix(), u, t))
            total_u += u
            total_t += t
            if not args.dry_run:
                with open(p, "w", encoding="utf-8", newline="") as f:
                    f.write(new)

    print("| 파일 | 사용자명 치환 | thread id·cf 토큰 치환 |")
    print("|---|---|---|")
    for path, u, t in rows:
        print(f"| `{path}` | {u} | {t} |")
    print(f"| **합계 ({len(rows)} 파일)** | **{total_u}** | **{total_t}** |")

    if args.no_remove:
        return 0
    print("\n| 제거 파일 | 처리 |")
    print("|---|---|")
    for rel in REMOVE:
        src = Path(rel)
        if not src.exists():
            print(f"| `{rel}` | 이미 없음 |")
            continue
        if args.dry_run:
            print(f"| `{rel}` | (dry-run) {PRIVATE_DIR / src.name} 로 이동 예정 |")
            continue
        PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(PRIVATE_DIR / src.name))
        print(f"| `{rel}` | `{PRIVATE_DIR / src.name}` 로 이동(저장소에서 삭제) |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
