"use client"

import { Moon, Sun, Check, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useColorTheme } from "@/components/providers/theme-provider"
import { colorThemes, colorThemeNames, type ColorTheme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

const themeColorPreview: Record<ColorTheme, string> = {
  zinc: "#71717a",
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  yellow: "#eab308",
}

interface ThemeToggleProps {
  dict: Dictionary
}

export function ThemeToggle({ dict }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{dict.theme.toggle}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {dict.theme.mode}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" />
          {dict.theme.light}
          {theme === "light" && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" />
          {dict.theme.dark}
          {theme === "dark" && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" />
          {dict.theme.system}
          {theme === "system" && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {dict.theme.color}
        </DropdownMenuLabel>
        <div className="grid grid-cols-4 gap-1 p-2">
          {colorThemeNames.map((name) => (
            <button
              key={name}
              onClick={() => setColorTheme(name)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border-2 transition-all hover:scale-110",
                colorTheme === name ? "border-primary" : "border-transparent",
              )}
              title={colorThemes[name].label}
            >
              <span
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: themeColorPreview[name] }}
              />
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
