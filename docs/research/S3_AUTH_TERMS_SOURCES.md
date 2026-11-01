# S3 인증 약관 1차 출처 조사: CLI 로그인 재사용(Claude Code / Codex)의 공급자 약관 상태

| 항목 | 내용 |
|---|---|
| 조사일(모든 fetch) | 2026-11-02 |
| 목적 | ADR-0007("기본 = 설치된 CLI 로그인 재사용")의 재검토 조건 — "공급자 약관이 제3자 앱의 CLI 로그인 재사용을 명시적으로 금지하는가" — 를 **현재 live 1차 출처**로 판정할 근거 수집 |
| 대상 구성 | Claude: `@anthropic-ai/claude-agent-sdk` 0.3.316이 사용자가 설치한 `claude` 바이너리(2.1.316)를 spawn, 사용자의 기존 CLI OAuth 로그인 사용(API key 없음). Codex: `codex app-server`(0.166.0) stdio, 사용자의 기존 `codex login`(ChatGPT 로그인), `CODEX_HOME` 공유 |
| 방법 | WebFetch/WebSearch만 사용(읽기 전용). 로그인·설정 변경 CLI 미실행. 인용은 원문 그대로(≤3문장), 요약·블로그는 근거로 쓰지 않고 "2차"로 표시 |
| 선행 문서 | `docs/planning/01_architecture/adr/ADR-0007-인증-모드-CLI-로그인-재사용-기본.md`, `docs/planning/archive/evidence/research/RESEARCH_AGENT_GATEWAY.md`(2026-11-01) — §4에서 재검증 |
| 한계 | `openai.com/policies/*`, `help.openai.com/*`, `openai.com/index/*`는 WebFetch에 **HTTP 403**을 반환해 live 원문을 직접 확인하지 못함(§2.5, §2.6). Anthropic Consumer Terms·Usage Policy는 한국어 로컬라이즈 페이지가 서빙되어 한국어 원문을 인용 |

표기: **[fetch 2026-11-02]** = 조회일, **[page date: …]** = 페이지 자체 표기 날짜(없으면 "없음"), **해석** = 조사자 한 줄 해석(약관 자문 아님).

---

## 0. 요약(10줄)

1. Anthropic은 Claude Code Legal 페이지에서 **"third-party developers가 자기 앱에 Claude.ai 로그인을 제공하거나, 사용자 대신 Free/Pro/Max/Ultra 자격증명으로 요청을 라우팅하는 것"을 명시적으로 불허**하고, Agent SDK 사용 개발자는 **API key를 써야 한다**고 명시한다(§1.1, §1.2).
2. 같은 페이지는 동시에 **"end user가 수정되지 않은 Claude Code 바이너리에 자기 구독으로 로그인하는 것은 막지 않는다"**는 carve-out을 둔다(§1.1 c). Agent Studio가 토큰을 읽거나 저장하지 않고 바이너리의 자체 로그인에 맡기는 설계는 이 carve-out에 걸치지만, "Agent SDK 기반 제품은 API key"라는 문장과 정면으로 겹친다 — **회색지대, 보수적으로는 금지 쪽에 가깝다**.
3. Anthropic 지원 문서는 제3자 도구의 구독 사용을 **"재량으로 허용할 수 있으나 usage credits에서 차감할 권리를 보유"**하고, "서버에 정체를 왜곡하거나 제3자 트래픽을 구독 한도에 태우려는 도구"는 **금지·집행 대상**이라고 밝힌다(§1.4).
4. Anthropic 지원 문서(2026-06-15·10-07 공지)는 "Claude 플랜 로그인 상태에서 Agent SDK·`claude -p`·third-party app 사용은 여전히 구독 한도에서 차감"이라고 적어, **플랜 로그인 + SDK 사용이 기술적으로 차단되지 않고 있음을 공급자 스스로 전제**한다(§1.5).
5. Anthropic Usage Policy(한국어 서빙, 표기 시행일 2026-11-12)는 "소비자 구독을 통해 요청을 처리하거나 사용 중인 제품이나 클라이언트를 왜곡하는 서비스"를 **허가되지 않은 접근 제공**으로 열거한다(§1.7).
6. OpenAI app-server 공식 문서는 **"로컬 또는 오픈소스 앱이 app-server 인증을 쓰는 것은 계속 가능(SIWC 이전 권장)"**, **"app-server 인증은 상업·호스팅 서비스에는 한 번도 허용된 적 없음"**을 명시한다(§2.1). → 로컬 앱 Agent Studio의 `codex login` 재사용은 **명시적 허용 범위**, 단 Agent Studio가 유료/상업 배포라면 미허용.
7. OpenAI "Sign in with ChatGPT"(SIWC)는 **오픈소스·로컬 프로젝트에 플랜 사용 개방**, 유료/원격 호스팅 앱은 interest form/waitlist(§2.3). Codex 측 정식 전환 경로가 존재한다.
8. OpenAI Terms of Use / Usage Policies / Help Center는 403으로 원문 미확인(**찾지 못함**). 검색 스니펫상 "자격증명 공유 금지", "rate limit 우회·보호조치 우회 금지"가 있으나 2차 정보(§2.5).
9. 비공식 클라이언트에 대한 계정 조치: Anthropic은 "사전 통지 없이 집행 가능"·"usage credits로 전환 가능"을 공식 명시(§3). OpenAI는 "commercial/hosted 미허용" 외에 계정 조치 문구를 1차 출처에서 **찾지 못함**.
10. ADR-0007 재검토 조건 판정(§5): **Codex = 조건 미충족(허용 유지)**, **Claude = "명시적 금지"에 근접(Agent SDK 제품에 API key 요구 + claude.ai 로그인 제공 불허)**이나 end-user 자기 로그인 carve-out이 있어 완전 일치는 아님 → Claude 측은 "기본값 CLI 로그인 재사용"을 **공개 배포 전 재심의** 권고.

