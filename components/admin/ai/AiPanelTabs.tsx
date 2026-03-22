/**
 * AI Panel Tabs Component
 *
 * Tab navigation for the AI panel.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

import { TabId, TABS, Tab } from "./types";

interface AiPanelTabsProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export function AiPanelTabs({ activeTab, onTabChange }: AiPanelTabsProps) {
  return (
    <div className="border-b border-border">
      <div className="flex overflow-x-auto">
        {TABS.map((tab: Tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
