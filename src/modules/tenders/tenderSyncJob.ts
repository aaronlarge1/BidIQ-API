import { prisma } from "../../lib/prisma"
import { fetchContractsFinderTenders, getContractsFinderNoticeUrl } from "./contractsFinderClient"
import { fetchFindTenderNotices } from "./findTenderClient"
import {
  normalizeContractsFinderRelease,
  normalizeFindTenderRelease,
  NormalizedTender,
} from "./tenderNormalizer"
import { findExistingTender } from "./tenderDeduper"

export interface SyncResult {
  source: string
  imported: number
  updated: number
  failed: number
  errors: string[]
}

async function upsertTender(normalized: NormalizedTender): Promise<"created" | "updated" | "failed"> {
  try {
    const existingId = await findExistingTender(prisma, normalized)

    const data = {
      title: normalized.title,
      buyer: normalized.buyer,
      buyerType: normalized.buyerType,
      location: normalized.location,
      region: normalized.region,
      value: normalized.value,
      valueMax: normalized.valueMax,
      deadline: normalized.deadline,
      publishedDate: normalized.publishedDate,
      category: normalized.category,
      type: normalized.type,
      status: normalized.status,
      description: normalized.description,
      cpvCode: normalized.cpvCode,
      reference: normalized.reference,
      socialValueWeighting: normalized.socialValueWeighting,
      smeFlag: normalized.smeFlag,
      requiredDocuments: normalized.requiredDocuments,
      missingDocuments: normalized.missingDocuments,
      insuranceRequired: normalized.insuranceRequired,
      accreditationsRequired: normalized.accreditationsRequired,
      source: normalized.source,
      sourceNoticeId: normalized.sourceNoticeId,
      sourceUrl: normalized.sourceUrl,
      ocid: normalized.ocid,
      isHighwaysRelated: normalized.isHighwaysRelated,
      isNationalHighways: normalized.isNationalHighways,
      isInfrastructureRelated: normalized.isInfrastructureRelated,
      isSMEFriendly: normalized.isSMEFriendly,
      rawJson: normalized.rawJson,
      isDemo: normalized.isDemo,
      lastSyncedAt: new Date(),
      keyRequirements: [],
    }

    if (existingId) {
      await prisma.tender.update({ where: { id: existingId }, data })
      return "updated"
    } else {
      await prisma.tender.create({ data })
      return "created"
    }
  } catch (err) {
    console.error("[upsertTender] Error:", err)
    return "failed"
  }
}

async function markStaleTenders(): Promise<void> {
  try {
    const now = new Date()
    await prisma.tender.updateMany({
      where: {
        deadline: { lt: now },
        status: "open",
        source: { not: "demo" },
      },
      data: { status: "closed" },
    })
  } catch (err) {
    console.error("[markStaleTenders] Error:", err)
  }
}

export async function syncFromContractsFinder(daysBack: number): Promise<SyncResult> {
  const result: SyncResult = { source: "contracts-finder", imported: 0, updated: 0, failed: 0, errors: [] }

  const log = await prisma.tenderSyncLog.create({
    data: { source: "contracts-finder", status: "running" },
  }).catch(() => null)

  try {
    const releases = await fetchContractsFinderTenders(daysBack)
    console.log(`[ContractsFinder] Processing ${releases.length} releases`)

    for (const release of releases) {
      try {
        const noticeUrl = getContractsFinderNoticeUrl(release)
        const normalized = normalizeContractsFinderRelease(release, noticeUrl)
        if (!normalized) {
          result.failed++
          continue
        }

        const outcome = await upsertTender(normalized)
        if (outcome === "created") result.imported++
        else if (outcome === "updated") result.updated++
        else {
          result.failed++
          result.errors.push(`Failed to upsert: ${normalized.title}`)
        }
      } catch (err) {
        result.failed++
        result.errors.push(String(err))
      }
    }
  } catch (err) {
    const msg = String(err)
    result.errors.push(msg)
    console.error("[syncFromContractsFinder] Fatal error:", err)
    if (log) {
      await prisma.tenderSyncLog.update({
        where: { id: log.id },
        data: { status: "error", finishedAt: new Date(), errorMessage: msg },
      }).catch(() => null)
    }
    return result
  }

  if (log) {
    await prisma.tenderSyncLog.update({
      where: { id: log.id },
      data: {
        status: result.failed > 0 && result.imported === 0 && result.updated === 0 ? "error" : "success",
        finishedAt: new Date(),
        importedCount: result.imported,
        updatedCount: result.updated,
        failedCount: result.failed,
        errorMessage: result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null,
      },
    }).catch(() => null)
  }

  console.log(`[ContractsFinder] Done: ${result.imported} new, ${result.updated} updated, ${result.failed} failed`)
  return result
}

