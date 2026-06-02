"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, CircleDotDashed } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

export interface Subtask {
  id: string;
  title: string;
  status: string; // completed | in-progress | pending
  meta?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  count?: string;
  subtasks: Subtask[];
}

interface PlanProps {
  tasks: Task[];
  activeSubtaskId?: string;
  defaultOpen?: string[];
  onSelectSubtask?: (taskId: string, subtaskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

function StatusIcon({ status, size = 4 }: { status: string; size?: number }) {
  const cls = `h-${size} w-${size}`;
  if (status === "completed")
    return <CheckCircle2 className={`${cls} text-nonstop`} />;
  if (status === "in-progress")
    return <CircleDotDashed className={`${cls} text-zinc-300`} />;
  return <Circle className={`${cls} text-muted-2`} />;
}

export default function Plan({
  tasks,
  activeSubtaskId,
  defaultOpen = [],
  onSelectSubtask,
  onToggleSubtask,
}: PlanProps) {
  const [expanded, setExpanded] = useState<string[]>(defaultOpen);

  const toggle = (id: string) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <LayoutGroup>
      <ul className="space-y-1.5">
        {tasks.map((task, index) => {
          const isExpanded = expanded.includes(task.id);
          return (
            <motion.li
              key={task.id}
              className="overflow-hidden border border-line bg-surface/40"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {/* module header */}
              <button
                onClick={() => toggle(task.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-surface-2"
              >
                <StatusIcon status={task.status} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-2">
                    Module {index + 1}
                  </span>
                  <span className="block truncate text-sm font-semibold text-white">
                    {task.title}
                  </span>
                </span>
                {task.count && (
                  <span className="shrink-0 text-[11px] tabular text-muted-2">
                    {task.count}
                  </span>
                )}
              </button>

              {/* lessons */}
              <AnimatePresence initial={false}>
                {isExpanded && task.subtasks.length > 0 && (
                  <motion.div
                    className="relative overflow-hidden border-t border-line"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.2, 0.65, 0.3, 0.9] }}
                  >
                    <div className="absolute bottom-2 left-[22px] top-2 border-l border-dashed border-line-2" />
                    <ul className="space-y-0.5 p-2">
                      {task.subtasks.map((s) => {
                        const active = s.id === activeSubtaskId;
                        return (
                          <motion.li
                            key={s.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`group flex items-center gap-2.5 pl-5 pr-2 transition ${
                              active
                                ? "bg-surface-3 ring-1 ring-nonstop/40"
                                : "hover:bg-surface-2"
                            }`}
                          >
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSubtask?.(task.id, s.id);
                              }}
                              className="shrink-0 py-2"
                              aria-label="Toggle complete"
                            >
                              <StatusIcon status={s.status} size={4} />
                            </motion.button>
                            <button
                              onClick={() => onSelectSubtask?.(task.id, s.id)}
                              className="flex min-w-0 flex-1 items-center justify-between py-2 text-left"
                            >
                              <span
                                className={`truncate text-sm ${
                                  active ? "text-white" : "text-muted"
                                } ${
                                  s.status === "completed"
                                    ? "text-muted-2 line-through"
                                    : ""
                                }`}
                              >
                                {s.title}
                              </span>
                              {s.meta && (
                                <span className="ml-2 shrink-0 text-[11px] text-muted-2">
                                  {s.meta}
                                </span>
                              )}
                            </button>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}
