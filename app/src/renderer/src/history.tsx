import React from 'react'
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
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from './components/ui/empty'
import { NativeSelect, NativeSelectOption } from './components/ui/native-select'
import { useSessions } from './use-sessions'
import {
  Trash2,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  Activity,
  Search,
  Filter,
  ArrowUpDown,
  X,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide
} from 'lucide-react'

type SortField = 'date' | 'operator' | 'company' | 'welds' | 'success' | 'failures'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'completed'

export function History(): React.JSX.Element {
  const { sessions, goToSession, deleteSession } = useSessions()
  // const [newSessionName, setNewSessionName] = React.useState('')
  // const [companyName, setCompanyName] = React.useState('')

  // Filter and sort state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [companyFilter, setCompanyFilter] = React.useState<string>('all')
  const [sortField, setSortField] = React.useState<SortField>('date')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')

  // const onCreateSession = async () => {
  //   if (!newSessionName.trim()) return

  //   await createSession({
  //     operatorName: newSessionName,
  //     companyName: companyName || 'Unknown',
  //     startSession: new Date().toISOString(),
  //     welds: [],
  //     averageTopHeaterTemperature: 0,
  //     averageBottomHeaterTemperature: 0,
  //     averagePowerSupplyVoltage: 0,
  //     successCount: 0,
  //     failureCount: 0
  //   })
  //   setNewSessionName('')
  //   setCompanyName('')
  // }

  const validSessions = sessions.filter((session) => session.id != null)

  // Get unique companies for filter
  const uniqueCompanies = React.useMemo(() => {
    const companies = new Set<string>()
    validSessions.forEach((session) => {
      if (session.companyName) {
        companies.add(session.companyName)
      }
    })
    return Array.from(companies).sort()
  }, [validSessions])

  // Filter and sort sessions
  const filteredAndSortedSessions = React.useMemo(() => {
    const filtered = validSessions.filter((session) => {
      // Search filter
      if (
        searchQuery &&
        !session.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !session.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Status filter
      if (statusFilter === 'active' && session.endSession) {
        return false
      }
      if (statusFilter === 'completed' && !session.endSession) {
        return false
      }

      // Company filter
      if (companyFilter !== 'all' && session.companyName !== companyFilter) {
        return false
      }

      return true
    })

    // Sort sessions (create a copy to avoid mutating)
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date': {
          const dateA = a.startSession ? new Date(a.startSession).getTime() : 0
          const dateB = b.startSession ? new Date(b.startSession).getTime() : 0
          comparison = dateA - dateB
          break
        }
        case 'operator':
          comparison = a.operatorName.localeCompare(b.operatorName)
          break
        case 'company':
          comparison = (a.companyName || '').localeCompare(b.companyName || '')
          break
        case 'welds':
          comparison = (a.welds?.length || 0) - (b.welds?.length || 0)
          break
        case 'success':
          comparison = a.successCount - b.successCount
          break
        case 'failures':
          comparison = a.failureCount - b.failureCount
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [validSessions, searchQuery, statusFilter, companyFilter, sortField, sortDirection])

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || companyFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCompanyFilter('all')
  }

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div className="flex-1 px-6 py-6 space-y-6">

      {/* <Card>
        <CardHeader>
          <CardTitle>Create New Session</CardTitle>
          <CardDescription>
            Start a new welding session by entering the operator and company information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Operator Name
              </label>
              <Input
                placeholder="Enter operator name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCreateSession()
                  }
                }}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Name
              </label>
              <Input
                placeholder="Enter company name (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCreateSession()
                  }
                }}
              />
            </div>
            <Button
              onClick={onCreateSession}
              disabled={!newSessionName.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </div>
        </CardContent>
      </Card>  */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {/* <CardTitle>Sessions</CardTitle> */}
              <CardTitle className="text-2xl font-bold tracking-tight">Weld History</CardTitle>
              <CardDescription>
                {validSessions.length === 0
                  ? 'No sessions found. Create your first session above.'
                  : `${filteredAndSortedSessions.length} of ${validSessions.length} session${validSessions.length === 1 ? '' : 's'} shown`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6  text-muted-foreground">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4 " />
                  Search
                </label>
                <Input
                  placeholder="Search by operator or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Status
                </label>
                <NativeSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <NativeSelectOption value="all">All Status</NativeSelectOption>
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                  <NativeSelectOption value="completed">Completed</NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company
                </label>
                <NativeSelect
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <NativeSelectOption value="all">All Companies</NativeSelectOption>
                  {uniqueCompanies.map((company) => (
                    <NativeSelectOption key={company} value={company}>
                      {company}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort By
                </label>
                <div className="flex gap-2">
                  <NativeSelect
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                  >
                    <NativeSelectOption value="date">Date</NativeSelectOption>
                    <NativeSelectOption value="operator">Operator</NativeSelectOption>
                    <NativeSelectOption value="company">Company</NativeSelectOption>
                    <NativeSelectOption value="welds">Welds</NativeSelectOption>
                    <NativeSelectOption value="success">Success</NativeSelectOption>
                    <NativeSelectOption value="failures">Failures</NativeSelectOption>
                  </NativeSelect>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSortDirection}
                    title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    {sortDirection === 'asc' ? (
                      <ArrowUpNarrowWide className="h-4 w-4" />
                    ) : (
                      <ArrowDownNarrowWide className="h-4 w-4" />
                    )}
                  </Button>

                  <Button variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters}>
                    <X className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {validSessions.length === 0 ? (
            <Empty>
              <EmptyMedia>
                <Activity className="h-12 w-12 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No sessions yet</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first welding session above.
              </EmptyDescription>
            </Empty>
          ) : filteredAndSortedSessions.length === 0 ? (
            <Empty>
              <EmptyMedia>
                <Search className="h-12 w-12 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No sessions match your filters</EmptyTitle>
              <EmptyDescription>
                Try adjusting your search or filter criteria to see more results.
              </EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Operator</TableHead>
                  <TableHead className="w-[200px]">Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Welds</TableHead>
                  <TableHead className="text-center">Success</TableHead>
                  <TableHead className="text-center">Failures</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => goToSession(session.id!)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {session.operatorName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {session.companyName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.endSession ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{session.welds?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">{session.successCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-600">{session.failureCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {session.startSession
                          ? new Date(session.startSession).toLocaleString()
                          : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.endSession ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.endSession).toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await deleteSession(session.id!)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
