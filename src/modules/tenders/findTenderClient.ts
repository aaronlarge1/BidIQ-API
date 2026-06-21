const BASE_URL = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages"

function getISO8601(date: Date): string {
  // FTS requires ISO 8601 with timezone offset (not bare Z)
  return date.toISOString().replace(/\.\d+Z$/, "+00:00")
}

function getDaysAgoDate(daysBack: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function fetchFindTenderNotices(daysBack: number = 3): Promise<any[]> {
  const startDate = getISO8601(getDaysAgoDate(daysBack))
  const allReleases: any[] = []
  const limit = 100
  let nextUrl: string | null =
    `${BASE_URL}?updatedFrom=${encodeURIComponent(startDate)}&limit=${limit}`
  let page = 1

  while (nextUrl) {
    try {
      console.log(`[FindTender] Fetching page ${page}: ${nextUrl}`)
      const response = await fetch(nextUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "BidIQ/1.0 (procurement intelligence platform)",
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        console.error(`[FindTender] HTTP ${response.status} on page ${page}`)
        break
      }

      const data = await response.json() as any
      const releases: any[] = data?.releases ?? []

      allReleases.push(...releases)
      console.log(`[FindTender] Page ${page}: got ${releases.length} releases (total: ${allReleases.length})`)

      // Use the links.next URL for cursor-based pagination
      nextUrl = data?.links?.next ?? null

      page++

      if (page > 20) {
        console.warn("[FindTender] Hit 20-page safety cap")
        break
      }

      if (releases.length === 0) break
    } catch (err) {
      console.error(`[FindTender] Error fetching page ${page}:`, err)
      break
    }
  }

  console.log(`[FindTender] Fetched ${allReleases.length} total releases`)
  return allReleases
}
