"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { LightTheme } from "@/components/ui/light-theme";
import { DarkTheme } from "@/components/ui/dark-theme";
import { SystemTheme } from "@/components/ui/system-theme";

const THEMES = [
  { value: "light", label: "Light", Icon: LightTheme },
  { value: "dark", label: "Dark", Icon: DarkTheme },
  { value: "system", label: "System", Icon: SystemTheme },
] as const;

/**
 * Theme picker with visual previews (Light / Dark / System), wired to the
 * app's own theme store — not next-themes. Selection accent is brand orange.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useStore();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEMES.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={selected}
            className={cn(
              "group relative flex flex-col items-center rounded-lg border p-1.5 pb-9 transition",
              selected
                ? "border-nonstop ring-2 ring-nonstop/40"
                : "border-line-2 hover:border-zinc-500"
            )}
          >
            <span className="block w-full overflow-hidden rounded-md border border-line">
              <Icon />
            </span>
            <span className="absolute inset-x-0 bottom-3 flex justify-center">
              <span className="relative inline-flex items-center rounded-md bg-surface-3 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm">
                {label}
                {selected && (
                  <motion.span
                    layoutId="activeTheme"
                    className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full bg-nonstop"
                  />
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
