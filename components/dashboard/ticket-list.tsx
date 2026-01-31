"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Ticket, Plus, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface TicketListProps {
  locale: Locale
  dict: Dictionary
  userId: string
}

type TicketRecord = {
  id: string
  subject: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  updatedAt: string
  preApplication: { id: string; status: string; registerEmail: string }
  messages: Array<{
    content: string
    createdAt: string
    author: { name: string | null; role: string }
  }>
}

const statusConfig = {
  OPEN: { icon: AlertCircle, color: "bg-yellow-500", label: "open" },
  IN_PROGRESS: { icon: Clock, color: "bg-blue-500", label: "in_progress" },
  RESOLVED: { icon: CheckCircle, color: "bg-green-500", label: "resolved" },
  CLOSED: { icon: XCircle, color: "bg-gray-500", label: "closed" },
}

export function TicketList({ locale, dict }: TicketListProps) {
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(true)

  const t = (dict.dashboard as Record<string, unknown>) || {}
  const statusLabels = (t.ticketStatus as Record<string, string>) || {}

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch {
      toast.error((t.fetchFailed as string) || "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{(t.tickets as string) || "工单"}</h1>
          <p className="text-muted-foreground">
            {(t.ticketsDesc as string) || "查看和管理您的工单申诉"}
          </p>
        </div>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{(t.noTickets as string) || "暂无工单"}</p>
            <p className="mt-2 text-sm text-muted-foreground">您可以在预申请被拒绝后发起工单申诉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket, index) => {
            const config = statusConfig[ticket.status]
            const StatusIcon = config.icon
            const lastMessage = ticket.messages[0]

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/${locale}/dashboard/tickets/${ticket.id}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                          <CardDescription>
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusLabels[config.label] || ticket.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {lastMessage && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {lastMessage.author.name || "用户"}
                            {lastMessage.author.role !== "USER" && " [管理员]"}:
                          </span>{" "}
                          {lastMessage.content}
                        </p>
                      )}
                    </CardContent>
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
