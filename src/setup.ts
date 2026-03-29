import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { CLAUDE_SETTINGS_PATH } from "./paths.js";

interface ClaudeSettings {
  hooks?: Record<string, unknown[]>;
  [key: string]: unknown;
}

const HOOK_CONFIG = {
  matcher: "*",
  hooks: [
    {
      type: "command",
      command: "claudectl hook-handler",
      timeout: 600,
    },
  ],
};

function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

export async function setup(): Promise<void> {
  let settings: ClaudeSettings = {};

  if (existsSync(CLAUDE_SETTINGS_PATH)) {
    try {
      settings = JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, "utf-8"));
    } catch {
      console.error(
        `Warning: Could not parse ${CLAUDE_SETTINGS_PATH}. Starting fresh.`,
      );
    }
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  const existing = settings.hooks.PermissionRequest as unknown[] | undefined;
  if (existing && existing.length > 0) {
    const hasOurs = existing.some(
      (h: unknown) =>
        typeof h === "object" &&
        h !== null &&
        "hooks" in h &&
        Array.isArray((h as Record<string, unknown>).hooks) &&
        ((h as Record<string, unknown[]>).hooks).some(
          (inner: unknown) =>
            typeof inner === "object" &&
            inner !== null &&
            "command" in inner &&
            (inner as Record<string, unknown>).command ===
              "claudectl hook-handler",
        ),
    );

    if (hasOurs) {
      console.log("claudectl hook is already configured. Nothing to do.");
      return;
    }

    console.log("Existing PermissionRequest hooks found:");
    console.log(JSON.stringify(existing, null, 2));
    console.log();
    const answer = await ask(
      "Add claudectl hook alongside existing hooks? (y/n) ",
    );
    if (answer !== "y") {
      console.log("Aborted.");
      return;
    }
  }

  if (!settings.hooks.PermissionRequest) {
    settings.hooks.PermissionRequest = [];
  }
  (settings.hooks.PermissionRequest as unknown[]).push(HOOK_CONFIG);

  writeFileSync(
    CLAUDE_SETTINGS_PATH,
    JSON.stringify(settings, null, 2) + "\n",
  );
  // Remove old PreToolUse key if present (was incorrect event name from a prior bug)
  if (settings.hooks.PreToolUse) {
    delete settings.hooks.PreToolUse;
  }

  console.log("Done! Added PermissionRequest hook to Claude Code settings.");
  console.log(
    "\nRun `claudectl attend` in a separate terminal to manage permission requests.",
  );
}
