"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { useTrades } from "@/lib/trade-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  Search,
  Calendar,
  Filter,
  Loader2,
} from "lucide-react"
import { EmotionTagApi, getTagCategory } from "@/lib/trade-store"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { api, ApiPaginatedResponse, ApiResponse } from "@/lib/api"
import { buildCreateTradeHref } from "@/lib/create-trade-form"
import { useToast } from "@/hooks/use-toast"
import { AxiosResponse } from "axios"
import { EmotionTag, Trade, TradeHistory } from "../types/trade"
import { EmotionType } from "@/lib/enum/EmotionType"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"

type SortField = "date" | "pnl" | "asset"
type SortDirection = "asc" | "desc"

function HistoryContent() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isAuthLoading, pathname, router])

  const { userSessions } = useTrades()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState<PositionType>(PositionType.All)
  const [statusFilter, setStatusFilter] = useState<TradeStatus>(TradeStatus.All)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tradeToDelete, setTradeToDelete] = useState<TradeHistory | null>(null);
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [apiTrades, setApiTrades] = useState<TradeHistory[]>([]);
  const [totalRecords, setTotalRecords] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const fetchTrades = useCallback(async () => {
    try {
      setIsLoading(true)
      const payload = {
        asset: searchQuery,
        position: positionFilter === PositionType.All ? null : positionFilter,
        status: statusFilter === TradeStatus.All ? null : statusFilter,
        fromDate: dateFrom || null,
        toDate: dateTo || null,
        page: page,
        pageSize: pageSize
      }
      const response = await api.post<ApiPaginatedResponse<TradeHistory>>(
        "/v1/trade-histories/search",
        payload,
      );
      if (response.data?.isSuccess) {
        const dataValue = response.data.value || {}
        const items = dataValue.values || [];

        setApiTrades(items);
        setTotalRecords(dataValue.totalItems || items.length)
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to load trades",
        description: "Unable to fetch your trade history. Please refresh and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, page, positionFilter, searchQuery, statusFilter, toast])

  useEffect(() => {
    if (isAuthLoading || !user) return;
    const timer = setTimeout(() => {
      fetchTrades()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchTrades, isAuthLoading, user])

  useEffect(() => {
    if (isAuthLoading || !user) return;
    api.get<ApiResponse<EmotionTagApi[]>>("/v1/emotions")
      .then((response: AxiosResponse<ApiResponse<EmotionTagApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) setApiTags(data.value)
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to load emotion tags",
          description: "Trade emotions could not be loaded for the history view.",
        })
      })
  }, [toast, isAuthLoading, user])

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = [...apiTrades]

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case "pnl":
          comparison = (a.pnl || 0) - (b.pnl || 0)
          break
        case "asset":
          comparison = a.asset?.localeCompare(b.asset || "") || 0
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [apiTrades, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const handleDeleteClick = (trade: TradeHistory) => {
    setTradeToDelete(trade)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (tradeToDelete) {
      setIsDeleting(true)
      try {
        await api.delete(`/v1/trade-histories/${tradeToDelete.id}`)
        await fetchTrades()
      } catch {
        toast({
          variant: "destructive",
          title: "Failed to delete trade",
          description: "The trade could not be deleted. Please try again.",
        })
      } finally {
        setIsDeleting(false)
        setDeleteDialogOpen(false)
        setTradeToDelete(null)
      }
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setPositionFilter(PositionType.All)
    setStatusFilter(TradeStatus.All)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const getPositionTypeLabel = (position: PositionType) => {
    switch (position) {
      case PositionType.Long:
        return "Long"
      case PositionType.Short:
        return "Short"
      default:
        return "All"
    }
  }

  const getTradeStatusLabel = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.Open:
        return "Open"
      case TradeStatus.Closed:
        return "Closed"
      default:
        return "All"
    }
  }

  if (isAuthLoading) {
    return <AppShellLoader title="Loading history" description="Retrieving your trades." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trade History</h1>
            <p className="text-muted-foreground">View and manage all your trades</p>
          </div>
          <Button className="gap-2" asChild>
            <Link href={buildCreateTradeHref("/history")}>
              <Plus className="h-4 w-4" />
              Create Trade
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="trades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="m-0">
            <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground">All Trades</CardTitle>
            <CardDescription className="text-muted-foreground">
              {totalRecords} trades found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by asset..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="pl-9"
                  />
                </div>
                <Select value={positionFilter.toString()} onValueChange={(value) => {
                  if (value === PositionType.All.toString()) {
                    setPositionFilter(PositionType.All)
                  } else if (value === PositionType.Long.toString()) {
                    setPositionFilter(PositionType.Long)
                  } else if (value === PositionType.Short.toString()) {
                    setPositionFilter(PositionType.Short)
                  }
                  setPage(1)
                }}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PositionType.All.toString()}>All Positions</SelectItem>
                    <SelectItem value={PositionType.Long.toString()}>Long</SelectItem>
                    <SelectItem value={PositionType.Short.toString()}>Short</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter.toString()} onValueChange={(value) => {
                  if (value === TradeStatus.All.toString()) {
                    setStatusFilter(TradeStatus.All)
                  } else if (value === TradeStatus.Open.toString()) {
                    setStatusFilter(TradeStatus.Open)
                  } else if (value === TradeStatus.Closed.toString()) {
                    setStatusFilter(TradeStatus.Closed)
                  }
                  setPage(1)
                }}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TradeStatus.All.toString()}>All Status</SelectItem>
                    <SelectItem value={TradeStatus.Open.toString()}>Open</SelectItem>
                    <SelectItem value={TradeStatus.Closed.toString()}>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">From:</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setPage(1)
                    }}
                    className="w-[160px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">To:</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setPage(1)
                    }}
                    className="w-[160px]"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort("asset")}
                      >
                        Asset
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-muted-foreground">Position</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort("date")}
                      >
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-muted-foreground">Mood</TableHead>
                    <TableHead className="text-right text-muted-foreground">Entry</TableHead>
                    <TableHead className="text-right text-muted-foreground">Exit</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-mr-3 h-8 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort("pnl")}
                      >
                        P&L
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No trades found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTrades.map((trade) => (
                      <TableRow key={trade.id} className="border-border">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {trade.asset}
                            {trade.isRuleBroken && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help text-destructive" title="Rule Broken">⚠️</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Rule Violation: {trade.ruleBreakReason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              trade.position === PositionType.Long
                                ? "bg-success/20 text-success"
                                : "bg-destructive/20 text-destructive"
                            }
                          >
                            {trade.position === PositionType.Long ? (
                              <ArrowUpRight className="mr-1 h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="mr-1 h-3 w-3" />
                            )}
                            {getPositionTypeLabel(trade.position)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              trade.status === TradeStatus.Open
                                ? "border-warning text-warning"
                                : "border-muted-foreground text-muted-foreground"
                            }
                          >
                            {getTradeStatusLabel(trade.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {new Date(trade.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {trade.emotionTags && trade.emotionTags.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    {trade.emotionTags.map((emotionTag: EmotionTag) => {
                                      const label = emotionTag.name
                                      const category = emotionTag.emotionType;
                                      const colorMap = {
                                        [EmotionType.Positive]: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
                                        [EmotionType.Negative]: "bg-red-500/15 text-red-400 border-red-500/25",
                                        [EmotionType.Neutral]: "bg-blue-500/15 text-blue-400 border-blue-500/25",
                                      }
                                      return (
                                        <span
                                          key={emotionTag.id}
                                          className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${colorMap[category]}`}
                                        >
                                          {label}
                                        </span>
                                      )
                                    })}
                                    {trade.emotionTags.length > 2 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        +{trade.emotionTags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px]">
                                  <div className="flex flex-wrap gap-1">
                                    {trade.emotionTags.map((emotionTag: EmotionTag) => {
                                      return (
                                        <span key={emotionTag.id} className="text-xs">{emotionTag.name}</span>
                                      )
                                    })}
                                  </div>
                                  {trade.confidenceLevel && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Confidence: {trade.confidenceLevel}/5
                                    </div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatCurrency(trade.entryPrice)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {trade.exitPrice ? formatCurrency(trade.exitPrice) : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            trade.pnl !== undefined
                              ? trade.pnl >= 0
                                ? "text-success"
                                : "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {trade.pnl !== undefined
                            ? `${trade.pnl >= 0 ? "+" : ""}${formatCurrency(trade.pnl)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/trade/${trade.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteClick(trade)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalRecords > pageSize && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalRecords)} of {totalRecords} trades
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= totalRecords || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="sessions" className="m-0">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Trading Sessions</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {userSessions.length} total sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Trades Count</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No trading sessions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        userSessions.map((session) => (
                          <TableRow key={session.id} className="border-border">
                            <TableCell className="font-medium text-foreground">
                              {new Date(session.startTime).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {session.endTime ? new Date(session.endTime).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  session.status === "Active"
                                    ? "border-success text-success bg-success/10"
                                    : "border-muted-foreground text-muted-foreground"
                                }
                              >
                                {session.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {session.tradesCount || 0}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                session.pnl !== undefined
                                  ? session.pnl >= 0
                                    ? "text-success"
                                    : "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {session.pnl !== undefined
                                ? `${session.pnl >= 0 ? "+" : ""}${formatCurrency(session.pnl)}`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Trade</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the {tradeToDelete?.asset} trade? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default function HistoryPage() {
  return <HistoryContent />
}
