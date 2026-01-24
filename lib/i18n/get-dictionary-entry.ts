import type { Dictionary } from "./get-dictionary"

export function getDictionaryEntry(
  dict: Dictionary | Record<string, unknown> | null | undefined,
  path: string | undefined,
): string | undefined {
  if (!dict || !path) {
    return undefined
  }

  const segments = path.split(".")
  let current: unknown = dict

  for (const segment of segments) {
    if (typeof current !== "object" || current === null) {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === "string" ? current : undefined
}
