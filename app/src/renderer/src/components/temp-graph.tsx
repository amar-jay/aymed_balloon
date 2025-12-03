import { SystemData } from 'src/lib/types/minibuf'
import { useEffect, useRef, useState } from 'react'
import {
  SciChartSurface,
  NumericAxis,
  FastLineRenderableSeries,
  XyDataSeries,
  EAutoRange,
  NumberRange,
  EAxisAlignment,
  ENumericFormat,
  SciChartJSLightTheme
} from 'scichart/index.min.mjs'
import { Card } from './ui/card'

export function TempGraph({ pastSystemData }: { pastSystemData: SystemData[] }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const sciChartSurfaceRef = useRef<SciChartSurface | null>(null)
  const topDataSeriesRef = useRef<XyDataSeries | null>(null)
  const bottomDataSeriesRef = useRef<XyDataSeries | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initChart = async () => {
      if (!chartRef.current) return

      try {
        // Initialize SciChartSurface
        const { sciChartSurface, wasmContext } = await SciChartSurface.create(chartRef.current, {
          theme: new SciChartJSLightTheme()
        })

        // Create X axis (time/index) with fixed range 0-240
        const xAxis = new NumericAxis(wasmContext, {
          // axisTitle: 'Time (s)',
          autoRange: EAutoRange.Never,
          visibleRange: new NumberRange(0, 240),
          labelFormat: ENumericFormat.Decimal,
          labelPrecision: 0
        })

        // Create Y axis (temperature)
        const yAxis = new NumericAxis(wasmContext, {
          // axisTitle: 'Temperature (°C)',
          axisAlignment: EAxisAlignment.Left,
          autoRange: EAutoRange.Always,
          growBy: new NumberRange(0.1, 0.1),
          labelFormat: ENumericFormat.Decimal,
          labelPrecision: 1
        })

        sciChartSurface.xAxes.add(xAxis)
        sciChartSurface.yAxes.add(yAxis)

        // Create DataSeries for Top Temperature
        const topDataSeries = new XyDataSeries(wasmContext, {
          dataSeriesName: 'Top Temperature'
        })

        // Create DataSeries for Bottom Temperature
        const bottomDataSeries = new XyDataSeries(wasmContext, {
          dataSeriesName: 'Bottom Temperature'
        })

        // Create RenderableSeries for Top
        const topLineSeries = new FastLineRenderableSeries(wasmContext, {
          stroke: '#FF6B6B',
          strokeThickness: 2,
          dataSeries: topDataSeries
        })

        // Create RenderableSeries for Bottom
        const bottomLineSeries = new FastLineRenderableSeries(wasmContext, {
          stroke: '#4ECDC4',
          strokeThickness: 2,
          dataSeries: bottomDataSeries
        })

        sciChartSurface.renderableSeries.add(topLineSeries, bottomLineSeries)

        // Add interactivity modifiers
        // sciChartSurface.chartModifiers.add(
        // new MouseWheelZoomModifier(),
        // new ZoomPanModifier(),
        // new ZoomExtentsModifier()
        // )

        sciChartSurfaceRef.current = sciChartSurface
        topDataSeriesRef.current = topDataSeries
        bottomDataSeriesRef.current = bottomDataSeries
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize SciChart:', error)
      }
    }

    initChart()

    return () => {
      sciChartSurfaceRef.current?.delete()
      sciChartSurfaceRef.current = null
      topDataSeriesRef.current = null
      bottomDataSeriesRef.current = null
      setIsInitialized(false)
    }
  }, [])

  // Update chart data when pastSystemData changes
  useEffect(() => {
    if (
      !topDataSeriesRef.current ||
      !bottomDataSeriesRef.current ||
      !isInitialized ||
      pastSystemData.length === 0
    )
      return

    const topDataSeries = topDataSeriesRef.current
    const bottomDataSeries = bottomDataSeriesRef.current

    // Clear existing data
    topDataSeries.clear()
    bottomDataSeries.clear()

    // Add all historical data points
    const xValues: number[] = []
    const topYValues: number[] = []
    const bottomYValues: number[] = []

    pastSystemData.forEach((data, index) => {
      xValues.push(index)
      topYValues.push(data.topTemp)
      bottomYValues.push(data.bottomTemp)
    })

    topDataSeries.appendRange(xValues, topYValues)
    bottomDataSeries.appendRange(xValues, bottomYValues)
  }, [pastSystemData, isInitialized])

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
      </div>
      <div>
        <div
          ref={chartRef}
          style={{ width: '100%', height: '250px' }}
          className="rounded-2xl border border-muted-foreground/20"
        />
      </div>
    </Card>
  )
}
