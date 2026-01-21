export async function getCountryFromIP(ip: string | null): Promise<string | null> {
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    return null
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "Next.js App" },
      next: { revalidate: 86400 },
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.country_code || null
  } catch {
    return null
  }
}
