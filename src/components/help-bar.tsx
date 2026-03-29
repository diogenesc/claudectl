import React from "react";
import { Box, Text } from "ink";
import type { TabId } from "./tab-bar.js";

interface HelpBarProps {
  activeTab: TabId;
  muted: boolean;
}

function Key({ char, label }: { char: string; label: string }) {
  return (
    <Text>
      <Text color="yellow">[{char}]</Text>
      <Text dimColor>{label} </Text>
    </Text>
  );
}

export function HelpBar({ activeTab, muted }: HelpBarProps) {
  return (
    <Box>
      {activeTab === "permissions" ? (
        <>
          <Key char="a" label="llow" />
          <Key char="d" label="eny" />
          <Key char="r" label="emember allow" />
          <Key char="R" label="emember deny" />
          <Key char="A" label="llow all" />
          <Key char="D" label="eny all" />
        </>
      ) : (
        <>
          <Key char="Enter" label=" resume" />
          <Key char="s" label="tale toggle" />
          <Key char="c" label="lean" />
        </>
      )}
      <Key char="Tab" label=" switch" />
      <Key char="m" label="ute" />
      <Key char="q" label="uit" />
      <Text dimColor>{muted ? " 🔇" : " 🔔"}</Text>
    </Box>
  );
}
