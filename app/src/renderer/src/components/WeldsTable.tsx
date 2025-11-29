import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Thermometer,
  Timer,
  XCircle,
  Zap
} from 'lucide-react'

interface Weld {
  id?: number
  topHeaterTemperature: number
  bottomHeaterTemperature: number
  powerSupplyVoltage: number
  weldingDuration: number
  coolingDuration: number
  isSuccessful: boolean
  error?: string
}

interface WeldsTableProps {
  welds: Weld[]
  totalWelds: number
}

export function WeldsTable({ welds, totalWelds }: WeldsTableProps) {
  return (
    <Card className="border-2 shadow-xl shadow-black/5 pt-3">
      <CardHeader className="py-0">
        <div className="flex border-b pb-3">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              Weld Records
              {/* <Badge variant="outline" className="ml-2 font-semibold">
                {totalWelds} {totalWelds === 1 ? 'weld' : 'welds'}
              </Badge> */}
            </CardTitle>
            <CardDescription>
              Detailed log of all welding operations performed in this session
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {totalWelds > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[70px] font-bold">#</TableHead>
                  <TableHead className="font-bold">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      Top Temp
                    </div>
                  </TableHead>
                  <TableHead className="font-bold">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      Bottom Temp
                    </div>
                  </TableHead>
                  <TableHead className="font-bold">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Voltage
                    </div>
                  </TableHead>
                  <TableHead className="font-bold">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Welding
                    </div>
                  </TableHead>
                  <TableHead className="font-bold">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Cooling
                    </div>
                  </TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Error Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {welds.map((weld, index) => (
                  <TableRow
                    key={weld.id || index}
                    className="hover:bg-muted/50 transition-colors border-b"
                  >
                    <TableCell className="font-mono font-semibold text-muted-foreground">
                      {String(index + 1).padStart(3, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-orange-500/10">
                          <Thermometer className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="font-medium">{weld.topHeaterTemperature}°C</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-blue-500/10">
                          <Thermometer className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">{weld.bottomHeaterTemperature}°C</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-yellow-500/10">
                          <Zap className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <span className="font-medium">{weld.powerSupplyVoltage}V</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{weld.weldingDuration}s</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{weld.coolingDuration}s</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {weld.isSuccessful ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 font-semibold"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1.5" />
                          Success
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="font-semibold border-red-500/30"
                        >
                          <XCircle className="h-3 w-3 mr-1.5" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {weld.error ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 max-w-[250px] cursor-help group">
                              <AlertCircle className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="truncate font-medium">{weld.error}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[400px]">
                            <p className="font-medium">{weld.error}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground font-medium">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
              <Activity className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No welds recorded</h3>
            <p className="text-muted-foreground">
              Welding operations will appear here once they are performed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}