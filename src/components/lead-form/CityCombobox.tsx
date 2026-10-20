"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TURKISH_CITIES, normalizeForSearch } from "@/lib/leadFormData";
import { cn } from "@/lib/utils";
import { NO_MOTION_WHEN_REDUCED } from "./motion";

interface CityComboboxProps {
  value: string;
  onChange: (city: string) => void;
  /** Lets the form focus the control when validation fails. */
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

/** "istanbul" must find "İstanbul": match on the folded form, prefer names that start with the query. */
function matchCity(city: string, query: string): number {
  const name = normalizeForSearch(city);
  const needle = normalizeForSearch(query);
  if (!needle) return 1;
  if (name.startsWith(needle)) return 1;
  return name.includes(needle) ? 0.5 : 0;
}

/** Searchable province picker (81 options are too many for a plain select, especially on a phone). */
export default function CityCombobox({
  value,
  onChange,
  id,
  ariaLabel = "İl seçin",
  placeholder = "İl seçin",
  invalid,
  describedBy,
  className,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={value ? `${ariaLabel}: ${value}` : ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-11 w-full justify-between px-3 font-normal",
            !value && "text-muted-foreground",
            invalid && "border-destructive",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("z-[120] w-[var(--radix-popover-trigger-width)] p-0", NO_MOTION_WHEN_REDUCED)}>
        <Command filter={matchCity}>
          <CommandInput placeholder="İl ara…" className="text-base md:text-sm" />
          <CommandList className="max-h-56">
            <CommandEmpty>İl bulunamadı.</CommandEmpty>
            <CommandGroup>
              {TURKISH_CITIES.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  className="min-h-11"
                  onSelect={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === city ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
