import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useI18n } from "@/lib/i18n";
import { ymd, type DateFilter } from "@/lib/data";

export function DateFilterBar({ value, onChange }: { value: DateFilter; onChange: (f: DateFilter) => void }) {
  const { t } = useI18n();
  const btn = (on: boolean) => `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-accent text-accent-foreground" : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border bg-card p-1.5">
      {([["today", t("today")], ["yesterday", t("yesterday")], ["week", t("thisWeek")], ["month", t("thisMonth")]] as const).map(([k, l]) => (
        <button key={k} onClick={() => onChange({ kind: k })} className={btn(value.kind === k)}>{l}</button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button className={btn(value.kind === "day")}>
            <CalendarDays className="h-4 w-4" /> {value.kind === "day" ? value.day : t("pickDate")}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value.day ? new Date(value.day + "T00:00") : undefined}
            onSelect={(d) => d && onChange({ kind: "day", day: ymd(d) })} className="pointer-events-auto p-3" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
