import { isHighwaysRelated, isNationalHighways, isInfrastructureRelated } from "./nationalHighwaysMatcher"
import { inferCategory, inferBuyerType, inferRegion } from "./tenderClassifier"

export interface NormalizedTender {
  source: string
  sourceNoticeId: string
  sourceUrl: string
  ocid?: string
  title: string
  buyer: string
  buyerType: string
  location: string
  region: string
  value: number
  valueMax?: number
  deadline: Date
  publishedDate: Date
  category: string
  type: string
  status: string
  description: string
  cpvCode?: string
  reference?: string
  socialValueWeighting?: number
  smeFlag: boolean
  requiredDocuments: string[]
  missingDocuments: string[]
  insuranceRequired: string[]
  accreditationsRequired: string[]
  isHighwaysRelated: boolean
  isNationalHighways: boolean
  isInfrastructureRelated: boolean
  isSMEFriendly: boolean
  rawJson: object
  isDemo: boolean
}

function parseDeadline(dateStr?: string): Date {
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d
  }
  // Default: 90 days from now
  const fallback = new Date()
  fallback.setDate(fallback.getDate() + 90)
  return fallback
}

function parseValue(valueObj?: { amount?: number; currency?: string }): number {
  return valueObj?.amount ?? 0
}

function extractCpvCode(tender: any): string | undefined {
  const items: any[] = tender?.items ?? []
  if (items.length > 0) {
    const classification = items[0]?.classification
    if (classification?.id) return classification.id
  }
  const additional: any[] = tender?.additionalClassifications ?? []
  if (additional.length > 0) return additional[0]?.id
  return undefined
}

function extractDocuments(tender: any): string[] {
  const docs: any[] = tender?.documents ?? []
  return docs.filter((d) => d?.url).map((d) => d.documentType ?? "document")
}

function extractLocation(buyer: any, release: any): { location: string; region: string } {
  const address = buyer?.address ?? release?.buyer?.address ?? {}
  const region = address?.region ?? address?.locality ?? address?.countryName ?? ""
  const location = [address?.streetAddress, address?.locality, address?.region, address?.postalCode]
    .filter(Boolean)
    .join(", ") || region || "United Kingdom"
  return {
    location: location || "United Kingdom",
    region: inferRegion(region, address?.postalCode),
  }
}

function isSMEFriendly(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase()
  return text.includes("sme") || text.includes("small business") || text.includes("small company")
}

function mapStatus(tenderStatus: string, tag?: string[]): string {
  if (tag?.includes("award")) return "awarded"
  if (tag?.includes("planning")) return "pipeline"
  switch (tenderStatus) {
    case "active":
    case "open":
      return "open"
    case "complete":
    case "cancelled":
    case "unsuccessful":
      return "closed"
    default:
      return "open"
  }
}

export function normalizeContractsFinderRelease(release: any, noticeUrl: string): NormalizedTender | null {
  try {
    const tender = release?.tender
    if (!tender?.title) return null

    const title: string = tender.title ?? ""
    const description: string = tender.description ?? ""
    const searchText = `${title} ${description}`

    const buyer = release?.buyer ?? release?.tender?.procuringEntity ?? {}
    const buyerName: string = buyer.name ?? "Unknown Buyer"

    const { location, region } = extractLocation(buyer, release)
    const cpvCode = extractCpvCode(tender)
    const sourceNoticeId: string = tender.id ?? release.ocid ?? ""

    const value = parseValue(tender.value)
    const valueMax = tender.maxValue?.amount ?? undefined

    const deadline = parseDeadline(tender.tenderPeriod?.endDate)
    const publishedDate = release.date ? new Date(release.date) : new Date()

    const buyerType = inferBuyerType(buyerName)
    const category = inferCategory(title, description, cpvCode)
    const status = mapStatus(tender.status ?? "active", release.tag)

    const smeFlag = isSMEFriendly(title, description)

    return {
      source: "contracts-finder",
      sourceNoticeId,
      sourceUrl: noticeUrl,
      ocid: release.ocid,
      title,
      buyer: buyerName,
      buyerType,
      location,
      region,
      value,
      valueMax,
      deadline,
      publishedDate,
      category,
      type: tender.procurementMethod ?? "open",
      status,
      description,
      cpvCode,
      reference: tender.id,
      socialValueWeighting: undefined,
      smeFlag,
      requiredDocuments: extractDocuments(tender),
      missingDocuments: [],
      insuranceRequired: [],
      accreditationsRequired: [],
      isHighwaysRelated: isHighwaysRelated(searchText),
      isNationalHighways: isNationalHighways(searchText + " " + buyerName),
      isInfrastructureRelated: isInfrastructureRelated(searchText),
      isSMEFriendly: smeFlag,
      rawJson: release,
      isDemo: false,
    }
  } catch (err) {
    console.error("[normalizeContractsFinderRelease] Error:", err)
    return null
  }
}

export function normalizeFindTenderRelease(release: any): NormalizedTender | null {
  try {
    const tender = release?.tender
    if (!tender?.title) return null

    const title: string = tender.title ?? ""
    const description: string = tender.description ?? ""
    const searchText = `${title} ${description}`

    const buyer = release?.buyer ?? release?.tender?.procuringEntity ?? {}
    const buyerName: string = buyer.name ?? "Unknown Buyer"

    const { location, region } = extractLocation(buyer, release)
    const cpvCode = extractCpvCode(tender)
    const sourceNoticeId: string = tender.id ?? release.ocid ?? ""

    const value = parseValue(tender.value)
    const valueMax = tender.maxValue?.amount ?? undefined

    const deadline = parseDeadline(tender.tenderPeriod?.endDate)
    const publishedDate = release.date ? new Date(release.date) : new Date()

    const buyerType = inferBuyerType(buyerName)
    const category = inferCategory(title, description, cpvCode)
    const status = mapStatus(tender.status ?? "active", release.tag)

    const smeFlag = isSMEFriendly(title, description)

    const noticeId = tender.id ?? release.ocid ?? ""
    const sourceUrl = `https://www.find-tender.service.gov.uk/Notice/${noticeId}`

    return {
      source: "find-tender",
      sourceNoticeId,
      sourceUrl,
      ocid: release.ocid,
      title,
      buyer: buyerName,
      buyerType,
      location,
      region,
      value,
      valueMax,
      deadline,
      publishedDate,
      category,
      type: tender.procurementMethod ?? "open",
      status,
      description,
      cpvCode,
      reference: tender.id,
      socialValueWeighting: undefined,
      smeFlag,
      requiredDocuments: extractDocuments(tender),
      missingDocuments: [],
      insuranceRequired: [],
      accreditationsRequired: [],
      isHighwaysRelated: isHighwaysRelated(searchText),
      isNationalHighways: isNationalHighways(searchText + " " + buyerName),
      isInfrastructureRelated: isInfrastructureRelated(searchText),
      isSMEFriendly: smeFlag,
      rawJson: release,
      isDemo: false,
    }
  } catch (err) {
    console.error("[normalizeFindTenderRelease] Error:", err)
    return null
  }
}
