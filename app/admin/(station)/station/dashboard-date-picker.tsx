"use client"

import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { DateRange } from "react-day-picker"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function DashboardDatePicker({
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = React.useState(false)

    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    // Derive date directly from searchParams
    const date: DateRange | undefined = React.useMemo(() => {
        if (fromParam) {
            return {
                from: parseISO(fromParam),
                to: toParam ? parseISO(toParam) : undefined
            }
        }
        // Default to last 30 days if no params are present
        return {
            from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()),
            to: new Date(),
        }
    }, [fromParam, toParam]);

    // Only push to router when the user explicitly interacts with the calendar
    const handleSelect = (newDate: DateRange | undefined) => {
        const params = new URLSearchParams(searchParams.toString())
        
        if (newDate?.from) {
            params.set("from", format(newDate.from, "yyyy-MM-dd"))
        } else {
            params.delete("from")
        }
        
        if (newDate?.to) {
            params.set("to", format(newDate.to, "yyyy-MM-dd"))
        } else {
            params.delete("to")
        }
        
        router.push(`${pathname}?${params.toString()}`)
        
        if (newDate?.from && newDate?.to) {
            setIsOpen(false)
        }
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
