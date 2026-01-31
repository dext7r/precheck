"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Ticket, Clock, CheckCircle, AlertCircle, XCircle, User, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface AdminTicketListProps {
  locale: Locale
  dict: Dictionary
}

type AdminTicket = {
  id: string
  subject: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; email: string; role: string }
  preApplication: { id: string; status: string; registerEmail: string }
  messages: Array<{
    content: string
    createdAt: string
    author: { name: string | null; role: string }
  }>
}

const statusConfig = {
  OPEN: { icon: AlertCircle, color: "bg-yellow-500 text-yellow-50", label: "open" },
  IN_PROGRESS: { icon: Clock, color: "bg-blue-500 text-blue-50", label: "in_progress" },
  RESOLVED: { icon: CheckCircle, color: "bg-green-500 text-green-50", label: "resolved" },
  CLOSED: { icon: XCircle, color: "bg-gray-500 text-gray-50", label: "closed" },
}

export function AdminTicketList({ locale, dict }: AdminTicketListProps) {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [total, setTotal] = useState(0)

  const t = (dict.admin as Record<string, unknown>) || {}
  const statusLabels = (t.ticketStatus as Record<string, string>) || {}

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/tickets?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets || [])
      setTotal(data.total || 0)
    } catch {
      toast.error("获取工单列表失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{(t.tickets as string) || "工单管理"}</h1>
          <p className="text-muted-foreground">
            {(t.ticketsDesc as string) || "处理用户工单申诉"}
            {total > 0 && ` · 共 ${total} 条`}
          </p>
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="OPEN">{statusLabels.open || "待处理"}</SelectItem>
            <SelectItem value="IN_PROGRESS">{statusLabels.in_progress || "处理中"}</SelectItem>
            <SelectItem value="RESOLVED">{statusLabels.resolved || "已解决"}</SelectItem>
            <SelectItem value="CLOSED">{statusLabels.closed || "已关闭"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{(t.noTickets as string) || "暂无工单"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, index) => {
            const config = statusConfig[ticket.status]
            const StatusIcon = config.icon
            const lastMessage = ticket.messages[0]

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/${locale}/admin/tickets/${ticket.id}`}>
                  <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{ticket.subject}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{ticket.user.name || ticket.user.email}</span>
                            <span>·</span>
                            <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge className={`${config.color} flex items-center gap-1 shrink-0`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusLabels[config.label] || ticket.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    {lastMessage && (
                      <CardContent className="pt-0">
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {lastMessage.author.name || "用户"}
                            {lastMessage.author.role !== "USER" && " [管理员]"}:
                          </span>{" "}
                          {lastMessage.content}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
