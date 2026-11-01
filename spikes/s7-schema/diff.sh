#!/usr/bin/env bash
# S7 Step 1 — codex app-server 프로토콜 스키마를 재생성해 커밋본(spikes/s7-schema/codex-schema/)과 비교한다.
#   bash spikes/s7-schema/diff.sh            : 재생성 → diff -r (변경 시 비0 종료)   ← P01 T10 CI 입력
#   bash spikes/s7-schema/diff.sh --update   : 커밋본 갱신 + PROVENANCE.md(버전·sha256·archive 대조)
#   S7_SCHEMA_DIR=<dir> 로 비교 대상을 바꿀 수 있다(테스트의 변조본 검사용).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${S7_SCHEMA_DIR:-$HERE/codex-schema}"
# docs/planning/archive/evidence/codex_schema_0.166.0/PROVENANCE.md 의 v2 번들 sha256(2026-11-01)
ARCHIVE_SHA="f72bb03a3f519cd19b37a030b42453128ff5b88abaad8c1264cf1ca197dbbed0"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
codex app-server generate-json-schema --out "$TMP/out" --experimental -c features.memories=false >/dev/null
VERSION="$(codex --version)"

if [[ "${1:-}" == "--update" ]]; then
  mkdir -p "$TARGET"
  find "$TARGET" -mindepth 1 -not -name PROVENANCE.md -delete
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
    echo "- 재검증: \`bash spikes/s7-schema/diff.sh\` (재생성 결과가 다르면 비0 종료)"
    echo
    echo "| 파일 | bytes | sha256 |"
    echo "|---|---|---|"
    while IFS= read -r f; do
      echo "| $(realpath --relative-to="$TARGET" "$f") | $(wc -c <"$f" | tr -d ' ') | $(sha256sum "$f" | cut -d' ' -f1) |"
    done < <(find "$TARGET" -type f -not -name PROVENANCE.md | sort)
    echo
    echo "- archive 대조(\`docs/planning/archive/evidence/codex_schema_0.166.0\`, v2 sha256 $ARCHIVE_SHA): archive_match: $MATCH"
  } > "$TARGET/PROVENANCE.md"
  echo "updated $TARGET (archive_match: $MATCH)"
  exit 0
fi

if diff -r -x PROVENANCE.md "$TARGET" "$TMP/out" >"$TMP/diff.txt" 2>&1; then
  echo "schema unchanged ($VERSION)"
else
  echo "schema differs from $TARGET ($VERSION):"
  head -40 "$TMP/diff.txt"
  exit 1
fi