---

## 1. Anthropic

### 1.1 Claude Code — Legal and compliance

- URL: https://code.claude.com/docs/en/legal-and-compliance (동일 내용 `.md`: https://code.claude.com/docs/en/legal-and-compliance.md)
- [fetch 2026-11-02] [page date: 없음 — 본문에 effective/updated 날짜 표기 없음]

**(a) 라이선스 적용 약관**
> "Your use of Claude Code is subject to: Commercial Terms of Service - for Team, Enterprise, and Claude API users; Consumer Terms of Service - for Free, Pro, Max, and Ultra users"

해석: 개인 Pro/Max 사용자의 Claude Code 사용은 Consumer Terms 하에 있음.

**(b) OAuth 인증의 목적 한정**
> "**OAuth authentication** is intended exclusively for purchasers of Claude Free, Pro, Max, Ultra, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications."

해석: 구독 OAuth는 "Claude Code 및 Anthropic 네이티브 앱의 통상 사용" 용도로 한정.

**(c) 개발자·Agent SDK·제3자 앱 — 핵심 조항**
> "**Developers** building products or services that interact with Claude's capabilities, including those using the Agent SDK, should use API key authentication through Claude Console or a supported cloud provider. Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to a Claude account must complete through Anthropic's own flow."

해석: (1) Agent SDK 제품은 API key "should", (2) 자기 앱에 Claude.ai 로그인 제공 **불허**, (3) 사용자 대신 구독 자격증명 라우팅 **불허**, (4) 토큰 수집·저장·중개 **불허**, 로그인은 Anthropic 자체 플로우로만.

**(d) carve-out(예외)**
> "Nor does it prevent an end user from signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code as described under *Can customers offer Claude Code in their products?* above."

해석: end user가 **수정되지 않은 `claude` 바이너리**에 **자기** 구독으로 직접 로그인하는 것은 제한 대상이 아님. Agent Studio 설계(앱은 토큰을 읽지도 저장하지도 않고 CLI 프로세스가 자체 인증)는 이 문장에 기대는 구조.

**(e) 제품에 Claude Code 탑재 시 조건**
> "The Claude Code binary must not be modified. Claude Code must be installed and run as published by Anthropic, and customers may not remove, disable, or restrict any authentication method built into it (including methods that permit signing in with a Claude account or the user's own API key)."
> "Customers may not pay for, resell, or intermediate Claude usage on their end users' behalf. Each end user must authenticate with their own Anthropic API key, Claude subscription plan credentials, or 3P inference provider credential"

해석: 제품이 Claude Code를 실행하려면 Commercial Terms 동의 + 바이너리 무수정 + 사용자 본인 자격증명(구독 자격증명 포함 명시). 단 이 절은 "preinstalling or running Claude Code in your products or services (e.g. in hosted sandboxes…)" 맥락.

**(f) 사용 한도 전제 및 집행**
> "Advertised usage limits for Pro, Max, and Ultra plans assume ordinary, individual usage of Claude Code and the Agent SDK."
> "Anthropic reserves the right to take measures to enforce these restrictions and may do so without prior notice."

해석: 광고된 한도는 "개인의 통상 사용(Agent SDK 포함)" 전제; 위반 시 사전 통지 없는 집행 가능.

### 1.2 Claude Agent SDK — Overview (인증 노트·라이선스)

- URL: https://code.claude.com/docs/en/agent-sdk/overview (`https://docs.claude.com/en/docs/agent-sdk/overview` → 302 → `platform.claude.com/docs/en/agent-sdk/overview` → 307 → 여기로 리다이렉트, 2026-11-02 확인)
- [fetch 2026-11-02] [page date: 없음]

> "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods described in the Quickstart instead."

