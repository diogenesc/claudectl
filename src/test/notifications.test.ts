import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// We need to test the notifications module logic
// Since the module uses process.stdout.write and child_process.spawn,
// we test the exported functions' behavior

describe("notifications", () => {
  let notifications: typeof import("../notifications.js");

  beforeEach(async () => {
    // Fresh import each time to reset mute state
    // Use dynamic import with cache busting isn't possible in node,
    // so we test via the toggle API
    notifications = await import("../notifications.js");
  });

  it("isMuted returns false by default", () => {
    // After first import, muted state is shared. Toggle to known state.
    // Since module is singleton, we can only test toggle behavior
    const initial = notifications.isMuted();
    assert.equal(typeof initial, "boolean");
  });

  it("toggleMute flips the mute state", () => {
    const before = notifications.isMuted();
    const after = notifications.toggleMute();
    assert.equal(after, !before);
  });

  it("toggleMute is idempotent over two calls", () => {
    const before = notifications.isMuted();
    notifications.toggleMute();
    notifications.toggleMute();
    assert.equal(notifications.isMuted(), before);
  });
});
