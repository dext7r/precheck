"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMounted } from "@/lib/hooks/use-mounted"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { locales, localeNames, localeFlags, type Locale } from "@/lib/i18n/config"

interface LocaleSwitcherProps {
  currentLocale: Locale
}

export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const mounted = useMounted()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split("/")
    segments[1] = newLocale
    const newPath = segments.join("/")
    const search = searchParams.toString()
    router.push(search ? `${newPath}?${search}` : newPath)
  }

  // 避免 SSR hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Globe className="h-5 w-5" />
        <span className="sr-only">Switch language</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className={currentLocale === locale ? "bg-accent" : ""}
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
