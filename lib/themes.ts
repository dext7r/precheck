export const colorThemes = {
  zinc: {
    name: "Zinc",
    label: "Default",
    light: {
      primary: "oklch(0.205 0 0)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.708 0 0)",
    },
    dark: {
      primary: "oklch(0.985 0 0)",
      primaryForeground: "oklch(0.205 0 0)",
      ring: "oklch(0.439 0 0)",
    },
  },
  blue: {
    name: "Blue",
    label: "Blue",
    light: {
      primary: "oklch(0.546 0.245 262.881)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.546 0.245 262.881)",
    },
    dark: {
      primary: "oklch(0.546 0.245 262.881)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.546 0.245 262.881)",
    },
  },
  green: {
    name: "Green",
    label: "Green",
    light: {
      primary: "oklch(0.527 0.154 150.069)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.527 0.154 150.069)",
    },
    dark: {
      primary: "oklch(0.527 0.154 150.069)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.527 0.154 150.069)",
    },
  },
  orange: {
    name: "Orange",
    label: "Orange",
    light: {
      primary: "oklch(0.705 0.191 47.604)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.705 0.191 47.604)",
    },
    dark: {
      primary: "oklch(0.705 0.191 47.604)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.705 0.191 47.604)",
    },
  },
  red: {
    name: "Red",
    label: "Red",
    light: {
      primary: "oklch(0.577 0.245 27.325)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.577 0.245 27.325)",
    },
    dark: {
      primary: "oklch(0.577 0.245 27.325)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.577 0.245 27.325)",
    },
  },
  rose: {
    name: "Rose",
    label: "Rose",
    light: {
      primary: "oklch(0.645 0.246 16.439)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.645 0.246 16.439)",
    },
    dark: {
      primary: "oklch(0.645 0.246 16.439)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.645 0.246 16.439)",
    },
  },
  violet: {
    name: "Violet",
    label: "Violet",
    light: {
      primary: "oklch(0.606 0.25 292.717)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.606 0.25 292.717)",
    },
    dark: {
      primary: "oklch(0.606 0.25 292.717)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.606 0.25 292.717)",
    },
  },
  yellow: {
    name: "Yellow",
    label: "Yellow",
    light: {
      primary: "oklch(0.795 0.184 86.047)",
      primaryForeground: "oklch(0.205 0 0)",
      ring: "oklch(0.795 0.184 86.047)",
    },
    dark: {
      primary: "oklch(0.795 0.184 86.047)",
      primaryForeground: "oklch(0.205 0 0)",
      ring: "oklch(0.795 0.184 86.047)",
    },
  },
} as const

export type ColorTheme = keyof typeof colorThemes
export const colorThemeNames = Object.keys(colorThemes) as ColorTheme[]

// 每周 7 天的默认色彩序列，避免默认颜色重复
export const weeklyColorThemeSequence: ColorTheme[] = [
  "blue", // Sunday
  "green", // Monday
  "orange", // Tuesday
  "red", // Wednesday
  "rose", // Thursday
  "violet", // Friday
  "yellow", // Saturday
]

export function getDailyColorTheme(date = new Date()): ColorTheme {
  const index = date.getDay() % weeklyColorThemeSequence.length
  return weeklyColorThemeSequence[index]
}