해석: Agent SDK 기반 제품이 claude.ai 로그인(=구독 rate limit)을 제품 기능으로 제공하는 것은 사전 승인 없이는 불허. RESEARCH_AGENT_GATEWAY.md §3 line 359 인용과 **문구 동일(재검증 OK)**.

> "Use of the Claude Agent SDK is governed by Anthropic's Commercial Terms of Service, including when you use it to power products and services that you make available to your own customers and end users, except to the extent a specific component or dependency is covered by a different license as indicated in that component's LICENSE file."

해석: Agent SDK 사용 자체가 Commercial Terms 적용 — ADR-0007 "결과" 항의 전제 확인. Commercial Terms는 "not for consumer use"(§1.8)이므로 "SDK로 만든 앱 + 사용자의 Consumer 구독 로그인" 조합은 두 약관 체계가 교차하는 지점.

> "Embed Claude Code's agent in your own Python or TypeScript application, in a process you operate | **Agent SDK** | A library that runs the Claude Code binary"

해석: SDK는 "Claude Code 바이너리를 실행하는 라이브러리"로 정의 — §1.1(d) "unmodified Claude Code binary" carve-out과의 연결 고리.

### 1.3 Claude Code — Authentication(자격증명 저장·우선순위)

- URL: https://code.claude.com/docs/en/authentication
- [fetch 2026-11-02] [page date: 없음]

> "On Windows, credentials are stored in `%USERPROFILE%\.claude\.credentials.json` and inherit the access controls of your user profile directory"
> "`apiKeyHelper`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_AUTH_TOKEN` apply to the CLI and the surfaces that wrap it, including the VS Code extension, the Agent SDK, and GitHub Actions."
> "7. Subscription OAuth credentials from `/login`. This is the default for Claude Pro, Max, Ultra, Team, and Enterprise users."

해석: SDK가 spawn한 `claude`는 환경변수 API key가 없으면 우선순위 최하위인 구독 OAuth(`/login` 저장분)를 사용 — Agent Studio의 "API key 없음" 경로가 실제로 구독 로그인으로 떨어짐을 공식 문서가 기술. `claude setup-token`(`CLAUDE_CODE_OAUTH_TOKEN`)도 "This token authenticates with your Claude subscription and requires a Pro, Max, Ultra, Team, or Enterprise plan."

### 1.4 Claude Help Center — "Log in to your Claude account"(제3자 도구 절)

- URL: https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account (Legal 페이지가 직접 링크)
- [fetch 2026-11-02] [page date: "Updated this week"(상대 표기, 절대 날짜 없음)]

> "Subscription plans can only be used by subscribers, and the usage included in these plans is designed to support ordinary use of native Anthropic applications including the Claude web, desktop, and mobile applications and Claude Code."
> "The preferred way to access Anthropic services using third-party software, tools, or services is through API key authentication through Claude Console or a supported cloud provider. Anthropic may at its discretion allow paid subscribers who have enabled usage credits to use certain third-party tools to access Anthropic services included in paid subscription plans but reserves the right to draw use of such third-party tools from usage credits rather than subscription limits."
> "Use of third-party tools that misrepresent their identity to Anthropic's servers, attempt to route third-party traffic against subscription limits, or otherwise violate applicable terms or policies is prohibited and such use may be enforced against."

해석: 제3자 도구 + 구독 = "재량 허용 + usage credits 차감 가능"; 금지선은 (1) 서버에 정체 왜곡, (2) 제3자 트래픽을 구독 한도에 태우기. Agent Studio는 SDK 공식 경로로 정체를 왜곡하지 않지만, "구독 한도에 태우는 제3자 트래픽"에 해당할 수 있음(사용자가 usage credits를 켰을 때 그쪽으로 과금될 위험 → UI 고지 필요).

### 1.5 Claude Help Center — "Use the Claude Agent SDK with your Claude plan"

- URL: https://support.claude.com/en/articles/15036540
- [fetch 2026-11-02] [page date: "Updated yesterday"(상대 표기); 본문 공지 날짜 2026-06-15, 2026-10-07]

> (2026-06-15 공지) "We've paused the previously-announced changes to Claude Agent SDK usage." … "Claude Agent SDK, `claude -p`, and third-party app usage still draw from your subscription limits."
> (2026-10-07 공지) "when you're signed in with your Claude plan, the Claude Agent SDK and `claude -p` still draw from your subscription limits."

해석: Anthropic이 "플랜 로그인 상태의 Agent SDK 사용"을 현실로 인정하고 과금 귀속(구독 한도)을 안내 — **P00 S3 실측 전 "기술적 차단" 가능성은 낮음**을 시사. 다만 10-07 공지는 Max/Ultra/Team에 월간 API credits를 포함시켜 "연결된 Console org의 API key로 SDK 사용"을 정식 경로로 밀고 있음.

### 1.6 Anthropic Consumer Terms of Service

- URL: https://www.anthropic.com/legal/consumer-terms (한국어 로컬라이즈 페이지가 서빙됨; `/en/legal/consumer-terms`는 404)
- [fetch 2026-11-02] [page date: 시행일 2025-10-08]

