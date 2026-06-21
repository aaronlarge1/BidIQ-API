import { prisma } from "../../lib/prisma"
import { TenderSyncLog } from "@prisma/client"

export async function getLastSyncStatus(): Promise<{
  lastSync: Date | null
  sources: {
    name: string
    status: string
    imported: number
    updated: number
    lastSync: Date | null
  }[]
}> {
  try {
    const sourceNames = ["contracts-finder", "find-tender"]

    const sourceStatuses = await Promise.all(
      sourceNames.map(async (name) => {
        const log = await prisma.tenderSyncLog.findFirst({
          where: { source: name },
          orderBy: { startedAt: "desc" },
        })
        return {
          name,
          status: log?.status ?? "never-run",
          imported: log?.importedCount ?? 0,
          updated: log?.updatedCount ?? 0,
          lastSync: log?.finishedAt ?? null,
        }
      })
    )

    const lastLog = await prisma.tenderSyncLog.findFirst({
      where: { status: "success" },
      orderBy: { finishedAt: "desc" },
    })

    return {
      lastSync: lastLog?.finishedAt ?? null,
      sources: sourceStatuses,
    }
  } catch (err) {
    console.error("[getLastSyncStatus] Error:", err)
    return {
      lastSync: null,
      sources: [],
    }
  }
}

export async function getSyncLogs(limit: number = 20): Promise<TenderSyncLog[]> {
  try {
    return await prisma.tenderSyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    })
  } catch (err) {
    console.error("[getSyncLogs] Error:", err)
    return []
  }
}
