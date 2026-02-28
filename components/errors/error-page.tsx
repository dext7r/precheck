import Link from "next/link"
import {
  ArrowLeft,
  Home,
  RefreshCw,
  AlertTriangle,
  Lock,
  Ban,
  FileQuestion,
  ServerCrash,
  Wrench,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

type ErrorCode = "400" | "401" | "403" | "404" | "500" | "503"

interface ErrorPageProps {
  code: ErrorCode
  dictionary: Dictionary
  locale: string
}

const errorIcons: Record<ErrorCode, typeof AlertTriangle> = {
  "400": AlertTriangle,
  "401": Lock,
  "403": Ban,
  "404": FileQuestion,
  "500": ServerCrash,
  "503": Wrench,
}

const errorColors: Record<ErrorCode, string> = {
  "400": "from-yellow-500/20 to-orange-500/20",
  "401": "from-blue-500/20 to-indigo-500/20",
  "403": "from-red-500/20 to-pink-500/20",
  "404": "from-purple-500/20 to-violet-500/20",
  "500": "from-rose-500/20 to-red-500/20",
  "503": "from-amber-500/20 to-yellow-500/20",
}

export function ErrorPage({ code, dictionary, locale }: ErrorPageProps) {
  const Icon = errorIcons[code]
  const errorData = dictionary.errors[code]
  const gradientColor = errorColors[code]
  const homeHref = `/${locale}`
  const retryHref = `/${locale}/error/${code}`
  const docsHref = `/${locale}/docs`

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Background decoration */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-50`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_70%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Error code with icon */}
        <div className="relative mb-8">
          <span className="text-[12rem] font-bold leading-none tracking-tighter text-foreground/5 sm:text-[16rem]">
            {code}
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Icon className="h-16 w-16 text-primary sm:h-20 sm:w-20" />
            </div>
          </div>
        </div>

        {/* Error message */}
        <div className="mb-8 max-w-md space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{errorData.title}</h1>
          <p className="text-lg text-muted-foreground">{errorData.description}</p>
          <p className="text-sm text-muted-foreground/70">{errorData.hint}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={homeHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Home className="h-4 w-4" />
            {dictionary.errors.backHome}
          </Link>
          <Link
            href={retryHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            {dictionary.errors.tryAgain}
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span>
            {locale === "zh" ? "或者访问" : "Or visit"}{" "}
            <Link href={docsHref} className="text-primary underline-offset-4 hover:underline">
              {dictionary.nav.docs}
            </Link>{" "}
            {locale === "zh" ? "获取帮助" : "for help"}
          </span>
        </div>
      </div>
    </div>
  )
}