> "귀하는 귀하의 계정 로그인 정보, Anthropic API 키 또는 계정 자격증명(credentials)을 타인과 공유하거나 귀하의 계정을 타인에게 제공할 수 없습니다."
> (금지행위 §3-7) "귀하가 Anthropic API 키를 통해 당사 서비스에 접속하거나 당사가 이를 명시적으로 허용하는 경우를 제외하고 봇(bot), 스크립트(script) 또는 기타 방식을 통해 자동화된 또는 비인간적인 방식을 통해 당사 서비스에 접속"
> (전문) 상업 서비스 약관은 "귀하의 Anthropic API 키, Anthropic 콘솔(Console)" 사용을 규율하며 Claude.ai/Claude Pro 개인 사용은 포함하지 않음.

해석: 소비자 약관에 "제3자 앱에서 구독 자격증명 사용"을 직접 다루는 조항은 **없음**(찾지 못함). 가장 가까운 것은 "자동화된 접속" 금지(API key 또는 명시적 허용 예외) — Claude Code 자체가 Anthropic이 허용한 자동화 클라이언트이므로 바이너리 무수정 사용은 예외 쪽.

### 1.7 Anthropic Usage Policy(AUP)

- URL: https://www.anthropic.com/legal/aup (한국어 로컬라이즈 페이지 서빙; `/en/legal/aup` 404)
- [fetch 2026-11-02] [page date: 페이지 표기 "Effective: Nov 12, 2026" — 조회일보다 미래 날짜로 표기됨. 예고 버전일 가능성; "See version history" 링크 존재]

> (§01 범용 사용 표준 › "플랫폼을 남용하지 마세요") "소비자 구독을 통해 요청을 처리하거나 사용 중인 제품이나 클라이언트를 왜곡하는 서비스를 포함해 허가되지 않은 수단을 통해 Claude를 재판매하거나, 대리하거나, 다른 방법으로 접근 권한을 제공하는 행위"
> (같은 절) "…Anthropic의 사전 승인 없이 제품 내에 설정된 기능, 제한 사항, 가드레일을 의도적으로 우회하거나 방해하는 행위"

해석: AUP 차원에서도 "소비자 구독으로 요청을 처리하는 서비스"와 "클라이언트 왜곡"이 금지 예시로 **명문화**. Agent Studio가 "서비스"(타인에게 접근 제공)가 아니라 사용자 본인 로컬 도구이면 직접 해당은 아니나, 공개 배포 제품이 타 사용자의 구독으로 요청을 처리하게 만드는 구조는 이 문구에 걸릴 소지.

### 1.8 Anthropic Commercial Terms of Service

- URL: https://www.anthropic.com/legal/commercial-terms
- [fetch 2026-11-02] [page date: Effective Jun 17, 2025]

> "They govern Customer's use of Anthropic API keys and any other Anthropic offerings that references these Terms, as well as all related Anthropic tools, documentation and services"
> "Services under these Terms are not for consumer use. Our consumer offerings (e.g., Claude.ai) are governed by our Consumer Terms of Service instead."

해석: Agent SDK는 §1.2에 따라 이 약관을 참조하므로 적용됨; "Claude Code"/"Agent SDK"를 본문에서 직접 명명하지는 않음(찾지 못함).

---

## 2. OpenAI

### 2.1 Codex app-server 공식 문서

- URL: https://learn.chatgpt.com/docs/app-server (`https://developers.openai.com/codex/app-server` → 308 리다이렉트, 2026-11-02 확인)
- [fetch 2026-11-02] [page date: 없음]

**(a) 대상·지위**
> "Codex app-server is the interface Codex uses to power rich clients (for example, the Codex VS Code extension)."
> "Use it when you want a deep integration inside your own product" / "If you are automating jobs or running Codex in CI, use the [Codex SDK]"
> "The app-server command and WebSocket transport are experimental and aren't supported for production workloads."

해석: 제3자 "own product"의 deep integration용으로 공식 안내되나 experimental·프로덕션 미지원 — 안정성 리스크는 별도.

**(b) 인증 조항 — 핵심("Auth endpoints" 절)**
> "If you've built a local or open-source application using Codex app-server authentication, you can continue using it, though we recommend migrating to Sign in with ChatGPT so users have greater control over and visibility into their usage."
> "App-server authentication has never been permitted for commercial or hosted services. We launched Sign in with ChatGPT to support these use cases, and we're excited to see what you build. Join our partner waitlist here."

해석: **로컬/오픈소스 앱의 app-server 인증(=사용자 기존 `codex login`) 계속 사용 = 명시적 허용**; **상업·호스팅 서비스 = 명시적 불허**(과거에도 허용된 적 없음). ADR-0007 맥락 문장과 일치(재검증 OK). Agent Studio가 유료/상업 제품이 될 경우 Codex 측은 SIWC(§2.3) 경로가 공식 대안.

