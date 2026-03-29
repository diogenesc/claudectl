import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";
import { CLAUDE_SESSIONS_DIR } from "./paths.js";

export interface SessionInfo {
  pid: number;
  sessionId: string;
  cwd: string;
  project: string;
  startedAt: string;
  kind: string;
  entrypoint: string;
  status: "active" | "stale";
}

function isClaudeProcess(pid: number): boolean {
  try {
    const cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf-8");
    return cmdline.toLowerCase().includes("claude");
  } catch {
    // /proc not available or process gone — try kill -0
    try {
      process.kill(pid, 0);
      // Process alive, but we can't verify it's claude on non-Linux
      // Fall back to checking via ps
      const ps = execSync(`ps -p ${pid} -o command= 2>/dev/null`, {
        encoding: "utf-8",
      });
      return ps.toLowerCase().includes("claude");
    } catch {
      return false;
    }
  }
}

export function discoverSessions(): SessionInfo[] {
  if (!existsSync(CLAUDE_SESSIONS_DIR)) {
    return [];
  }

  const files = readdirSync(CLAUDE_SESSIONS_DIR).filter((f) =>
    f.endsWith(".json"),
  );
  const sessions: SessionInfo[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(join(CLAUDE_SESSIONS_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      const pid = Number(data.pid);
      const active = isClaudeProcess(pid);

      sessions.push({
        pid,
        sessionId: data.sessionId ?? "",
        cwd: data.cwd ?? "",
        project: basename(data.cwd ?? ""),
        startedAt: data.startedAt ?? "",
        kind: data.kind ?? "",
        entrypoint: data.entrypoint ?? "",
        status: active ? "active" : "stale",
      });
    } catch {
      // Skip corrupt files
    }
  }

  return sessions.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}
