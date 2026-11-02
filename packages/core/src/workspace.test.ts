/** P01 T1 — 워크스페이스 해석: core 가 protocol 패키지를 이름(`@agent-studio/protocol`)으로 import 한다(tsc NodeNext + vitest 양쪽). */
import { describe, expect, it } from "vitest";
import { PROTOCOL_PACKAGE } from "@agent-studio/protocol";

describe("workspace", () => {
  it("core가 protocol 패키지를 이름으로 import한다", () => {
    expect(PROTOCOL_PACKAGE).toBe("@agent-studio/protocol");
  });
});
