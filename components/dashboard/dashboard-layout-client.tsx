"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface DashboardLayoutClientProps {
  locale: Locale
  dict: Dictionary
  user: { id: string; name?: string | null; email: string; role: string; avatar?: string | null }
  children: React.ReactNode
}

export function DashboardLayoutClient({
  locale,
  dict,
  user,
  children,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar locale={locale} dict={dict} user={user} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <DashboardSidebar locale={locale} dict={dict} user={user} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <DashboardHeader
          locale={locale}
          dict={dict}
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
