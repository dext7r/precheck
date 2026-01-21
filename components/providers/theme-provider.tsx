"use client"

import type * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { colorThemes, type ColorTheme } from "@/lib/themes"

type ColorThemeContextType = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined)

export function useColorTheme() {
  const context = useContext(ColorThemeContext)
  if (!context) {
    throw new Error("useColorTheme must be used within a ThemeProvider")
  }
  return context
}

function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window === "undefined") {
      return "zinc"
    }

    const saved = localStorage.getItem("color-theme") as ColorTheme | null
    return saved && colorThemes[saved] ? saved : "zinc"
  })

  const applyColorTheme = (theme: ColorTheme) => {
    const root = document.documentElement
    const themeColors = colorThemes[theme]

    // Apply light mode colors
    root.style.setProperty("--primary-light", themeColors.light.primary)
    root.style.setProperty("--primary-foreground-light", themeColors.light.primaryForeground)
    root.style.setProperty("--ring-light", themeColors.light.ring)

    // Apply dark mode colors
    root.style.setProperty("--primary-dark", themeColors.dark.primary)
    root.style.setProperty("--primary-foreground-dark", themeColors.dark.primaryForeground)
    root.style.setProperty("--ring-dark", themeColors.dark.ring)

    // Apply to CSS variables based on current mode
    const isDark = root.classList.contains("dark")
    const colors = isDark ? themeColors.dark : themeColors.light

    root.style.setProperty("--primary", colors.primary)
    root.style.setProperty("--primary-foreground", colors.primaryForeground)
    root.style.setProperty("--ring", colors.ring)

    // Store in data attribute for CSS
    root.setAttribute("data-color-theme", theme)
  }

  useEffect(() => {
    applyColorTheme(colorTheme)
  }, [colorTheme])

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme)
    localStorage.setItem("color-theme", theme)
  }

  // Listen for dark/light mode changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          applyColorTheme(colorTheme)
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [colorTheme])

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  )
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ColorThemeProvider>{children}</ColorThemeProvider>
    </NextThemesProvider>
  )
}
