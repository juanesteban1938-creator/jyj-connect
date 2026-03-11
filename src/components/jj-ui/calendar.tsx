"use client"
import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-white rounded-lg border shadow-lg", className)}
      captionLayout="dropdown-buttons"
      fromYear={1900}
      toYear={2100}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center gap-1",
        caption_label: "text-sm font-medium text-slate-900 hidden",
        caption_dropdowns: "flex justify-center gap-1 items-center",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded-md flex items-center justify-center",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full mb-2",
        head_cell: "text-slate-500 rounded-md w-9 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-orange-100 rounded-lg transition-all flex items-center justify-center",
        day_selected: "bg-[#F97316] text-white hover:bg-[#F97316] focus:bg-[#F97316] font-bold shadow-md",
        day_today: "bg-slate-100 text-[#F97316] font-bold",
        day_outside: "text-slate-400 opacity-50",
        day_hidden: "invisible",
        vhidden: "hidden",
        dropdown: "rdp-dropdown bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none",
        dropdown_month: "rdp-dropdown_month",
        dropdown_year: "rdp-dropdown_year",
        ...classNames,
      }}
       components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"
