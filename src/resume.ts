import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { discoverSessions, SessionInfo } from "./sessions.js";

function findMatches(selector: string): SessionInfo[] {
  const sessions = discoverSessions().filter((s) => s.status === "active");

  return sessions.filter((s) => {
    if (s.sessionId.startsWith(selector)) return true;
    if (String(s.pid) === selector) return true;
    if (s.project.toLowerCase() === selector.toLowerCase()) return true;
    return false;
  });
}

async function pickSession(sessions: SessionInfo[]): Promise<SessionInfo> {
  console.log("Multiple sessions match. Pick one:\n");
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    console.log(
      `  [${i + 1}] ${s.project} (pid: ${s.pid}, session: ${s.sessionId.slice(0, 8)})`,
    );
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("\nSelect number: ", (answer) => {
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < sessions.length) {
        resolve(sessions[idx]);
      } else {
        console.error("Invalid selection.");
        process.exit(1);
      }
    });
  });
}

export async function resumeSession(selector?: string): Promise<void> {
  if (!selector) {
    const active = discoverSessions().filter((s) => s.status === "active");
    if (active.length === 0) {
      console.log("No active sessions found.");
      return;
    }
    const session = await pickSession(active);
    execFileSync("claude", ["--resume", session.sessionId], { stdio: "inherit" });
    return;
  }

  const matches = findMatches(selector);

  if (matches.length === 0) {
    console.error(`No session matching '${selector}' found.`);
    process.exit(1);
  }

  if (matches.length === 1) {
    execFileSync("claude", ["--resume", matches[0].sessionId], {
      stdio: "inherit",
    });
    return;
  }

  const session = await pickSession(matches);
  execFileSync("claude", ["--resume", session.sessionId], { stdio: "inherit" });
}
