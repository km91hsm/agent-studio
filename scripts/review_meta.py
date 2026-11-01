"""Codex 리뷰 폴더의 events.jsonl 에서 thread_id·usage 를 뽑아 meta.json 을 만든다.
사용: python -I -X utf8 scripts/review_meta.py <ID> [<ID> ...]   (docs/reviews/codex/<ID>/)
"""
import json, sys
from pathlib import Path

def build(folder: Path, call: str) -> dict:
    thread = None; usage = None
    for line in (folder / "events.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if e.get("type") == "thread.started":
            thread = e.get("thread_id")
        if e.get("type") == "turn.completed":
            usage = e.get("usage")
    rd = lambda n: (folder / n).read_text(encoding="utf-8").strip() if (folder / n).exists() else None
    return {
        "call": f"{call}_review",
        "purpose": f"{call} 스파이크 교차 리뷰(읽기 전용, features.memories=false)",
        "thread_id": thread,
        "reasoning_effort": "high",
        "sandbox": "read-only",
        "started_at": rd("started_at"),
        "finished_at": rd("finished_at"),
        "exit_code": int(rd("exit_code") or -1),
        "usage": usage,
    }

for call in sys.argv[1:]:
    folder = Path("docs/reviews/codex") / call
    meta = build(folder, call)
    with open(folder / "meta.json", "w", encoding="utf-8", newline="") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(call, meta["thread_id"], meta["usage"])
