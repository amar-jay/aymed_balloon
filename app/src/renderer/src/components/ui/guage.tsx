import * as React from 'react'
import { cn } from '@renderer/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './card'

type GaugeProps = {
  value: number
  min?: number
  max?: number
  label?: string
  size?: number
  inverseColor?: boolean
  className?: string
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(' ')
}

export function Gauge({
  value,
  min = 0,
  max = 100,
  label = 'Value',
  size = 160,
  inverseColor = false,
  className
}: GaugeProps) {
  const v = Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min
  const normalized = (v - min) / (max - min || 1)

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.38 // leave padding for labels

  // 270-degree arc from -135 to 135
  const startAngle = -135
  const endAngle = 135
  const arcPath = describeArc(cx, cy, radius, startAngle, endAngle)

  // arc length (approx) = radius * angleInRadians
  const angleRad = ((endAngle - startAngle) * Math.PI) / 180
  const arcLength = radius * angleRad
  const dashArray = arcLength.toFixed(2)
  const dashOffset = ((1 - normalized) * arcLength).toFixed(2)

  const getColor = (n: number) => {
    if (n < 0.33) return 'var(--green-500, #10b981)'
    if (n < 0.66) return 'var(--amber-500, #f59e0b)'
    return 'var(--red-500, #ef4444)'
  }

  const color = getColor(inverseColor ? 1 - normalized : normalized)
	const label_parts = label.split(' ')

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--muted, #2a2a2a)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Foreground arc (animated via stroke-dashoffset) */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 400ms ease, stroke 300ms ease' }}
        />

        {/* Needle: rotate around center using transform attribute */}
        <g transform={`rotate(${startAngle + normalized * (endAngle - startAngle)} ${cx} ${cy})`}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - radius + 6}
            stroke="var(--foreground, #fff)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>

        {/* Center cap */}
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="var(--card-bg, #0b0b0b)"
          stroke="var(--border, #333)"
          strokeWidth={2}
        />

        {/* Value text */}
        <text
          x={cx}
          y={cy + radius * 0.6}
          textAnchor="middle"
          className="text-lg font-semibold fill-foreground"
        >
          {v}
        </text>

        <text
          x={cx}
          y={cy + radius * 1.1}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          {label_parts.slice(0, -1).join(' ')}
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + radius * 0.85}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          {label_parts[label_parts.length - 1]}
        </text>
      </svg>
    </div>
  )
}

export function GaugeCard({
  title,
  value,
  min,
  max,
  label,
  size
}: {
  title?: string
  value: number
  min?: number
  max?: number
  label?: string
  size?: number
}) {
  const label_parts = label?.split(' ') ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || label || 'Gauge'}</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <Gauge
            value={value}
            min={min}
            max={max}
            label={label_parts[label_parts.length - 1]}
            size={size}
          />
        </div>
      </CardContent>
    </Card>
  )
}
