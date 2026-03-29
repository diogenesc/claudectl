import { existsSync, readFileSync } from "node:fs";
import { CLAUDE_SETTINGS_PATH, ensureQueueDir } from "./paths.js";

function isHookConfigured(): boolean {
  if (!existsSync(CLAUDE_SETTINGS_PATH)) return false;
  try {
    const settings = JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, "utf-8"));
    const hooks = settings?.hooks?.PermissionRequest;
    if (!Array.isArray(hooks)) return false;
    return hooks.some(
      (h: any) =>
        Array.isArray(h?.hooks) &&
        h.hooks.some(
          (inner: any) => inner?.command === "claudectl hook-handler",
        ),
    );
  } catch {
    return false;
  }
}

export async function launchTui(): Promise<void> {
  if (!process.stdout.isTTY) {
    console.error("claudectl requires an interactive terminal.");
    process.exit(1);
  }

  ensureQueueDir();

  if (!isHookConfigured()) {
    const { createInterface } = await import("node:readline");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await new Promise<string>((resolve) => {
      rl.question(
        "PermissionRequest hook is not configured. Run setup now? (y/n) ",
        (a) => {
          rl.close();
          resolve(a.trim().toLowerCase());
        },
      );
    });

    if (answer === "y") {
      const { setup } = await import("./setup.js");
      await setup();
    } else {
      console.log(
        "You can run `claudectl setup` later to configure the hook.",
      );
      return;
    }
  }

  // Dynamic import to avoid loading React/Ink unless we're actually running the TUI
  const { render } = await import("ink");
  const { createElement } = await import("react");
  const { App } = await import("./app.js");

  const { waitUntilExit } = render(createElement(App));
  await waitUntilExit();
}
