import React from "react";
import { Box, Text } from "ink";
import type { SessionInfo } from "../sessions.js";

interface SessionListProps {
  sessions: SessionInfo[];
  selected: number;
  showStale: boolean;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionList({ sessions, selected, showStale }: SessionListProps) {
  const visible = showStale
    ? sessions
    : sessions.filter((s) => s.status === "active");

  if (visible.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No active sessions found.</Text>
        {!showStale && (
          <Text dimColor>Press [s] to show stale sessions.</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {visible.map((session, i) => {
        const isSelected = i === selected;
        const staleTag = session.status === "stale" ? " (stale)" : "";
        return (
          <Box key={session.sessionId || `${session.pid}`} paddingX={1}>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "▶ " : "  "}
            </Text>
            <Text
              color={session.status === "stale" ? "gray" : isSelected ? "cyan" : "white"}
              bold={isSelected}
            >
              {session.project || "unknown"}
            </Text>
            <Text dimColor>
              {" "}pid:{session.pid} {relativeTime(session.startedAt)}{staleTag}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
