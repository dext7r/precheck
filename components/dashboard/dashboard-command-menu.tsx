"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  Clock,
  Mail,
  ChevronRight,
  ClipboardList,
  Gift,
  Settings,
  Ticket,
  MessageCircle,
  MessageSquare,
} from "lucide-react"
import { motion } from "framer-motion"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

interface DashboardCommandMenuProps {
  locale: Locale
}

interface RecentCommand {
  id: string
  label: string
  path: string
  timestamp: number
}

const RECENT_COMMANDS_KEY = "dashboard-recent-commands"
const MAX_RECENT_COMMANDS = 5

export function DashboardCommandMenu({ locale }: DashboardCommandMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dict, setDict] = useState<Dictionary | null>(null)
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>(() => {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(`${RECENT_COMMANDS_KEY}-${locale}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error("Failed to parse recent commands", e)
        return []
      }
    }
    return []
  })

  useEffect(() => {
    getDictionary(locale).then(setDict)
  }, [locale])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const addToRecent = (id: string, label: string, path: string, timestamp: number) => {
    const newCommand: RecentCommand = {
      id,
      label,
      path,
      timestamp,
    }

    const updated = [newCommand, ...recentCommands.filter((cmd) => cmd.id !== id)].slice(
      0,
      MAX_RECENT_COMMANDS,
    )

    setRecentCommands(updated)
    localStorage.setItem(`${RECENT_COMMANDS_KEY}-${locale}`, JSON.stringify(updated))
  }

  const runCommand = (id: string, label: string, path: string, command: () => void) => {
    setOpen(false)
    command()
    // Call addToRecent after closing to avoid calling during render
    setTimeout(() => addToRecent(id, label, path, Date.now()), 0)
  }

  if (!dict) return null

  const commands = [
    {
      id: "overview",
      label: dict.dashboard.overview,
      path: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      shortcut: "⌘1",
    },
    {
      id: "messages",
      label: dict.dashboard.messages,
      path: `/${locale}/dashboard/messages`,
      icon: Mail,
      shortcut: "⌘2",
    },
    {
      id: "pre-application",
      label: dict.dashboard.preApplication,
      path: `/${locale}/dashboard/pre-application`,
      icon: ClipboardList,
      shortcut: "⌘3",
    },
    {
      id: "tickets",
      label: ((dict.dashboard as unknown as Record<string, unknown>).tickets as string) || "工单",
      path: `/${locale}/dashboard/tickets`,
      icon: Ticket,
      shortcut: "⌘4",
    },
    {
      id: "chat",
      label: ((dict.dashboard as unknown as Record<string, unknown>).chat as string) || "聊天室",
      path: `/${locale}/dashboard/chat`,
      icon: MessageCircle,
      shortcut: "⌘5",
    },
    {
      id: "private-chats",
      label: ((dict.dashboard as unknown as Record<string, unknown>).privateChats as string) || "私信",
      path: `/${locale}/dashboard/private-chats`,
      icon: MessageSquare,
      shortcut: "⌘6",
    },
    {
      id: "contribute",
      label: dict.dashboard.contribute,
      path: `/${locale}/dashboard/contribute`,
      icon: Gift,
      shortcut: "⌘7",
    },
    {
      id: "settings",
      label: dict.dashboard.settings,
      path: `/${locale}/dashboard/settings`,
      icon: Settings,
      shortcut: "⌘8",
    },
  ]

  return (
    <>
      {/* Desktop: Full search bar */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative hidden w-64 items-center gap-2 rounded-lg border border-border/50 backdrop-blur-sm bg-background/80 px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:border-primary/30 lg:flex"
      >
        <Search className="h-4 w-4" />
        <span>{dict.dashboard.searchPlaceholder}</span>
        <motion.kbd
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm"
        >
          <span className="text-xs">⌘</span>K
        </motion.kbd>
      </motion.button>

      {/* Mobile: Icon button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Search className="h-5 w-5" />
      </motion.button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={`> ${dict.dashboard.searchPlaceholder}`} />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{dict.dashboard.noResults}</p>
            </div>
          </CommandEmpty>

          {/* Recent Commands */}
          {recentCommands.length > 0 && (
            <>
              <CommandGroup
                heading={
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{dict.dashboard.recent}</span>
                  </div>
                }
              >
                {recentCommands.map((cmd, index) => {
                  const command = commands.find((c) => c.id === cmd.id)
                  if (!command) return null

                  return (
                    <motion.div
                      key={cmd.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CommandItem
                        onSelect={() =>
                          runCommand(cmd.id, cmd.label, cmd.path, () => router.push(cmd.path))
                        }
                      >
                        <command.icon className="mr-2 h-4 w-4 text-primary" />
                        <span>{cmd.label}</span>
                        <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
                      </CommandItem>
                    </motion.div>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Quick Navigation */}
          <CommandGroup
            heading={
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                <span>{dict.dashboard.quickNav}</span>
              </div>
            }
          >
            {commands.map((cmd, index) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (recentCommands.length + index) * 0.05 }}
              >
                <CommandItem
                  onSelect={() =>
                    runCommand(cmd.id, cmd.label, cmd.path, () => router.push(cmd.path))
                  }
                >
                  <cmd.icon
                    className={cn(
                      "mr-2 h-4 w-4",
                      cmd.id === "overview" && "text-blue-500",
                      cmd.id === "posts" && "text-green-500",
                      cmd.id === "new-post" && "text-purple-500",
                      cmd.id === "messages" && "text-orange-500",
                      cmd.id === "analytics" && "text-cyan-500",
                      cmd.id === "settings" && "text-gray-500",
                    )}
                  />
                  <span>{cmd.label}</span>
                  <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                </CommandItem>
              </motion.div>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
