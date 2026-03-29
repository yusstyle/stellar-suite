"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ActivityEvent {
  timestamp: string;
  action?: string;
  category?: string;
}

interface ActivityHeatmapProps {
  events: ActivityEvent[];
  className?: string;
}

interface DayCell {
  date: Date;
  key: string;
  count: number;
  inRange: boolean;
  level: -1 | 0 | 1 | 2 | 3 | 4;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const LEVEL_CLASSES: Record<DayCell["level"], string> = {
  "-1": "border-transparent bg-transparent",
  0: "border-border/70 bg-muted/50",
  1: "border-primary/30 bg-primary/20",
  2: "border-primary/45 bg-primary/35",
  3: "border-primary/60 bg-primary/55",
  4: "border-primary/80 bg-primary/80",
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const baseValue = sortedValues[base];
  const nextValue = sortedValues[base + 1] ?? baseValue;
  return baseValue + rest * (nextValue - baseValue);
}

function isRelevantEvent(event: ActivityEvent): boolean {
  const action = (event.action ?? "").toLowerCase();
  return (
    event.category === "build" ||
    event.category === "deploy" ||
    action.includes("commit")
  );
}

function getLevel(
  count: number,
  thresholds: { q1: number; q2: number; q3: number },
): DayCell["level"] {
  if (count <= 0) return 0;
  if (count <= thresholds.q1) return 1;
  if (count <= thresholds.q2) return 2;
  if (count <= thresholds.q3) return 3;
  return 4;
}

export function ActivityHeatmap({ events, className }: ActivityHeatmapProps) {
  const model = useMemo(() => {
    const today = startOfDay(new Date());
    const rangeStart = addDays(today, -364);
    const gridStart = addDays(rangeStart, -rangeStart.getDay());
    const gridEnd = addDays(today, 6 - today.getDay());

    const countsByDay = new Map<string, number>();

    for (const event of events) {
      if (!isRelevantEvent(event)) continue;
      const parsed = new Date(event.timestamp);
      if (Number.isNaN(parsed.getTime())) continue;
      const day = startOfDay(parsed);
      if (day < rangeStart || day > today) continue;
      const key = dateKey(day);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const nonZeroCounts = [...countsByDay.values()].sort((a, b) => a - b);
    const thresholds = {
      q1: Math.max(1, Math.round(quantile(nonZeroCounts, 0.25))),
      q2: Math.max(1, Math.round(quantile(nonZeroCounts, 0.5))),
      q3: Math.max(1, Math.round(quantile(nonZeroCounts, 0.75))),
    };

    const cells: DayCell[] = [];
    for (
      let cursor = new Date(gridStart);
      cursor <= gridEnd;
      cursor = addDays(cursor, 1)
    ) {
      const key = dateKey(cursor);
      const inRange = cursor >= rangeStart && cursor <= today;
      const count = inRange ? (countsByDay.get(key) ?? 0) : 0;
      const level = inRange ? getLevel(count, thresholds) : -1;
      cells.push({
        date: new Date(cursor),
        key,
        count,
        inRange,
        level,
      });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    const monthLabels = new Map<number, string>();
    let seenMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstInRange = week.find((day) => day.inRange);
      if (!firstInRange) return;
      const month = firstInRange.date.getMonth();
      if (month !== seenMonth) {
        monthLabels.set(
          weekIndex,
          firstInRange.date.toLocaleString(undefined, { month: "short" }),
        );
        seenMonth = month;
      }
    });

    const totalEvents = [...countsByDay.values()].reduce(
      (sum, count) => sum + count,
      0,
    );
    const activeDays = [...countsByDay.values()].filter((count) => count > 0)
      .length;

    let busiestDay: DayCell | null = null;
    for (const day of cells) {
      if (!day.inRange) continue;
      if (!busiestDay || day.count > busiestDay.count) {
        busiestDay = day;
      }
    }

    return {
      weeks,
      monthLabels,
      totalEvents,
      activeDays,
      busiestDay,
    };
  }, [events]);

  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Activity</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {model.totalEvents} tracked actions over the last year
          </p>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <div>{model.activeDays} active day(s)</div>
          <div>
            Peak:{" "}
            {model.busiestDay && model.busiestDay.count > 0
              ? `${model.busiestDay.count} on ${model.busiestDay.date.toLocaleDateString()}`
              : "No activity yet"}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="ml-8 grid grid-flow-col auto-cols-max gap-1 text-[10px] text-muted-foreground">
            {model.weeks.map((_, weekIndex) => (
              <div key={`month-${weekIndex}`} className="h-4 w-3 relative">
                {model.monthLabels.has(weekIndex) ? (
                  <span className="absolute left-0 top-0">
                    {model.monthLabels.get(weekIndex)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-1 flex gap-2">
            <div className="grid grid-rows-7 gap-1 text-[10px] text-muted-foreground">
              {DAY_LABELS.map((label, row) => (
                <div key={label} className="h-3 leading-3">
                  {row % 2 === 1 ? label : ""}
                </div>
              ))}
            </div>

            <div className="grid grid-flow-col grid-rows-7 gap-1">
              {model.weeks.map((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  const description = `${day.count} event${day.count === 1 ? "" : "s"} on ${day.date.toLocaleDateString()}`;
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}-${day.key}`}
                      className={cn(
                        "h-3 w-3 rounded-[2px] border transition-opacity",
                        day.inRange ? "opacity-100" : "opacity-0",
                        LEVEL_CLASSES[day.level],
                      )}
                      title={description}
                      aria-label={description}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={`legend-${level}`}
            className={cn(
              "h-2.5 w-2.5 rounded-[2px] border",
              LEVEL_CLASSES[level as DayCell["level"]],
            )}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
