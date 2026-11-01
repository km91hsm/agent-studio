// S9 — 최소 MCP stdio 서버(탐침 전용). Codex `-c mcp_servers.s9_probe={command:"node",args:[이 파일]}` 로 주입해
// mcpServerStatus/list 에서 "핸드셰이크 성공 + 도구 1개"가 관찰되는지 본다(Codex 리뷰 #3: 이름 등장만으로는 '기동'이 아님).
// JSON-RPC 2.0, 줄 단위(newline-delimited). 도구 s9_echo 는 입력을 그대로 돌려준다 — 부작용 없음.
import { createInterface } from "node:readline";

const PROTOCOL = "2025-06-18";
const TOOLS = [{ name: "s9_echo", description: "S9 probe: echoes its input (no side effects)", inputSchema: { type: "object", properties: { text: { type: "string" } }, additionalProperties: false } }];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
  }
  const { id, method, params } = req;
  if (id === undefined || id === null) return; // notification (notifications/initialized 등) — 응답 없음
  switch (method) {
    case "initialize":
      return send({ jsonrpc: "2.0", id, result: { protocolVersion: (params && params.protocolVersion) || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: "s9_probe", version: "0.0.1" } } });
    case "ping":
      return send({ jsonrpc: "2.0", id, result: {} });
    case "tools/list":
      return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    case "tools/call":
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: String((params && params.arguments && params.arguments.text) ?? "ok") }], isError: false } });
    default:
      return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
  }
});
rl.on("close", () => process.exit(0));
