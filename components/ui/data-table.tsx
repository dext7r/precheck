"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Inbox,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
  align?: "left" | "center" | "right"
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSort?: (key: string, direction: "asc" | "desc") => void
  loading?: boolean
  emptyMessage?: React.ReactNode
  rowHeight?: number
  enableVirtualScroll?: boolean
  mobileCardRender?: (item: T) => React.ReactNode
  loadingText?: string
  perPageText?: string
  summaryFormatter?: (summary: { total: number; page: number; totalPages: number }) => string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  rowKey?: keyof T
  isRowSelectable?: (item: T) => boolean
  striped?: boolean
  compact?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSort,
  loading = false,
  emptyMessage = "No data",
  rowHeight = 60,
  enableVirtualScroll = false,
  mobileCardRender,
  loadingText = "Loading...",
  perPageText = "Per page",
  summaryFormatter,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  rowKey = "id" as keyof T,
  isRowSelectable,
  striped = false,
  compact = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(total / pageSize)
  const summaryText = summaryFormatter
    ? summaryFormatter({ total, page, totalPages })
    : `Total ${total}, page ${page} / ${totalPages}`

  const handleSort = (key: string) => {
    if (!onSort) return
    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc"
    setSortKey(key)
    setSortDirection(newDirection)
    onSort(key, newDirection)
  }

  const handleScroll = useCallback(() => {
    if (!enableVirtualScroll || !scrollContainerRef.current) return

    const scrollTop = scrollContainerRef.current.scrollTop
    const start = Math.floor(scrollTop / rowHeight)
    const end = start + Math.ceil(scrollContainerRef.current.clientHeight / rowHeight) + 5

    setVisibleRange({ start: Math.max(0, start - 5), end: Math.min(data.length, end) })
  }, [enableVirtualScroll, rowHeight, data.length])

  useEffect(() => {
    if (!enableVirtualScroll) return
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll)
    handleScroll()

    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll, enableVirtualScroll])

  const visibleData = enableVirtualScroll ? data.slice(visibleRange.start, visibleRange.end) : data

  const selectableData = selectable
    ? data.filter((item) => (isRowSelectable ? isRowSelectable(item) : true))
    : []
  const allSelectableIds = new Set(selectableData.map((item) => String(item[rowKey])))
  const allSelected =
    selectableData.length > 0 &&
    selectableData.every((item) => selectedIds.has(String(item[rowKey])))
  const someSelected =
    selectableData.some((item) => selectedIds.has(String(item[rowKey]))) && !allSelected

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    const newSelection = new Set(selectedIds)
    if (checked) {
      allSelectableIds.forEach((id) => newSelection.add(id))
    } else {
      allSelectableIds.forEach((id) => newSelection.delete(id))
    }
    onSelectionChange(newSelection)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    onSelectionChange(newSelection)
  }

  const cellPadding = compact ? "px-3 py-2" : "px-4 py-4"
  const headerPadding = compact ? "px-3 py-2.5" : "px-4 py-3.5"

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      {mobileCardRender && (
        <div className="block md:hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground">{loadingText}</p>
            </div>
          )}
          {!loading && data.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
          )}
          {!loading && data.length > 0 && (
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={(item.id as string) || index}>{mobileCardRender(item)}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      <div className={mobileCardRender ? "hidden md:block" : "block"}>
        <div
          ref={scrollContainerRef}
          className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          style={enableVirtualScroll ? { maxHeight: "600px", overflow: "auto" } : undefined}
        >
          {/* Loading Overlay */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">{loadingText}</p>
            </motion.div>
          )}

          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse"
              style={enableVirtualScroll ? { tableLayout: "fixed" } : undefined}
            >
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {selectable && (
                    <th className={cn("w-12", headerPadding)}>
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el)
                            (el as HTMLButtonElement).dataset.state = someSelected
                              ? "indeterminate"
                              : allSelected
                                ? "checked"
                                : "unchecked"
                        }}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Select all"
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </th>
                  )}
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={cn(
                        headerPadding,
                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        !column.align && "text-left",
                      )}
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.sortable ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          className={cn(
                            "group inline-flex items-center gap-1.5 rounded-md px-2 py-1 -ml-2",
                            "transition-colors hover:bg-primary/10 hover:text-primary",
                            sortKey === column.key && "text-primary",
                          )}
                        >
                          <span>{column.label}</span>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {sortKey === column.key ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
                            )}
                          </span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y divide-border"
                style={
                  enableVirtualScroll
                    ? { height: `${data.length * rowHeight}px`, position: "relative" }
                    : undefined
                }
              >
                {visibleData.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleData.map((item, index) => {
                    const itemId = String(item[rowKey])
                    const rowSelectable = isRowSelectable ? isRowSelectable(item) : true
                    const isSelected = selectedIds.has(itemId)
                    const actualIndex = enableVirtualScroll ? visibleRange.start + index : index

                    return (
                      <motion.tr
                        key={(item.id as string) || index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                        className={cn(
                          "group transition-colors",
                          isSelected
                            ? "bg-primary/5 hover:bg-primary/10"
                            : striped && actualIndex % 2 === 1
                              ? "bg-muted/30 hover:bg-muted/50"
                              : "hover:bg-muted/40",
                        )}
                        style={
                          enableVirtualScroll
                            ? {
                                position: "absolute",
                                top: `${actualIndex * rowHeight}px`,
                                left: 0,
                                right: 0,
                                height: `${rowHeight}px`,
                              }
                            : undefined
                        }
                      >
                        {selectable && (
                          <td className={cn("w-12", cellPadding)}>
                            <Checkbox
                              checked={isSelected}
                              disabled={!rowSelectable}
                              onCheckedChange={(checked) =>
                                handleSelectRow(itemId, checked === true)
                              }
                              aria-label={`Select row ${actualIndex + 1}`}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </td>
                        )}
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={cn(
                              cellPadding,
                              "text-sm",
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right",
                            )}
                            style={column.width ? { width: column.width } : undefined}
                          >
                            {column.render
                              ? column.render(item)
                              : (item[column.key] as React.ReactNode)}
                          </td>
                        ))}
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">{perPageText}</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => onPageSizeChange(Number(v))}
              >
                <SelectTrigger className="h-7 w-16 border-0 bg-transparent text-xs font-medium shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">{summaryText}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1 px-1">
              {(() => {
                const pages: (number | "ellipsis")[] = []
                const showPages = 5
                let start = Math.max(1, page - Math.floor(showPages / 2))
                const end = Math.min(totalPages, start + showPages - 1)

                if (end - start + 1 < showPages) {
                  start = Math.max(1, end - showPages + 1)
                }

                if (start > 1) {
                  pages.push(1)
                  if (start > 2) pages.push("ellipsis")
                }

                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) pages.push(i)
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push("ellipsis")
                  pages.push(totalPages)
                }

                return pages.map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "h-8 w-8 text-xs font-medium",
                        page === p && "pointer-events-none",
                      )}
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </Button>
                  ),
                )
              })()}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
