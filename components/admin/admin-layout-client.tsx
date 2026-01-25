"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Watermark } from "@/components/ui/watermark"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import type { Role } from "@prisma/client"

interface AdminLayoutClientProps {
  locale: Locale
  dict: Dictionary
  user: { id: string; name?: string | null; email: string; role: Role }
  children: React.ReactNode
}

export function AdminLayoutClient({ locale, dict, user, children }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* 水印 */}
      <Watermark userId={user.id} email={user.email} name={user.name ?? undefined} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar locale={locale} dict={dict} user={user} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <AdminSidebar locale={locale} dict={dict} user={user} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <AdminHeader
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