**(c) 로그인 방식**
> "`account/login/start`: begin login (`apiKey`, `chatgpt`, `chatgptDeviceCode`, or experimental `chatgptAuthTokens`)."
> "Codex owns the ChatGPT OAuth flow, persists tokens, and refreshes them automatically."
> (`chatgptAuthTokens`) "Use this experimental mode only when a host application owns the user's ChatGPT auth lifecycle" / "Clients must set `capabilities.experimentalApi = true` during `initialize` before using this login type."

해석: 기본 `chatgpt` 모드는 Codex 자체가 토큰을 소유·갱신 → Agent Studio는 토큰을 만지지 않는 구조가 공식 모델. 외부 토큰 주입(`chatgptAuthTokens`)은 실험적.

**(d) 기타**
> "Use these to determine auth state, start or cancel logins, logout, inspect ChatGPT rate limits, and notify workspace owners about depleted credits or usage limits."
> (enterprise) "please contact OpenAI to get it added to a known clients list."

해석: rate limit 조회 API(`account/rateLimits`류)가 공식 제공 — S3 실측 시 차단 여부 관찰 지점. "known clients list"는 enterprise 맥락.

### 2.2 Codex 인증 문서(`codex login`, auth.json)

- URL: https://learn.chatgpt.com/docs/auth (`https://developers.openai.com/codex/auth` → 308; GitHub `docs/authentication.md`는 이 URL로의 포인터 1줄만 있음: "For information about Codex CLI authentication, see [this documentation](https://developers.openai.com/codex/auth).")
- [fetch 2026-11-02] [page date: 없음]

> "Sign in with ChatGPT for subscription access" / "Sign in with an API key for usage-based access"
> "Codex caches login details locally in a plaintext file at `~/.codex/auth.json` or in your OS-specific credential store." / "`file` stores credentials in `auth.json` under `CODEX_HOME` (defaults to `~/.codex`)."
> "Treat `~/.codex/auth.json` like a password: it contains access tokens."
> "When you sign in with an API key, Codex uses standard API pricing instead of included ChatGPT plan credits." / "Use API key authentication for programmatic Codex CLI workflows, such as CI/CD jobs."
> (관리 환경) `forced_login_method = "chatgpt" # or "api"` … "If the active credentials don't match the configured restrictions, Codex logs the user out and exits."

해석: `CODEX_HOME` 공유로 app-server가 사용자의 기존 로그인을 그대로 쓰는 것이 문서화된 기본 동작. 이 페이지에는 제3자 앱 사용 제한 문구 **없음**(찾지 못함); 사이드바 "Apps powered by your user's ChatGPT plan" 링크 → `/siwc`.

### 2.3 Sign in with ChatGPT(SIWC) 개발자 문서

- URL(들): https://developers.openai.com/siwc , https://developers.openai.com/siwc/quickstart , https://developers.openai.com/siwc/token-sharing-open-source , https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt
- [fetch 2026-11-02] [page date: 없음(4개 모두)]

> (siwc) "Let users sign in with ChatGPT and use their ChatGPT plan for eligible AI requests in your app."
> (token-sharing-open-source) "These docs explain ChatGPT plan usage for open-source and locally hosted apps." / "If you're interested in offering it in a paid or remotely hosted app, complete the interest form."
> (token-sharing-open-source) "ChatGPT plan usage is an optional capability within Sign in with ChatGPT." … (Responses API 요청에 한함; "does not grant access to their ChatGPT conversations or other account context.")
> (cookbook) 플랜 사용은 "open-source projects, personal projects that run locally, and selected private apps"에 제공; identity-only 로그인은 "offered to a select group of commercial partners"; 유료/원격 호스팅 앱은 waitlist.

해석: Codex 측 "정식" 제3자 경로. 오픈소스·로컬 프로젝트는 즉시 가능, 유료/호스팅은 신청제. Agent Studio가 Codex를 app-server 대신 SIWC+Responses API로 돌리면 app-server 기능(승인·스레드·도구)을 잃으므로, 현실적으로는 §2.1(b)의 "로컬/오픈소스 앱 계속 사용" 조항에 의존하게 됨. quickstart/siwc 페이지에는 CLI·로컬 앱·프록시·토큰 재사용 제한 문구 **없음**(찾지 못함).

### 2.4 OpenAI Help Center(Codex 사용 한도, 플랜 공유)

- URL: https://help.openai.com/en/articles/11369540 (Codex 사용 한도), https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites , https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt
- [fetch 2026-11-02] **HTTP 403 — 원문 확인 불가 → 찾지 못함(직접 인용 없음)**
- 2차(검색 스니펫, 미검증): 11369540 — "Launch your preferred Codex client and follow the instructions to sign in with ChatGPT"; 20001542 — 플랜 공유는 Go/Plus/Pro 한정, 앱별 주간 한도 설정 가능, 초기 파트너 Airtable·GitLab·HubSpot·Notion·Supabase·Vercel.

