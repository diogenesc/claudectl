import React from "react";
import { Box, Text } from "ink";
import type { SessionInfo } from "../sessions.js";

interface SessionDetailProps {
  session: SessionInfo | null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text dimColor>{label.padEnd(10)}</Text>
      <Text>{value}</Text>
    </Box>
  );
}

export function SessionDetail({ session }: SessionDetailProps) {
  if (!session) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No session selected.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">Session Details</Text>
      <Text> </Text>
      <Field label="Session:" value={session.sessionId} />
      <Field label="PID:" value={String(session.pid)} />
      <Field label="Project:" value={session.project} />
      <Field label="CWD:" value={session.cwd} />
      <Field label="Started:" value={session.startedAt} />
      <Field label="Kind:" value={session.kind || "—"} />
      <Field
        label="Status:"
        value={session.status === "active" ? "● active" : "○ stale"}
      />
    </Box>
  );
}
