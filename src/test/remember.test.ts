import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toolToPermission } from "../remember.js";

describe("toolToPermission", () => {
  it("should convert Bash commands using first two words", () => {
    assert.equal(
      toolToPermission("Bash", { command: "npm test" }),
      "Bash(npm test:*)",
    );
  });

  it("should convert Bash single-word commands", () => {
    assert.equal(
      toolToPermission("Bash", { command: "ls" }),
      "Bash(ls:*)",
    );
  });

  it("should convert multi-word Bash commands using first two words", () => {
    assert.equal(
      toolToPermission("Bash", { command: "git push origin main" }),
      "Bash(git push:*)",
    );
  });

  it("should convert non-Bash tools to just tool name", () => {
    assert.equal(
      toolToPermission("Edit", { file_path: "/src/app.ts" }),
      "Edit",
    );
  });

  it("should convert Write tool to just tool name", () => {
    assert.equal(
      toolToPermission("Write", { file_path: "/src/new.ts" }),
      "Write",
    );
  });

  it("should handle Bash with empty command", () => {
    assert.equal(toolToPermission("Bash", { command: "" }), "Bash");
  });

  it("should handle Bash with no command field", () => {
    assert.equal(toolToPermission("Bash", {}), "Bash");
  });
});