export async function syncFromFindTender(daysBack: number): Promise<SyncResult> {
  const result: SyncResult = { source: "find-tender", imported: 0, updated: 0, failed: 0, errors: [] }

  const log = await prisma.tenderSyncLog.create({
    data: { source: "find-tender", status: "running" },
  }).catch(() => null)

  try {
    const releases = await fetchFindTenderNotices(daysBack)
    console.log(`[FindTender] Processing ${releases.length} releases`)

    for (const release of releases) {
      try {
        const normalized = normalizeFindTenderRelease(release)
        if (!normalized) {
          result.failed++
          continue
        }

        const outcome = await upsertTender(normalized)
        if (outcome === "created") result.imported++
        else if (outcome === "updated") result.updated++
        else {
          result.failed++
          result.errors.push(`Failed to upsert: ${normalized.title}`)
        }
      } catch (err) {
        result.failed++
        result.errors.push(String(err))
      }
    }
  } catch (err) {
    const msg = String(err)
    result.errors.push(msg)
    console.error("[syncFromFindTender] Fatal error:", err)
    if (log) {
      await prisma.tenderSyncLog.update({
        where: { id: log.id },
        data: { status: "error", finishedAt: new Date(), errorMessage: msg },
      }).catch(() => null)
    }
    return result
  }

  if (log) {
    await prisma.tenderSyncLog.update({
      where: { id: log.id },
      data: {
        status: result.failed > 0 && result.imported === 0 && result.updated === 0 ? "error" : "success",
        finishedAt: new Date(),
        importedCount: result.imported,
        updatedCount: result.updated,
        failedCount: result.failed,
        errorMessage: result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null,
      },
    }).catch(() => null)
  }

  console.log(`[FindTender] Done: ${result.imported} new, ${result.updated} updated, ${result.failed} failed`)
  return result
}

export async function runTenderSync(options?: { daysBack?: number }): Promise<SyncResult[]> {
  const daysBack = options?.daysBack ?? 3
  const results: SyncResult[] = []

  const contractsFinderEnabled = process.env.CONTRACTS_FINDER_ENABLED !== "false"
  const findTenderEnabled = process.env.FIND_TENDER_ENABLED !== "false"

  console.log(`[TenderSync] Starting sync (daysBack=${daysBack})`)

  if (contractsFinderEnabled) {
    const result = await syncFromContractsFinder(daysBack)
    results.push(result)
  } else {
    console.log("[TenderSync] Contracts Finder disabled via CONTRACTS_FINDER_ENABLED=false")
  }

  if (findTenderEnabled) {
    const result = await syncFromFindTender(daysBack)
    results.push(result)
  } else {
    console.log("[TenderSync] Find a Tender disabled via FIND_TENDER_ENABLED=false")
  }

  // Mark stale tenders
  await markStaleTenders()

  const totalImported = results.reduce((s, r) => s + r.imported, 0)
  const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
  const totalFailed = results.reduce((s, r) => s + r.failed, 0)

  console.log(
    `[TenderSync] Complete: ${totalImported} new, ${totalUpdated} updated, ${totalFailed} failed across ${results.length} source(s)`
  )

  return results
}
