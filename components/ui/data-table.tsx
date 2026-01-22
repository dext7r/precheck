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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from "lucide-react"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
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
  emptyMessage?: string
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

  const offsetY = enableVirtualScroll ? visibleRange.start * rowHeight : 0

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

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      {mobileCardRender && (
        <div className="block md:hidden">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{loadingText}</p>
            </div>
          )}
          {!loading && data.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">{emptyMessage}</div>
          )}
          {!loading && data.length > 0 && (
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={item.id || index}>{mobileCardRender(item)}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      <div className={mobileCardRender ? "hidden md:block" : "block"}>
        <div
          ref={scrollContainerRef}
          className="relative overflow-auto rounded-lg border border-border"
          style={enableVirtualScroll ? { maxHeight: "600px" } : undefined}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <p className="text-muted-foreground">{loadingText}</p>
            </div>
          )}

          <table
            className="w-full"
            style={enableVirtualScroll ? { tableLayout: "fixed" } : undefined}
          >
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border">
                {selectable && (
                  <th className="w-12 px-4 py-3">
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
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left font-medium"
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-2 hover:text-primary cursor-pointer"
                      >
                        {column.label}
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              style={
                enableVirtualScroll
                  ? { height: `${data.length * rowHeight}px`, position: "relative" }
                  : undefined
              }
            >
              {visibleData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                visibleData.map((item, index) => {
                  const itemId = String(item[rowKey])
                  const rowSelectable = isRowSelectable ? isRowSelectable(item) : true
                  const isSelected = selectedIds.has(itemId)

                  return (
                    <motion.tr
                      key={item.id || index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`group border-b border-border last:border-0 transition-colors hover:bg-muted/50 ${isSelected ? "bg-muted/30" : ""}`}
                      style={
                        enableVirtualScroll
                          ? {
                              position: "absolute",
                              top: `${(visibleRange.start + index) * rowHeight}px`,
                              left: 0,
                              right: 0,
                              height: `${rowHeight}px`,
                            }
                          : undefined
                      }
                    >
                      {selectable && (
                        <td className="w-12 px-4 py-4">
                          <Checkbox
                            checked={isSelected}
                            disabled={!rowSelectable}
                            onCheckedChange={(checked) => handleSelectRow(itemId, checked === true)}
                            aria-label={`Select row ${index + 1}`}
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className="px-4 py-4"
                          style={column.width ? { width: column.width } : undefined}
                        >
                          {column.render ? column.render(item) : item[column.key]}
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

      {total > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{perPageText}</span>
            <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{summaryText}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
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
