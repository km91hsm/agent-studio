/**
 * 저널 이벤트 계약 (P01 T3). 이벤트 타입 이름은 DATABASE_SCHEMA §2.1 목록이 단일 출처이며
 * `events.test.ts` 가 문서를 파싱해 이 배열과 집합 동치를 강제한다(이름을 바꾸거나 더하면 테스트가 깨진다).
 * `McpElicitation-requested` 는 문서 표기 그대로(오타 추정 — P01 보고서에 정본 수정 제안).
 */

export const EVENT_TYPES = [
  "WorkspaceCreated",
  "WorkspaceSettingsChanged",
  "ProjectRegistered",
  "ProjectPolicyChanged",
  "ProjectSettingsChanged",
  "ProjectTrustChanged",
  "RequirementAdded",
  "RequirementChanged",
  "RequirementRemoved",
  "RequirementLinked",
  "RequirementUnlinked",
  "PhaseProposed",
  "PhaseAccepted",
  "PhaseEdited",
  "PhaseDepAdded",
  "PhaseDepRemoved",
  "TaskCreated",
  "TaskTransition",
  "PauseRequested",
  "Paused",
  "ResumeRequested",
  "LeaseAcquired",
  "LeaseRenewed",
  "LeaseExpired",
  "StaleWriterRejected",
  "AgentRunStarted",
  "AgentEvent",
  "CaptureConfidenceChanged",
  "PendingInputQueued",
  "PlanArtifact",
  "PlanReview",
  "ReviewReport",
  "ReworkResponse",
  "ApprovalRequested",
  "ApprovalDecided",
  "ApprovalExpired",
  "SessionRegistered",
  "ExternalSessionImported",
  "AuditSignal",
  "ProcessObserved",
  "McpCallObserved",
  "ToolServerAction",
  "HookToggled",
  "SettingsFileChanged",
  "InstructionFileChanged",
  "UserInputRequested",
  "UserInputAnswered",
  "McpElicitation-requested",
  "McpElicitationAnswered",
  "EffectIntent",
  "EffectCommitted",
  "EffectFailed",
  "EffectUnverifiable",
  "GitCommandRun",
  "RunArtifacts",
  "SkillSelected",
  "SkillInjectionAccepted",
  "SkillLoadObserved",
  "SkillApplicationVerified",
  "SkillSelectionReviewed",
  "SkillRegistryChanged",
  "ProjectSkillToggled",
  "McpServerChanged",
  "ReviewSkipped",
  "CheckpointCreated",
  "RecoveryAssessment",
  "UsageReported",
  "ErrorRaised",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
const EVENT_TYPE_SET: ReadonlySet<string> = new Set(EVENT_TYPES);
export const isEventType = (t: string): t is EventType => EVENT_TYPE_SET.has(t);

/** DATABASE_SCHEMA `tasks.kind` enum */
export const TASK_KINDS = ["plan", "research", "prototype", "impl", "review", "verify", "replan"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

/** `events` 테이블 한 행(DATABASE_SCHEMA §2.1 DDL 과 1:1, camelCase). */
export interface JournalEvent {
  seq: number;
  eventId: string;
  ts: string;
  type: EventType;
  workspaceId?: string;
  projectId?: string;
  phaseId?: string;
  taskId?: string;
  agentRunId?: string;
  sessionRef?: string;
  correlationId?: string;
  causationSeq?: number;
  fencingToken?: number;
  payload: Record<string, unknown>;
  redacted: 0 | 1;
}

/** append 입력: seq 는 저널이 매기고 eventId·ts·redacted 는 생략 시 저널이 채운다. */
export type NewEvent = Omit<JournalEvent, "seq" | "eventId" | "ts" | "redacted" | "type"> &
  Partial<Pick<JournalEvent, "eventId" | "ts" | "redacted">> & { type: EventType | string };
