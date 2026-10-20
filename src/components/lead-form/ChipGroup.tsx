"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface ChipGroupProps {
  /** Accessible name of the group when no visible label points at it. */
  label?: string;
  /** Id of the visible label element. */
  labelledBy?: string;
  /** Lets the form focus the group when validation fails. */
  id?: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** "tile" stacks the icon above the label (service picker). */
  variant?: "chip" | "tile";
  columns?: 1 | 2 | 3;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

const COLUMNS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3" } as const;

/** Single choice as a radiogroup of large tap targets (44px minimum). Arrow keys move the selection. */
export default function ChipGroup({
  label,
  labelledBy,
  id,
  options,
  value,
  onChange,
  variant = "chip",
  columns = 2,
  invalid,
  describedBy,
  className,
}: ChipGroupProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !backward) return;
    event.preventDefault();
    const next = (index + (forward ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    itemRefs.current[next]?.focus();
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      tabIndex={-1}
      className={cn("grid gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", COLUMNS[columns], className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "min-h-11 text-balance rounded-lg border px-3 py-2 text-sm leading-snug transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              variant === "tile" ? "flex flex-col items-center justify-center gap-2 py-3 text-center" : "text-center",
              selected
                ? "border-accent bg-accent/10 font-semibold text-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
              invalid && !selected && "border-destructive/60",
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