해석: "preferred Codex client"라는 표현은 클라이언트 다양성을 전제하나, 제3자 클라이언트의 구독 사용에 대한 계정 조치 문구는 스니펫에서 확인되지 않음.

### 2.5 OpenAI Terms of Use / Usage Policies / Services Agreement

- URL: https://openai.com/policies/terms-of-use/ , https://openai.com/policies/row-terms-of-use/ , https://openai.com/policies/usage-policies/ , https://openai.com/policies/services-agreement/
- [fetch 2026-11-02] **HTTP 403(모든 변형 URL: `/`, 무슬래시, `en-GB`, `www.openai.com/terms`) — 원문 확인 불가 → 찾지 못함**
- `https://cdn.openai.com/osa/openai-services-agreement.pdf`는 내려받았으나 본 세션에서 텍스트 추출 도구 부재로 미파싱(파일: `C:\Users\<user>\.claude\projects\D--LLM\12103321-73f5-45bc-9381-c9526685abf9\tool-results\webfetch-1793557839433-a7ehtx.pdf`).
- 2차(openai.com 도메인 한정 검색 스니펫, 미검증): Terms of Use — 계정 자격증명 공유·타인 사용 금지, "circumvent any rate limits or restrictions or bypass any protective measures" 금지, 자동·프로그램적 데이터 추출 금지; Usage Policies — 표기 효력일 2026-11-20(검색 메타), "circumventing safeguards may mean losing access"; Services Agreement — API key 매매·양도 금지, Usage Limits 우회 금지.

해석: "제3자 앱에서 ChatGPT 자격증명 사용"을 직접 금지하는 조항은 스니펫에서 **발견되지 않음**. 가장 가까운 것은 rate limit/보호조치 우회 금지 — app-server 공식 로그인 경로를 그대로 쓰는 한 "우회"로 보기 어렵다는 것이 조사자 해석(확정 아님).

### 2.6 GitHub openai/codex 저장소·블로그

- `https://raw.githubusercontent.com/openai/codex/main/codex-rs/app-server/README.md` [fetch 2026-11-02]: main 브랜치의 이 파일은 현재 H1 "Managed human command checkpoints (experimental)"로 시작하며(크기 48,405 bytes) app-server 개요·인증 절이 **없음**. 이전 조사에서 참조하던 "app-server README 개요"는 learn.chatgpt.com/docs/app-server(§2.1)로 옮겨간 것으로 보임. 인용 가능한 문장: "API-key and explicitly external-auth providers bypass discovery."(모델 프로바이더 admission 절) — 본 주제와 무관.
- `https://raw.githubusercontent.com/openai/codex/main/docs/app-server.md`: 404(찾지 못함).
- `https://openai.com/index/unlocking-the-codex-harness` (블로그, 검색 메타상 2026-02-04): 403. 2차 스니펫: "we didn't expect other clients to depend on the App Server, so it wasn't designed as a stable API" — 안정성 관련, 약관 아님.

---

## 3. 비공식 클라이언트의 구독 사용에 대한 rate limit·계정 조치 공식 언급

| 공급자 | 출처 | 인용(요지) | 해석 |
|---|---|---|---|
| Anthropic | §1.1(f) Legal | "Advertised usage limits … assume ordinary, individual usage of Claude Code and the Agent SDK." / "may do so without prior notice." | 한도는 개인 통상 사용 전제, 사전 통지 없는 집행 가능 |
| Anthropic | §1.4 Help(로그인) | "reserves the right to draw use of such third-party tools from usage credits rather than subscription limits" / "such use may be enforced against" | 제3자 도구 사용은 usage credits 차감 또는 집행 대상 |
| Anthropic | §1.5 Help(SDK) | "Agent SDK, `claude -p`, and third-party app usage still draw from your subscription limits." | 현재는 구독 한도 차감(차단 아님) |
| OpenAI | §2.1(b),(d) app-server | "never been permitted for commercial or hosted services" / "inspect ChatGPT rate limits … depleted credits or usage limits" | 상업·호스팅 외 계정 조치 문구 없음; rate limit 조회 API 공식 제공 |
| OpenAI | §2.4, §2.5 | 403 — **찾지 못함** | 공식 계정 조치 문구 미확인 |

---

## 4. 선행 조사(RESEARCH_AGENT_GATEWAY.md, 2026-11-01) 인용 재검증

