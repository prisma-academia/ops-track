import { cn, formatShortCurrency } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { PerformanceItemData } from "./performance-list"

const avatarColor = [
  "border-yellow-400 dark:border-yellow-500 text-yellow-600 dark:text-yellow-400",
  "border-gray-300 dark:border-gray-400 text-gray-600 dark:text-gray-300",
  "border-amber-600 dark:border-amber-700 text-amber-600 dark:text-amber-500",
]

const badgeColor = [
  "bg-yellow-400 dark:bg-yellow-500",
  "bg-gray-300 dark:bg-gray-400",
  "bg-amber-600 dark:bg-amber-700",
]

export function PerformanceTop3Item({
  item,
  index,
  iconUrl,
}: {
  item: PerformanceItemData
  index: number
  iconUrl: string
}) {
  return (
    <li key={item.name}>
      <Card className="py-2">
        <CardContent className="flex items-center gap-x-4 py-2 px-4">
          <div className="relative">
            <Avatar className={cn("border-2 bg-transparent rounded-md size-12 after:hidden", avatarColor[index])}>
              <AvatarImage src={iconUrl} alt={item.name} className="object-contain p-2 rounded-md" />
              <AvatarFallback className="bg-transparent font-bold rounded-md">
                {item.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-foreground font-bold",
                badgeColor[index]
              )}
            >
              {index + 1}
            </div>
          </div>
          <div className="flex-1 w-0">
            <h3 className="text-sm font-semibold break-all truncate">
              {item.name}
            </h3>
            <p className="text-xs text-muted-foreground font-semibold break-all truncate">
              {item.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.amount !== undefined && (
              <span className="text-sm font-semibold">{formatShortCurrency(item.amount)}</span>
            )}
            <Badge className="shadow-none rounded-sm">{item.value.toLocaleString()} L</Badge>
          </div>
        </CardContent>
      </Card>
    </li>
  )
}
