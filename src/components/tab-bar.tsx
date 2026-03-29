import React from "react";
import { Box, Text } from "ink";

export type TabId = "sessions" | "permissions";

interface TabBarProps {
  activeTab: TabId;
  permissionCount: number;
}

export function TabBar({ activeTab, permissionCount }: TabBarProps) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "sessions", label: "Sessions" },
    {
      id: "permissions",
      label:
        permissionCount > 0
          ? `Permissions(${permissionCount})`
          : "Permissions",
    },
  ];

  return (
    <Box>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Box key={tab.id} marginRight={1}>
            <Text
              bold={isActive}
              color={isActive ? "cyan" : "white"}
              inverse={isActive}
            >
              {` ${tab.label} `}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
