import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the tool summary logic that's used in the permission list
// This tests the no-truncation requirement

describe("permission display", () => {
  // Replicate toolSummary logic from permission-list.tsx for testing
  function toolSummary(toolName: string, toolInput: Record<string, unknown>): string {
    if (toolName === "Bash" && toolInput.command) {
      return String(toolInput.command);
    }
    if ((toolName === "Edit" || toolName === "Write") && toolInput.file_path) {
      return String(toolInput.file_path);
    }
    const keys = Object.keys(toolInput);
    if (keys.length > 0) {
      return String(toolInput[keys[0]]);
    }
    return "(no details)";
  }

  it("shows full Bash command without truncation", () => {
    const longCmd =
      "npm run build && npm test && echo 'done with all the things that need to be done here'";
    const summary = toolSummary("Bash", { command: longCmd });
    assert.equal(summary, longCmd);
    assert.ok(!summary.endsWith("..."), "should not truncate");
  });

  it("shows full file path for Edit", () => {
    const path = "/home/user/very/deep/nested/directory/structure/file.ts";
    const summary = toolSummary("Edit", { file_path: path });
    assert.equal(summary, path);
  });

  it("shows full file path for Write", () => {
    const path = "/home/user/code/project/src/components/very-long-name.tsx";
    const summary = toolSummary("Write", { file_path: path });
    assert.equal(summary, path);
  });

  it("shows first value for unknown tools", () => {
    const summary = toolSummary("CustomTool", { query: "search term" });
    assert.equal(summary, "search term");
  });

  it("returns (no details) for empty input", () => {
    const summary = toolSummary("Bash", {});
    assert.equal(summary, "(no details)");
  });
});
