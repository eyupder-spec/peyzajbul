"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Checkbox with a 44x44 tap target around a 20px box (the box itself is drawn by ::before). */
export default function TapCheckbox({ className, ...props }: ComponentPropsWithoutRef<typeof Checkbox>) {
  return (
    <Checkbox
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-none border-0",
        "data-[state=checked]:bg-transparent [&>span]:relative",
        "before:absolute before:left-1/2 before:top-1/2 before:h-5 before:w-5 before:-translate-x-1/2 before:-translate-y-1/2",
        "before:rounded before:border before:border-primary data-[state=checked]:before:bg-primary",
        className,
      )}
      {...props}
    />
  );
}
