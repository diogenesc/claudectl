import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, lstatSync } from "node:fs";

export const CLAUDE_CTL_DIR = join(homedir(), ".claudectl");
export const QUEUE_DIR = join(CLAUDE_CTL_DIR, "queue");
export const CLAUDE_DIR = join(homedir(), ".claude");
export const CLAUDE_SESSIONS_DIR = join(CLAUDE_DIR, "sessions");
export const CLAUDE_SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
export const CLAUDE_HISTORY_PATH = join(CLAUDE_DIR, "history.jsonl");

export function ensureQueueDir(): void {
  mkdirSync(QUEUE_DIR, { recursive: true, mode: 0o700 });
  const stats = lstatSync(QUEUE_DIR);
  if (!stats.isDirectory()) {
    throw new Error(`${QUEUE_DIR} exists but is not a directory (possible symlink attack)`);
  }
}
