"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import React, { useMemo, useState } from "react";
import { SidePanel } from "./SidePanel";

/**
 * StudioLayout
 * Expects children order: [SourcesPanel, ChatPane, StudioPanel]
 * Left & right panes are collapsible (pure resize strategy) and all three appear
 * as distinct rounded panels within a single ResizablePanelGroup.
 */
export function StudioLayout({ children }: { children: React.ReactNode }) {
  const arr = React.Children.toArray(children);
  const sources = arr[0] as React.ReactElement | undefined;
  const chat = arr[1];
  const studio = arr[2] as React.ReactElement | undefined;
  type RailCapableElement = React.ReactElement & {
    type: { rail?: (props: { expand: () => void }) => React.ReactNode };
  };
  const getRail = (el: React.ReactElement | undefined) => {
    if (!el) return undefined;
    const candidate = el as RailCapableElement;
    return candidate.type.rail;
  };
  const sourcesRail = getRail(sources);
  const studioRail = getRail(studio);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Compute layout sizing presets. We re-mount the panel group (key) so defaultSize applies.
  const layoutKey = useMemo(
    () => `layout-${leftCollapsed ? "L" : "l"}-${rightCollapsed ? "R" : "r"}`,
    [leftCollapsed, rightCollapsed]
  );

  interface Sizes {
    left: number;
    center: number;
    right: number;
  }
  const sizes: Sizes = useMemo(() => {
    if (leftCollapsed && rightCollapsed)
      return { left: 4, center: 92, right: 4 }; // both collapsed
    if (leftCollapsed) return { left: 5, center: 65, right: 30 }; // left collapsed keeps studio wide
    if (rightCollapsed) return { left: 20, center: 70, right: 10 }; // studio collapsed
    // default: equal side panels
    return { left: 20, center: 60, right: 20 };
  }, [leftCollapsed, rightCollapsed]);

  const toggleLeft = () => setLeftCollapsed((v) => !v);
  const toggleRight = () => setRightCollapsed((v) => !v);

  return (
    <div
      className="h-screen w-full overflow-hidden p-2 bg-gradient-to-b from-background to-background/90"
      data-acb-part="studio-layout"
    >
      <ResizablePanelGroup
        key={layoutKey}
        direction="horizontal"
        className="h-full w-full gap-2"
      >
        {/* Left Panel */}
        <ResizablePanel
          defaultSize={sizes.left}
          minSize={4}
          maxSize={40}
          className="overflow-hidden"
        >
          <SidePanel
            title="Sources"
            side="left"
            collapsed={leftCollapsed}
            onToggleCollapse={toggleLeft}
            rail={
              sourcesRail
                ? sourcesRail({ expand: () => setLeftCollapsed(false) })
                : null
            }
          >
            {sources}
          </SidePanel>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-transparent after:hidden w-2 mx-0"
        />
        {/* Center Chat Panel (always expanded, flexible) */}
        <ResizablePanel
          defaultSize={sizes.center}
          minSize={30}
          className="overflow-hidden"
        >
          <div className="flex h-full flex-col rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 shadow-sm overflow-hidden">
            <div className="flex-1 min-h-0">{chat}</div>
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-transparent after:hidden w-2 mx-0"
        />
        {/* Right Panel */}
        <ResizablePanel
          defaultSize={sizes.right}
          minSize={8}
          maxSize={50}
          className="overflow-hidden"
        >
          <SidePanel
            title="Studio"
            side="right"
            collapsed={rightCollapsed}
            onToggleCollapse={toggleRight}
            rail={
              studioRail
                ? studioRail({ expand: () => setRightCollapsed(false) })
                : null
            }
          >
            {studio}
          </SidePanel>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