| 선행 인용 | 재검증 결과(2026-11-02) |
|---|---|
| §3 line 359: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." | **동일 문구 live 확인**(§1.2). |
| §1.2: `platform.claude.com/docs/en/agent-sdk/*` → `code.claude.com/docs/en/agent-sdk/*` 307 | 유지. 추가로 `docs.claude.com/en/docs/agent-sdk/overview` → 302 → platform → 307 → code.claude.com. |
| §1.2: `developers.openai.com/codex/*` → `learn.chatgpt.com/docs/*` 308 | 유지(`/codex/app-server`, `/codex/auth` 확인). |
| line 263: "Use the Codex app server to build custom clients that handle authentication, conversation history, approvals, and streamed agent events." | 미재조회(본 주제 범위 밖). |
| ADR-0007 맥락: "Anthropic legal: 제3자 앱의 Claude.ai 로그인·구독 대리 라우팅 불허" | **확인**(§1.1 c). 추가 발견: end-user 자기 로그인 carve-out(§1.1 d), 제3자 도구 재량·usage credits 조항(§1.4), SDK 구독 과금 공지(§1.5). |
| ADR-0007 맥락: "OpenAI app-server: 기존 로컬/오픈소스 앱 인증 지속·SIWC 권장, 상업·호스팅 불허" | **확인**(§2.1 b). |
| ADR-0007 결과: "Claude Agent SDK는 Anthropic Commercial Terms" | **확인**(§1.2 License and terms). |

---

## 5. ADR-0007 재검토 조건에 대한 조사자 판정(약관 자문 아님)

재검토 조건: "공급자 약관이 CLI 로그인 재사용을 명시적으로 금지하거나 P00 S3 실측에서 차단될 때 → API key 기본으로 전환".

- **OpenAI/Codex**: 명시적 금지 **없음**, 오히려 "로컬 또는 오픈소스 앱의 app-server 인증 계속 사용"이 **명시적 허용**(§2.1 b). 단서: (1) "commercial or hosted services"는 불허 — Agent Studio를 유료·상업 배포할 계획이면 해당 시점에 재검토 필요, (2) OpenAI는 SIWC로의 이전을 "권장". → **조건 미충족, 기본값 유지 가능**(로컬·비상업 전제).
- **Anthropic/Claude**: "CLI 로그인 재사용" 자체를 문자 그대로 금지한 문장은 없으나, (a) "Agent SDK를 쓰는 개발자는 API key를 써야 한다", (b) "제3자 개발자가 자기 앱에 Claude.ai 로그인을 제공·구독 자격증명 라우팅 불허", (c) "Agent SDK 기반 제품이 claude.ai 로그인·rate limit을 제공하는 것 불허(사전 승인 제외)"가 **명시**되어 있고(§1.1 c, §1.2), AUP가 "소비자 구독으로 요청을 처리하는 서비스"를 금지 예시로 든다(§1.7). 반대편 근거는 (d) "end user가 수정되지 않은 바이너리에 자기 구독으로 로그인하는 것은 막지 않는다"(§1.1 d)와 (e) "제3자 도구 사용을 재량 허용·usage credits 차감"(§1.4), (f) "플랜 로그인 + SDK 사용은 구독 한도 차감"(§1.5)이다.
  - 사용자 **본인이** 로컬에서 자기 구독으로 쓰는 개인 도구 범위: (d)(e)(f)에 기대어 "명시적 금지"로 단정하기 어려움.
  - **공개 배포 제품의 기본값**으로 "구독 로그인 재사용"을 내세우는 것: (a)(b)(c)에 직접 저촉될 소지가 큼("offer claude.ai login … for their products, including agents built on the Claude Agent SDK").
  - → **권고**: Claude 측은 ADR-0007의 "공개 배포 전 사용·재배포 조건 확인 게이트"를 S3에서 실제로 실행하고, (1) 앱이 토큰을 읽지·저장하지·중개하지 않음, (2) 로그인은 `claude` 바이너리의 Anthropic 자체 플로우로만 완료됨, (3) 제품 UI에서 "claude.ai 로그인"을 제품 기능으로 광고하지 않음, (4) usage credits 차감 가능성 고지 — 를 설계 제약으로 명문화하고, 공개 배포 시점에는 Anthropic contact-sales로 허용 여부 확인(Legal 페이지가 안내하는 경로)을 게이트로 두는 것이 안전. 실측(P00 S3)에서 SDK 경로가 400/인증 오류로 차단되면 즉시 API key 기본으로 전환.

---

## 6. 요약표

