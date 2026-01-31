"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Ticket, Plus, Clock, CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

type PreApp = {
  id: string
  status: string
}

const statusConfig = {
  OPEN: { icon: AlertCircle, color: "bg-yellow-500", label: "open" },
  IN_PROGRESS: { icon: Clock, color: "bg-blue-500", label: "in_progress" },
  RESOLVED: { icon: CheckCircle, color: "bg-green-500", label: "resolved" },
  CLOSED: { icon: XCircle, color: "bg-gray-500", label: "closed" },
}

const ALLOWED_STATUSES = ["REJECTED", "PENDING"]

export function TicketList({ locale, dict }: TicketListProps) {
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preApp, setPreApp] = useState<PreApp | null>(null)
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const t = (dict.dashboard as Record<string, unknown>) || {}
  const statusLabels = (t.ticketStatus as Record<string, string>) || {}

  useEffect(() => {
    fetchTickets()
    fetchPreApp()
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

  const fetchPreApp = async () => {
    try {
      const res = await fetch("/api/pre-application")
      if (!res.ok) return
      const data = await res.json()
      if (data.record) setPreApp({ id: data.record.id, status: data.record.status })
    } catch {
      /* ignore */
    }
  }

  const hasActiveTicket = tickets.some((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
  const canCreate = preApp && ALLOWED_STATUSES.includes(preApp.status) && !hasActiveTicket

  const handleCreate = async () => {
    if (!preApp || !subject.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preApplicationId: preApp.id,
          subject: subject.trim(),
          content: content.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      setDialogOpen(false)
      setSubject("")
      setContent("")
      await fetchTickets()
      toast.success((t.ticketCreated as string) || "Ticket created")
    } catch {
      toast.error((t.ticketCreateFailed as string) || "Failed to create ticket")
    } finally {
      setSubmitting(false)
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
          <h1 className="text-2xl font-bold">{(t.tickets as string) || "Tickets"}</h1>
          <p className="text-muted-foreground">
            {(t.ticketsDesc as string) || "View and manage your support tickets"}
          </p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {(t.createTicket as string) || "Create Ticket"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{(t.createTicket as string) || "Create Ticket"}</DialogTitle>
                <DialogDescription>
                  {(t.ticketCreateDesc as string) ||
                    "Submit a ticket to communicate with the review team"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{(t.ticketSubject as string) || "Subject"}</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={
                      (t.ticketSubjectPlaceholder as string) || "Briefly describe your issue"
                    }
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{(t.ticketContent as string) || "Description"}</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      (t.ticketContentPlaceholder as string) ||
                      "Please describe your issue or appeal in detail..."
                    }
                    rows={5}
                    maxLength={2000}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={submitting || !subject.trim() || !content.trim()}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {(t.ticketSubmitting as string) || "Submitting..."}
                    </>
                  ) : (
                    (t.ticketSubmit as string) || "Submit Ticket"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{(t.noTickets as string) || "No tickets yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {(t.noTicketsHint as string) ||
                "You can submit a ticket when your application is pending or rejected"}
            </p>
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
                            {lastMessage.author.name || "User"}
                            {lastMessage.author.role !== "USER" && " [Admin]"}:
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
