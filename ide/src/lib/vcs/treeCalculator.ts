/**
 * treeCalculator.ts
 *
 * Converts a flat list of CommitNodes (with parent relationships) into
 * a list of PositionedCommits — each commit gets an (x, y) coordinate
 * for SVG rendering, plus a colour derived from its branch lane.
 *
 * Algorithm:
 *  - Walk commits top-to-bottom (index 0 = newest).
 *  - Maintain a "lane map": oid → lane index.
 *  - Each commit occupies the lane of its first parent (or the next free
 *    lane if it has no parent already assigned).
 *  - Merge commits draw a connector from the child lane to the parent lane.
 *  - Y spacing is fixed (ROW_HEIGHT px); X is derived from lane * LANE_WIDTH.
 */

import type { CommitNode } from "./historyService";

// ── Layout constants ──────────────────────────────────────────────────────

export const ROW_HEIGHT = 36;   // px between commit rows
export const LANE_WIDTH = 18;   // px between branch lanes
export const NODE_RADIUS = 6;   // circle radius
export const H_PADDING = 12;    // left padding before lane 0

// ── Colour palette (one per lane, cycles) ────────────────────────────────

const LANE_COLOURS = [
  "#89b4fa", // blue   (main)
  "#a6e3a1", // green
  "#f9e2af", // yellow
  "#cba6f7", // purple
  "#fab387", // orange
  "#94e2d5", // teal
  "#f38ba8", // red
  "#89dceb", // sky
];

export function laneColour(lane: number): string {
  return LANE_COLOURS[lane % LANE_COLOURS.length];
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface PositionedCommit extends CommitNode {
  x: number;
  y: number;
  lane: number;
  colour: string;
  /** Connectors to draw: each entry is [fromX, fromY, toX, toY, colour] */
  connectors: Connector[];
}

export interface Connector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colour: string;
}

// ── Calculator ────────────────────────────────────────────────────────────

export function calculatePositions(commits: CommitNode[]): PositionedCommit[] {
  if (commits.length === 0) return [];

  // oid → lane index
  const laneMap = new Map<string, number>();
  // track which lanes are currently "active" (have a pending child)
  const activeLanes = new Set<number>();
  let nextFreeLane = 0;

  const positioned: PositionedCommit[] = [];

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Determine this commit's lane
    let lane = laneMap.get(commit.oid);
    if (lane === undefined) {
      // Find the lowest free lane
      lane = nextFreeLane;
      while (activeLanes.has(lane)) lane++;
      nextFreeLane = Math.max(nextFreeLane, lane + 1);
    }

    activeLanes.add(lane);
    const x = H_PADDING + lane * LANE_WIDTH;
    const colour = laneColour(lane);

    // Build connectors to each parent
    const connectors: Connector[] = [];

    commit.parents.forEach((parentOid, pIdx) => {
      // Assign a lane to the parent if not yet assigned
      if (!laneMap.has(parentOid)) {
        if (pIdx === 0) {
          // First parent inherits this commit's lane
          laneMap.set(parentOid, lane!);
        } else {
          // Merge parent gets a new lane
          let mergeLane = nextFreeLane;
          while (activeLanes.has(mergeLane)) mergeLane++;
          laneMap.set(parentOid, mergeLane);
          nextFreeLane = Math.max(nextFreeLane, mergeLane + 1);
        }
      }

      const parentLane = laneMap.get(parentOid)!;
      const parentX = H_PADDING + parentLane * LANE_WIDTH;

      // Find the parent's y position (it's further down the list)
      const parentIdx = commits.findIndex((c) => c.oid === parentOid);
      const parentY =
        parentIdx >= 0
          ? parentIdx * ROW_HEIGHT + ROW_HEIGHT / 2
          : (i + 1) * ROW_HEIGHT + ROW_HEIGHT / 2;

      connectors.push({
        x1: x,
        y1: y,
        x2: parentX,
        y2: parentY,
        colour: pIdx === 0 ? colour : laneColour(parentLane),
      });
    });

    // Free the lane once we've processed the commit's last child
    // (i.e., when no future commit lists this oid as a parent)
    const hasMoreChildren = commits
      .slice(i + 1)
      .some((c) => c.parents.includes(commit.oid));
    if (!hasMoreChildren) {
      activeLanes.delete(lane);
    }

    positioned.push({
      ...commit,
      x,
      y,
      lane,
      colour,
      connectors,
    });
  }

  return positioned;
}

/** Total SVG width needed to fit all lanes */
export function svgWidth(positioned: PositionedCommit[]): number {
  if (positioned.length === 0) return 120;
  const maxLane = Math.max(...positioned.map((p) => p.lane));
  return H_PADDING * 2 + (maxLane + 1) * LANE_WIDTH;
}

/** Total SVG height needed */
export function svgHeight(count: number): number {
  return count * ROW_HEIGHT + ROW_HEIGHT;
}
