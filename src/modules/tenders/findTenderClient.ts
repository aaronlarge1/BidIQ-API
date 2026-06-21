const BASE_URL = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages"

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

function getDaysAgoDate(daysBack: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d
}

export async function fetchFindTenderNotices(daysBack: number = 3): Promise<any[]> {
  const startDate = getDateString(getDaysAgoDate(daysBack))
  const endDate = getDateString(new Date())
  const allReleases: any[] = []
  let page = 1
  const size = 100

  while (true) {
    const url = `${BASE_URL}?startDate=${startDate}&endDate=${endDate}&page=${page}&size=${size}`
    try {
      console.log(`[FindTender] Fetching page ${page}: ${url}`)
      const response = await fetch(url, {
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

      if (releases.length === 0) break

      allReleases.push(...releases)
      console.log(`[FindTender] Page ${page}: got ${releases.length} releases (total: ${allReleases.length})`)

      if (releases.length < size) break

      page++

      if (page > 20) {
        console.warn("[FindTender] Hit 20-page safety cap")
        break
      }
    } catch (err) {
      console.error(`[FindTender] Error fetching page ${page}:`, err)
      break
    }
  }

  console.log(`[FindTender] Fetched ${allReleases.length} total releases`)
  return allReleases
}
