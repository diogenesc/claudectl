import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CLAUDE_SETTINGS_PATH } from "./paths.js";

interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

export function toolToPermission(
  toolName: string,
  toolInput: Record<string, unknown>,
): string {
  if (toolName === "Bash" && toolInput.command) {
    const cmd = String(toolInput.command);
    // Use first two words as prefix for the permission pattern
    const words = cmd.trim().split(/\s+/);
    const prefix = words.length >= 2 ? words.slice(0, 2).join(" ") : words[0];
    return `Bash(${prefix}:*)`;
  }
  // For non-Bash tools, just use the tool name
  return toolName;
}

function readSettings(): ClaudeSettings {
  if (!existsSync(CLAUDE_SETTINGS_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(CLAUDE_SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSettings(settings: ClaudeSettings): void {
  writeFileSync(
    CLAUDE_SETTINGS_PATH,
    JSON.stringify(settings, null, 2) + "\n",
  );
}

export function rememberPermission(
  toolName: string,
  toolInput: Record<string, unknown>,
  decision: "allow" | "deny" = "allow",
): { permission: string; alreadyExists: boolean } {
  const permission = toolToPermission(toolName, toolInput);
  const settings = readSettings();

  if (!settings.permissions) {
    settings.permissions = {};
  }

  const key = decision === "allow" ? "allow" : "deny";
  if (!settings.permissions[key]) {
    settings.permissions[key] = [];
  }

  if (settings.permissions[key]!.includes(permission)) {
    return { permission, alreadyExists: true };
  }

  settings.permissions[key]!.push(permission);
  writeSettings(settings);

  return { permission, alreadyExists: false };
}
