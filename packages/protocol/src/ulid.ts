/** ULID(26자, Crockford base32) — 저널 `event_id`. 같은 ms 안에서는 난수부를 +1 해 단조 증가를 보장한다. */
import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RAND_LEN = 16;

let lastTime = -1;
let lastRand: number[] = [];

function encodeTime(ms: number): string {
  let out = "";
  let t = ms;
  for (let i = 0; i < TIME_LEN; i++) {
    out = ALPHABET[t % 32] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function freshRand(): number[] {
  const bytes = randomBytes(RAND_LEN);
  return Array.from(bytes, (b) => b % 32);
}

function increment(r: number[]): number[] {
  const next = [...r];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]! < 31) {
      next[i]! += 1;
      return next;
    }
    next[i] = 0;
  }
  throw new Error("ulid: random component overflow");
}

export function ulid(now: number = Date.now()): string {
  if (now === lastTime) {
    lastRand = increment(lastRand);
  } else {
    lastTime = now;
    lastRand = freshRand();
  }
  return encodeTime(now) + lastRand.map((v) => ALPHABET[v]).join("");
}
