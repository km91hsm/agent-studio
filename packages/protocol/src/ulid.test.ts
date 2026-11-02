import { describe, expect, it } from "vitest";
import { ulid } from "./ulid.js";

const CROCKFORD = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

describe("ulid (event_id)", () => {
  it("길이 26, Crockford base32 문자만", () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(CROCKFORD);
  });

  it("같은 ms 안에서 1000개가 사전순 단조 증가(중복 없음)", () => {
    const now = 1_762_041_600_000;
    const ids = Array.from({ length: 1000 }, () => ulid(now));
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i] > ids[i - 1], `#${i} ${ids[i]} > ${ids[i - 1]}`).toBe(true);
    }
    expect(new Set(ids).size).toBe(1000);
  });

  it("시각이 커지면 앞 10자(시간부)가 커진다", () => {
    const a = ulid(1_000);
    const b = ulid(2_000);
    expect(b.slice(0, 10) > a.slice(0, 10)).toBe(true);
  });
});
