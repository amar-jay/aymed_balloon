import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { SystemData } from 'src/lib/types/minibuf'
import { useMemo } from 'react'
import { Card } from './ui/card'

export function TempGraph({ pastSystemData }: { pastSystemData: SystemData[] }) {
  const data = useMemo(() => {
    return pastSystemData.map((d, i) => ({
      index: i,
      topTemp: d.topTemp,
      bottomTemp: d.bottomTemp
    }))
  }, [pastSystemData])

  const currentTopTemp =
    pastSystemData.length > 0 ? pastSystemData[pastSystemData.length - 1].topTemp : 0
  const currentBottomTemp =
    pastSystemData.length > 0 ? pastSystemData[pastSystemData.length - 1].bottomTemp : 0

  return (
    <Card className="flex flex-col shadow-none md:border-none gap-0">
      <div className="flex items-center justify-between mb-0 px-4 pt-0">
        <h3 className="text-lg font-semibold">Temperature History</h3>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#1f77b4]"></span>
            <span>
              Top:{' '}
              <span className="font-semibold text-foreground">{currentTopTemp.toFixed(1)}°C</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff7f0e]"></span>
            <span>
              Bottom:{' '}
              <span className="font-semibold text-foreground">
                {currentBottomTemp.toFixed(1)}°C
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="h-[250px] w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="index" hide />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)'
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ display: 'none' }}
            />
            <Line
              type="monotone"
              dataKey="topTemp"
              stroke="#1f77b4"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="bottomTemp"
              stroke="#ff7f0e"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
