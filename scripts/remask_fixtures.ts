/**
 * 기존 녹화 픽스처에 현재 `spikes/_shared/mask.ts` 규칙을 다시 적용한다(마스킹 규칙이 강화됐을 때 1회 실행).
 * 사용: npx tsx scripts/remask_fixtures.ts [--check]
 *   --check: 변경 파일만 출력하고 쓰지 않는다(종료 코드 1 = 미마스킹 잔존).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mask } from "../spikes/_shared/mask.js";

const ROOT = join(import.meta.dirname, "..", "spikes", "fixtures");
const check = process.argv.includes("--check");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsonl|json)$/.test(name)) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const before = readFileSync(file, "utf8");
  const after = mask(before);
  if (after !== before) {
    changed++;
    console.log(`${check ? "needs-remask" : "remasked"}: ${file.slice(ROOT.length + 1)}`);
    if (!check) writeFileSync(file, after);
  }
}
console.log(`${changed} file(s) ${check ? "need remasking" : "remasked"}`);
if (check && changed > 0) process.exit(1);
