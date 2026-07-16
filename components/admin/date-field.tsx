"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Sélecteur date + heure (section 14 « Date Picker ») : Popover + Calendar
 * (jour) et `<input type="time">` (heure). `clearable` autorise une date nulle
 * (ex. date prévisionnelle des résultats non fixée).
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  clearable = false,
}: {
  id: string;
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timeValue = value ? format(value, "HH:mm") : "08:00";

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const next = new Date(day);
    next.setHours(value?.getHours() ?? 8, value?.getMinutes() ?? 0, 0, 0);
    onChange(next);
    setOpen(false);
  }

  function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [hours, minutes] = event.target.value.split(":").map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(hours || 0, minutes || 0, 0, 0);
    onChange(base);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className="flex-1 justify-start font-normal"
            >
              <CalendarIcon className="size-4" aria-hidden="true" />
              {value ? format(value, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={handleDaySelect}
              locale={fr}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          className="w-28"
          aria-label={`Heure — ${label}`}
        />
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            aria-label={`Effacer ${label}`}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
