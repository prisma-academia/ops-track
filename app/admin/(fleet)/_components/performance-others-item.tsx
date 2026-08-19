import { formatShortCurrency } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { PerformanceItemData } from "./performance-list"

export function PerformanceOthersItem({
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
      <Card>
        <CardContent className="flex items-center gap-x-4 py-3 px-6">
          <div className="relative">
            <Avatar className="border-2 border-muted bg-transparent rounded-md size-12 after:hidden">
              <AvatarImage src={iconUrl} alt={item.name} className="object-contain p-2 rounded-md" />
              <AvatarFallback className="bg-transparent font-bold text-muted-foreground rounded-md">
                {item.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-muted rounded-full flex items-center justify-center text-[10px] text-muted-foreground font-bold">
              {index + 4}
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
              <span className="text-sm font-semibold text-muted-foreground">{formatShortCurrency(item.amount)}</span>
            )}
            <Badge className="shadow-none rounded-sm bg-muted text-muted-foreground hover:bg-muted">{item.value.toLocaleString()} L</Badge>
          </div>
        </CardContent>
      </Card>
    </li>
  )
}
