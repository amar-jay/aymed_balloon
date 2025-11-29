// page to manage welding sessions
// export PDF downloads typeshit

import { useCallback, useEffect, useState } from 'react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './components/ui/table'
import { Badge } from './components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip'
import { useSessionById } from './use-sessions'
import {
  ChevronLeft,
  User,
  Building2,
  Save,
  Power,
  FileDown,
  Trash2,
  Calendar,
  Clock,
  Thermometer,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Info,
  TrendingUp,
  Timer,
  Sparkles
} from 'lucide-react'

export function WeldSession({ sessionId }: { sessionId: string }) {
  const { session, goToAllSessions, updateSession, deleteSession, endSession, generatePDF } =
    useSessionById(Number(sessionId))

  const [operatorName, setOperatorName] = useState('')
  const [companyName, setCompanyName] = useState('')

  // sync name when session changes
  useEffect(() => {
    if (!session) return
    setOperatorName(session.operatorName || '')
    setCompanyName(session.companyName || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  const handleSave = useCallback(async () => {
    if (!session) return
    await updateSession({
      operatorName,
      companyName,
      startSession: session.startSession,
      endSession: session.endSession,
      welds: session.welds,
      averageTopHeaterTemperature: session.averageTopHeaterTemperature,
      averageBottomHeaterTemperature: session.averageBottomHeaterTemperature,
      averagePowerSupplyVoltage: session.averagePowerSupplyVoltage,
      successCount: session.successCount,
      failureCount: session.failureCount
    })
  }, [session, operatorName, companyName, updateSession])

  if (!session) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <Activity className="h-16 w-16 text-primary mx-auto animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading session data...</p>
        </div>
      </div>
    )
  }

  const isActive = !session.endSession
  const totalWelds = session.welds?.length || 0
  const successRate = totalWelds > 0 ? ((session.successCount || 0) / totalWelds) * 100 : 0
  const failureRate = totalWelds > 0 ? ((session.failureCount || 0) / totalWelds) * 100 : 0

  // Calculate session duration
  const startTime = session.startSession ? new Date(session.startSession).getTime() : 0
  const endTime = session.endSession ? new Date(session.endSession).getTime() : Date.now()
  const durationMs = endTime - startTime
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="w-full px-8 py-8 space-y-8 max-w-[1800px] mx-auto">
        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 backdrop-blur-sm">
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToAllSessions}
                      className="h-10 w-10 hover:bg-primary/10"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to all sessions</TooltipContent>
                </Tooltip>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Welding Session
                    </h1>
                    {isActive && (
                      <Badge
                        variant="default"
                        className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs font-semibold animate-pulse"
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Session ID: <span className="font-mono text-foreground/80">{sessionId}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSave}
                      disabled={!operatorName.trim()}
                      className="shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save changes to session details</TooltipContent>
                </Tooltip>
                {isActive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        onClick={endSession}
                        className="shadow-lg shadow-secondary/10 hover:shadow-xl transition-all"
                      >
                        <Power className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark this session as completed</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={generatePDF}
                      className="shadow-md hover:shadow-lg transition-all"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate and download PDF report</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={deleteSession}
                      className="shadow-lg shadow-destructive/10 hover:shadow-xl hover:shadow-destructive/20 transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Permanently delete this session</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Timer className="h-3.5 w-3.5" />
                  Duration
                </div>
                <p className="text-lg font-bold">
                  {durationHours}h {durationMinutes}m
                </p>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" />
                  Total Welds
                </div>
                <p className="text-lg font-bold">{totalWelds}</p>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Success Rate
                </div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {successRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Started
                </div>
                <p className="text-sm font-semibold">
                  {session.startSession
                    ? new Date(session.startSession).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Session Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 shadow-xl shadow-black/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  Session Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      Operator Name
                    </label>
                    <Input
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="Enter operator name"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Company Name
                    </label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Started</span>
                    </div>
                    <p className="text-sm font-semibold text-right">
                      {session.startSession
                        ? new Date(session.startSession).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{isActive ? 'Status' : 'Ended'}</span>
                    </div>
                    <p className="text-sm font-semibold text-right">
                      {isActive
                        ? 'In Progress'
                        : session.endSession
                          ? new Date(session.endSession).toLocaleString()
                          : 'N/A'}
                    </p>
                  </div>
                  {session.createdAt && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created</span>
                      </div>
                      <p className="text-sm font-semibold text-right">
                        {new Date(session.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Statistics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Average Top Temperature
                      </p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                        {session.averageTopHeaterTemperature?.toFixed(1) || 0}°C
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
                      <Thermometer className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                        <Info className="h-3 w-3" />
                        Average across all welds
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Average top heater temperature across all welds in this session
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Average Bottom Temperature
                      </p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {session.averageBottomHeaterTemperature?.toFixed(1) || 0}°C
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
                      <Thermometer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                        <Info className="h-3 w-3" />
                        Average across all welds
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Average bottom heater temperature across all welds in this session
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Average Voltage
                      </p>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                        {session.averagePowerSupplyVoltage?.toFixed(1) || 0}V
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/20">
                      <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                        <Info className="h-3 w-3" />
                        Average across all welds
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Average power supply voltage across all welds in this session
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Success Rate
                      </p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {successRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {session.successCount || 0} of {totalWelds} welds
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Success vs Failure Comparison */}
            <Card className="border-2 shadow-xl shadow-black/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Performance Overview
                </CardTitle>
                <CardDescription>Success and failure breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold">Successful Welds</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {session.successCount || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {successRate.toFixed(1)}% of total
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-sm font-semibold">Failed Welds</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {session.failureCount || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                        style={{ width: `${failureRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {failureRate.toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Welds Table */}
        <Card className="border-2 shadow-xl shadow-black/5">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  Weld Records
                  <Badge variant="outline" className="ml-2 font-semibold">
                    {totalWelds} {totalWelds === 1 ? 'weld' : 'welds'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2">
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
                    {session.welds.map((weld, index) => (
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
      </div>
    </div>
  )
}
