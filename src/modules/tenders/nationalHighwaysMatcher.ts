export const HIGHWAYS_KEYWORDS = [
  "national highways",
  "highways agency",
  "highways maintenance",
  "road maintenance",
  "road resurfacing",
  "carriageway",
  "footway",
  "traffic management",
  "traffic control",
  "road safety",
  "bridge works",
  "drainage",
  "street lighting",
  "winter maintenance",
  "de-icing",
  "pothole",
  "highways framework",
  "civil engineering",
  "infrastructure",
  "surfacing",
  "barriers",
  "signage",
  "roadworks",
  "public infrastructure",
  "transport infrastructure",
]

const NATIONAL_HIGHWAYS_KEYWORDS = ["national highways", "highways england", "national highways limited"]

const INFRASTRUCTURE_KEYWORDS = [
  "infrastructure",
  "civil engineering",
  "public infrastructure",
  "transport infrastructure",
  "utilities",
  "water infrastructure",
  "railway",
  "rail infrastructure",
  "construction",
  "major works",
]

function lowerText(text: string): string {
  return text.toLowerCase()
}

export function isHighwaysRelated(text: string): boolean {
  const lower = lowerText(text)
  return HIGHWAYS_KEYWORDS.some((kw) => lower.includes(kw))
}

export function isNationalHighways(text: string): boolean {
  const lower = lowerText(text)
  return NATIONAL_HIGHWAYS_KEYWORDS.some((kw) => lower.includes(kw))
}

export function isInfrastructureRelated(text: string): boolean {
  const lower = lowerText(text)
  return INFRASTRUCTURE_KEYWORDS.some((kw) => lower.includes(kw))
}