| 공급자 | 명시적 금지 있음? | 명시적 허용 있음? | 조건/비고 |
|---|---|---|---|
| Anthropic (Claude Code / Agent SDK) | **부분 있음** — 제3자 개발자의 Claude.ai 로그인 제공·구독 자격증명 라우팅·토큰 수집/저장/중개 불허; Agent SDK 제품은 API key "should"; "Agent SDK 기반 제품이 claude.ai 로그인/rate limit 제공" 사전 승인 없이는 불허(§1.1 c, §1.2); AUP "소비자 구독으로 요청 처리하는 서비스" 금지 예시(§1.7) | **부분 있음** — end user가 **수정되지 않은** Claude Code 바이너리에 **자기** 구독으로 로그인하는 것은 제한하지 않음(§1.1 d); 제3자 도구는 재량 허용·usage credits 차감 가능(§1.4); 플랜 로그인 상태의 SDK 사용은 구독 한도 차감(§1.5) | 개인·로컬 사용과 "제품으로 제공"의 경계가 핵심. 바이너리 무수정, 토큰 비접촉, Anthropic 자체 로그인 플로우 유지가 전제. 집행은 사전 통지 없이 가능. Consumer Terms(2025-10-08)·AUP(표기 2026-11-12)는 한국어 서빙본 인용. OpenAI 대비 금지 쪽 문구가 강함 |
| OpenAI (Codex app-server / CLI) | **있음(범위 한정)** — "App-server authentication has never been permitted for commercial or hosted services."(§2.1 b) | **있음** — "If you've built a local or open-source application using Codex app-server authentication, you can continue using it"(§2.1 b) | 로컬·오픈소스 앱이면 허용, 상업·호스팅이면 불허. SIWC 이전 "권장". app-server는 experimental·프로덕션 미지원. Terms of Use/Usage Policies/Help Center는 403으로 원문 미확인 |

---

## Sources

조회일: 모두 2026-11-02. (403/404 = 본 세션에서 원문 확인 실패)

Anthropic
- https://code.claude.com/docs/en/legal-and-compliance — Claude Code Legal and compliance (page date 없음)
- https://code.claude.com/docs/en/legal-and-compliance.md — 동일 문서 Markdown
- https://code.claude.com/docs/en/agent-sdk/overview — Agent SDK overview (page date 없음)
- https://docs.claude.com/en/docs/agent-sdk/overview — 302 → platform.claude.com → 307 → code.claude.com
- https://platform.claude.com/docs/en/agent-sdk/overview — 307 → code.claude.com
- https://code.claude.com/docs/en/authentication — Claude Code Authentication (page date 없음)
- https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account — Help Center, "Updated this week"
- https://support.claude.com/en/articles/15036540 — "Use the Claude Agent SDK with your Claude plan", "Updated yesterday", 공지 2026-06-15·2026-10-07
- https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan — "Updated yesterday"; 제3자/SDK 언급 없음
- https://www.anthropic.com/legal/consumer-terms — Consumer Terms(한국어 서빙), 시행일 2025-10-08
- https://www.anthropic.com/legal/aup — Usage Policy(한국어 서빙), 표기 Effective 2026-11-12
- https://www.anthropic.com/legal/commercial-terms — Commercial Terms, Effective 2025-06-17
- https://www.anthropic.com/en/legal/consumer-terms , https://www.anthropic.com/en/legal/aup — 404

OpenAI
- https://learn.chatgpt.com/docs/app-server — Codex app-server (page date 없음)
- https://developers.openai.com/codex/app-server — 308 → learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/auth — Codex Authentication (page date 없음)
- https://developers.openai.com/codex/auth — 308 → learn.chatgpt.com/docs/auth
- https://raw.githubusercontent.com/openai/codex/main/docs/authentication.md — developers.openai.com/codex/auth 포인터
- https://raw.githubusercontent.com/openai/codex/main/codex-rs/app-server/README.md — 현재 "Managed human command checkpoints (experimental)" 문서(인증 개요 없음)
- https://api.github.com/repos/openai/codex/contents/codex-rs/app-server/README.md — 위 파일 메타(size 48405)
- https://raw.githubusercontent.com/openai/codex/main/docs/app-server.md — 404
- https://developers.openai.com/siwc — Sign in with ChatGPT 개요 (page date 없음)
- https://developers.openai.com/siwc/quickstart — SIWC Quickstart (page date 없음)
- https://developers.openai.com/siwc/token-sharing-open-source — ChatGPT Plan Usage for Open-Source Apps (page date 없음)
- https://developers.openai.com/siwc/preview-limitations — 404
- https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt — Cookbook: Integrating SIWC in your Opensource App (page date 없음)
- https://help.openai.com/en/articles/11369540 — 403
- https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites — 403
- https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt — 403
- https://openai.com/policies/terms-of-use/ , https://openai.com/policies/row-terms-of-use/ , https://openai.com/en-GB/policies/row-terms-of-use/ , https://www.openai.com/terms — 403
- https://openai.com/policies/usage-policies/ — 403
- https://openai.com/policies/services-agreement/ — 403; PDF https://cdn.openai.com/osa/openai-services-agreement.pdf 는 다운로드만(미파싱)
- https://openai.com/index/unlocking-the-codex-harness — 403(검색 메타: 2026-02-04)

저장소 내부
- `D:\LLM\agent-studio\docs\planning\01_architecture\adr\ADR-0007-인증-모드-CLI-로그인-재사용-기본.md`
- `D:\LLM\agent-studio\docs\planning\archive\evidence\research\RESEARCH_AGENT_GATEWAY.md`
