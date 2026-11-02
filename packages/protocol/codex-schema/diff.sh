#!/usr/bin/env bash
# P01 T10(S7 Step 1 이동) — codex app-server 프로토콜 스키마를 재생성해 커밋본(packages/protocol/codex-schema/)과 비교한다.
#   npm run schema:diff  (= bash packages/protocol/codex-schema/diff.sh)  : 재생성 → diff -r (변경 시 비0 종료)   ← CI codex-schema-diff job
#   bash packages/protocol/codex-schema/diff.sh --update                 : 커밋본 갱신 + PROVENANCE.md(버전·sha256·archive 대조)
#                                              갱신 대상은 항상 정본 디렉터리(S7_SCHEMA_DIR 무시 — 리뷰 #9), 덮어쓰기 전에 diff 요약을 출력
#   S7_SCHEMA_DIR=<dir> 로 "비교" 대상만 바꿀 수 있다(테스트의 변조본 검사용).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON="$HERE"
# 이 스크립트 자신과 PROVENANCE.md 는 번들의 일부가 아니다(비교·갱신에서 제외)
EXCLUDE=(-x PROVENANCE.md -x diff.sh)
TARGET="${S7_SCHEMA_DIR:-$CANON}"
# docs/planning/archive/evidence/codex_schema_0.166.0/PROVENANCE.md 의 v2 번들 sha256(2026-11-01)
ARCHIVE_SHA="f72bb03a3f519cd19b37a030b42453128ff5b88abaad8c1264cf1ca197dbbed0"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
codex app-server generate-json-schema --out "$TMP/out" --experimental -c features.memories=false >/dev/null
VERSION="$(codex --version)"

if [[ "${1:-}" == "--update" ]]; then
  if [[ -n "${S7_SCHEMA_DIR:-}" ]]; then echo "note: S7_SCHEMA_DIR is ignored for --update; updating canonical $CANON" >&2; fi
  TARGET="$CANON"
  mkdir -p "$TARGET"
  if diff -rq "${EXCLUDE[@]}" "$TARGET" "$TMP/out" >"$TMP/pre.txt" 2>&1; then
    echo "no schema change vs $TARGET ($VERSION); refreshing PROVENANCE.md only"
  else
    echo "schema changes to be applied ($(wc -l <"$TMP/pre.txt" | tr -d ' ') entries):"; head -40 "$TMP/pre.txt"
  fi
  find "$TARGET" -mindepth 1 -not -name PROVENANCE.md -not -name diff.sh -delete
  cp -r "$TMP/out"/. "$TARGET"/
  V2="$(find "$TARGET" -maxdepth 1 -name '*v2*.json' | head -1)"
  V2_SHA="$( [[ -n "$V2" ]] && sha256sum "$V2" | cut -d' ' -f1 || echo none )"
  MATCH=false; [[ "$V2_SHA" == "$ARCHIVE_SHA" ]] && MATCH=true
  {
    echo "# codex app-server 프로토콜 스키마 산출물 (P00 S7 Step 1)"
    echo
    echo "- 명령: \`codex app-server generate-json-schema --out <tmp> --experimental -c features.memories=false\` → 이 폴더로 복사"
    echo "- 버전: $VERSION"
    echo "- 생성 시각: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- 재검증: \`npm run schema:diff\` (= \`bash packages/protocol/codex-schema/diff.sh\`; 재생성 결과가 다르면 비0 종료) / 갱신: \`--update\`(정본 디렉터리만, 덮어쓰기 전 diff 출력)"
    echo
    echo "| 파일 | bytes | sha256 |"
    echo "|---|---|---|"
    while IFS= read -r f; do
      echo "| $(realpath --relative-to="$TARGET" "$f") | $(wc -c <"$f" | tr -d ' ') | $(sha256sum "$f" | cut -d' ' -f1) |"
    done < <(find "$TARGET" -type f -not -name PROVENANCE.md -not -name diff.sh | sort)
    echo
    echo "- archive 대조(\`docs/planning/archive/evidence/codex_schema_0.166.0\`, v2 sha256 $ARCHIVE_SHA): archive_match: $MATCH"
  } > "$TARGET/PROVENANCE.md"
  echo "updated $TARGET (archive_match: $MATCH)"
  exit 0
fi

if diff -r "${EXCLUDE[@]}" "$TARGET" "$TMP/out" >"$TMP/diff.txt" 2>&1; then
  echo "schema unchanged ($VERSION)"
else
  echo "schema differs from $TARGET ($VERSION):"
  head -40 "$TMP/diff.txt"
  exit 1
fi
