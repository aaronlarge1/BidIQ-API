import { Router, Request, Response } from "express"
import { runTenderSync } from "../modules/tenders/tenderSyncJob"
import { getLastSyncStatus, getSyncLogs } from "../modules/tenders/tenderSyncStatus"

const router = Router()

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    status: "operational",
    version: "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      ai: process.env.OPENAI_API_KEY ? "connected" : "not configured",
    },
  })
})

router.get("/integrations", (_req: Request, res: Response) => {
  res.json({
    integrations: [
      {
        id: "find-a-tender",
        name: "Find a Tender Service",
        status: "available",
        description: "Official UK Government tender portal",
        url: "https://www.find-tender.service.gov.uk",
      },
      {
        id: "contracts-finder",
        name: "Contracts Finder",
        status: "available",
        description: "UK Government contracts finder portal",
        url: "https://www.contractsfinder.service.gov.uk",
      },
      {
        id: "openai",
        name: "OpenAI",
        status: process.env.OPENAI_API_KEY ? "connected" : "not configured",
        description: "AI-powered bid assistance and tender scoring",
      },
    ],
  })
})

// GET /api/system/tender-sync/status
router.get("/tender-sync/status", async (_req: Request, res: Response) => {
  try {
    const status = await getLastSyncStatus()
    const logs = await getSyncLogs(10)
    res.json({ ...status, recentLogs: logs })
  } catch {
    res.status(500).json({ error: "Failed to fetch sync status" })
  }
})

// POST /api/system/sync/tenders — protected by optional SYNC_SECRET_KEY header
router.post("/sync/tenders", async (req: Request, res: Response) => {
  const syncKey = process.env.SYNC_SECRET_KEY
  if (syncKey) {
    const provided = req.headers["x-sync-key"]
    if (provided !== syncKey) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
  }

  const daysBack = parseInt((req.query.daysBack as string) ?? "3", 10) || 3

  // Respond immediately, run sync in background
  res.json({ message: "Tender sync started", daysBack })

  runTenderSync({ daysBack }).catch((err) => {
    console.error("[ManualSync] Error:", err)
  })
})

export default router
