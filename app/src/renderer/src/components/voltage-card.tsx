import { Badge } from './ui/badge'
import { useRef, useEffect } from 'react'
import { Card } from './ui/card'

export default function VoltageCard({ power }: { power: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    if (ctx == null) return

    ctx.clearRect(0, 0, width, height)

    // Battery dimensions
    const bodyWidth = 80
    const bodyHeight = 130
    const bodyX = (width - bodyWidth) / 2
    const bodyY = 40
    const tipHeight = 5
    const tipWidth = 40
    const tipX = (width - tipWidth) / 2

    // Battery tip
    ctx.fillStyle = '#64748b'
    ctx.fillRect(tipX, bodyY - tipHeight, tipWidth, tipHeight)

    // Battery outline
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 3
    ctx.strokeRect(bodyX - 2, bodyY - 2, bodyWidth + 4, bodyHeight + 4)

    // Fill level
    const percentage = power / 30
    const fillHeight = bodyHeight * percentage
    const fillY = bodyY + bodyHeight - fillHeight

    // Color based on range
    let fillColor
    if (percentage < 0.5) {
      fillColor = '#ef4444' // Red
    } else if (percentage < 0.75) {
      fillColor = '#eab308' // Yellow
    } else {
      fillColor = '#22c55e' // Green
    }

    ctx.fillStyle = fillColor
    ctx.fillRect(bodyX, fillY, bodyWidth, fillHeight)

    // Voltage text in center of battery
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${power.toFixed(2)}V`, width / 2, bodyY + bodyHeight / 2)
  }, [power])

  return (
    <Card className="max-h-[300px] flex flex-col items-center gap-2 space-x-0 transition-colors shadow-none md:border-none">
      <p className="text-sm font-medium text-muted-foreground">Voltage</p>
      <div>
        <canvas ref={canvasRef} width={200} height={200} className="w-full" />
      </div>

      <Badge
        className={
          power > 0 && power < 24
            ? 'bg-green-600 text-white mx-auto'
            : 'bg-red-600 text-white mx-auto'
        }
      >
       {power > 0 && power < 24 ? 'OK' : 'Alert'}
      </Badge>
    </Card>
  )
}
