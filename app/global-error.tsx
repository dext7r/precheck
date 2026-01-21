"use client"

import Link from "next/link"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            The app hit an unexpected error. You can retry or go back home.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Try again
            </button>
            <Link href="/" className="rounded-md border border-border px-4 py-2 text-foreground">
              Go home
            </Link>
          </div>
          {error?.digest && <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
