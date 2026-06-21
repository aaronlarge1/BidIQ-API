import { PrismaClient } from "@prisma/client"
import { NormalizedTender } from "./tenderNormalizer"

/**
 * Find an existing tender in the database using multiple deduplication strategies.
 * Returns the existing tender ID if found, null if this is a new tender.
 */
export async function findExistingTender(
  prisma: PrismaClient,
  normalized: NormalizedTender
): Promise<string | null> {
  // Strategy 1: source + sourceNoticeId (most reliable - unique constraint)
  if (normalized.sourceNoticeId) {
    const existing = await prisma.tender.findUnique({
      where: {
        source_sourceNoticeId: {
          source: normalized.source,
          sourceNoticeId: normalized.sourceNoticeId,
        },
      },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  // Strategy 2: OCID match
  if (normalized.ocid) {
    const existing = await prisma.tender.findFirst({
      where: { ocid: normalized.ocid },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  // Strategy 3: sourceUrl match
  if (normalized.sourceUrl) {
    const existing = await prisma.tender.findFirst({
      where: { sourceUrl: normalized.sourceUrl },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  // Strategy 4: title + buyer + deadline (within 1 day)
  if (normalized.title && normalized.buyer && normalized.deadline) {
    const oneDayMs = 24 * 60 * 60 * 1000
    const deadlineFrom = new Date(normalized.deadline.getTime() - oneDayMs)
    const deadlineTo = new Date(normalized.deadline.getTime() + oneDayMs)

    const existing = await prisma.tender.findFirst({
      where: {
        title: normalized.title,
        buyer: normalized.buyer,
        deadline: {
          gte: deadlineFrom,
          lte: deadlineTo,
        },
      },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  return null
}
