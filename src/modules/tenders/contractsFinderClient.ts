const BASE_URL = "https://www.contractsfinder.service.gov.uk/Published/Notice/OCDS"

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

function getDaysAgoDate(daysBack: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d
}

export function getContractsFinderNoticeUrl(release: any): string {
  const noticeId = release?.tender?.id ?? release?.ocid ?? ""
  return `https://www.contractsfinder.service.gov.uk/Notice/${noticeId}`
}

export async function fetchContractsFinderTenders(daysBack: number = 3): Promise<any[]> {
  const from = getDateString(getDaysAgoDate(daysBack))
  const to = getDateString(new Date())
  const allReleases: any[] = []
  let page = 1
  const size = 100

  while (true) {
    const url = `${BASE_URL}/Search?publishedFrom=${from}&publishedTo=${to}&page=${page}&size=${size}`
    try {
      console.log(`[ContractsFinder] Fetching page ${page}: ${url}`)
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "BidIQ/1.0 (procurement intelligence platform)",
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        console.error(`[ContractsFinder] HTTP ${response.status} on page ${page}`)
        break
      }

      const data = await response.json() as any
      const releases: any[] = data?.releases ?? []

      if (releases.length === 0) break

      allReleases.push(...releases)
      console.log(`[ContractsFinder] Page ${page}: got ${releases.length} releases (total: ${allReleases.length})`)

      // Stop if we got fewer than a full page
      if (releases.length < size) break

      page++

      // Safety cap: don't fetch more than 20 pages (2000 releases) per sync
      if (page > 20) {
        console.warn("[ContractsFinder] Hit 20-page safety cap")
        break
      }
    } catch (err) {
      console.error(`[ContractsFinder] Error fetching page ${page}:`, err)
      break
    }
  }

  console.log(`[ContractsFinder] Fetched ${allReleases.length} total releases`)
  return allReleases
}
