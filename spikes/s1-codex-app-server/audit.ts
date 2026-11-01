/** 사후 diff 감사: `git status --porcelain` 행을 승인된 경로 집합과 대조해 `unapproved_write`를 판정한다. */
export interface AuditEntry {
  path: string;
  status: string;
  verdict: "approved" | "unapproved_write";
}

export function auditUnapprovedWrites(porcelainLines: string[], approvedPaths: Set<string>): AuditEntry[] {
  return porcelainLines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const status = line.slice(0, 2).trim();
      let path = line.slice(3).trim();
      const renamed = path.indexOf(" -> ");
      if (renamed >= 0) path = path.slice(renamed + 4);
      return { path, status, verdict: approvedPaths.has(path) ? "approved" : "unapproved_write" } as AuditEntry;
    });
}
