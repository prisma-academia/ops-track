import { PerformanceTop3Item } from "./performance-top-3-item"
import { PerformanceOthersItem } from "./performance-others-item"

export interface PerformanceItemData {
  name: string
  subtitle: string
  value: number
  amount?: number
}

export function PerformanceList({ data, iconUrl }: { data: PerformanceItemData[], iconUrl: string }) {
  const top3 = data.slice(0, 3)
  const others = data.slice(3)

  return (
    <ul className="space-y-2 mt-4">
      {top3.map((item, index) => (
        <PerformanceTop3Item
          key={item.name + index}
          item={item}
          index={index}
          iconUrl={iconUrl}
        />
      ))}

      {others.map((item, index) => (
        <PerformanceOthersItem
          key={item.name + index}
          item={item}
          index={index}
          iconUrl={iconUrl}
        />
      ))}
    </ul>
  )
}
