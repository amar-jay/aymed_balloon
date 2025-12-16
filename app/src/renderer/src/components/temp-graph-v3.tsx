import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { SystemData } from 'src/lib/types/minibuf'
import { Card } from "./ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

export function TempGraph({ pastSystemData, isAnimated = false }: { pastSystemData: SystemData[], isAnimated?: boolean }) {
  const [timeRange, setTimeRange] = React.useState("60")

  const filteredData = React.useMemo(() => {
    const range = parseInt(timeRange)
    const totalPoints = pastSystemData.length
    const data = pastSystemData.map((d, i) => ({
      time: i,
      relativeTime: i - totalPoints,
      topTemp: d.topTemp,
      bottomTemp: d.bottomTemp
    }))
    
    if (data.length <= range) return data
    return data.slice(data.length - range)
  }, [pastSystemData, timeRange])

  const xDomain = React.useMemo(() => {
    const range = parseInt(timeRange)
    const totalPoints = pastSystemData.length
    if (totalPoints <= range) return [0, range]
    return [totalPoints - range, totalPoints]
  }, [pastSystemData.length, timeRange])

  const currentTopTemp =
    pastSystemData.length > 0 ? pastSystemData[pastSystemData.length - 1].topTemp : 0
  const currentBottomTemp =
    pastSystemData.length > 0 ? pastSystemData[pastSystemData.length - 1].bottomTemp : 0

  return (
    <Card className="flex flex-col shadow-none md:border-none gap-0">
      <div className="flex items-center justify-between mb-0 px-4 pt-0">
        <h3 className="text-lg font-semibold">Temperature History</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF6B6B]"></span>
              <span>
                Top:{' '}
                <span className="font-semibold text-foreground">{currentTopTemp.toFixed(1)}°C</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4ECDC4]"></span>
              <span>
                Bottom:{' '}
                <span className="font-semibold text-foreground">
                  {currentBottomTemp.toFixed(1)}°C
                </span>
              </span>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[130px] h-8 text-xs rounded-lg"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 60s" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="240" className="rounded-lg text-xs">
                Last 240s
              </SelectItem>
              <SelectItem value="120" className="rounded-lg text-xs">
                Last 120s
              </SelectItem>
              <SelectItem value="60" className="rounded-lg text-xs">
                Last 60s
              </SelectItem>
               <SelectItem value="30" className="rounded-lg text-xs">
                Last 30s
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pt-2">
        <div className="aspect-auto h-[250px] w-full bg-slate-100 text-xs pl-1 pr-2 pb-1 pt-6 rounded-md shadow *:ring-0 *:border-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillTopTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillBottomTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                type="number"
                domain={xDomain}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['auto', 'auto']}
                width={40}
              />
              <Tooltip
                contentStyle={{
                    backgroundColor: 'var(--secondary)',
                    borderColor: 'var(--border)',
                    borderRadius: 'var(--radius)'
                }}
                itemStyle={{ color: 'var(--foreground)' }}
                labelFormatter={(_) => ``}
              />
              <Area
                name="Bottom Temp"
                dataKey="bottomTemp"
                type="monotone"
                fill="url(#fillBottomTemp)"
                stroke="#4ECDC4"
                strokeWidth={2}
                isAnimationActive={isAnimated}
              />
              <Area
                name="Top Temp"
                dataKey="topTemp"
                type="monotone"
                fill="url(#fillTopTemp)"
                stroke="#FF6B6B"
                strokeWidth={2}
                isAnimationActive={isAnimated}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}