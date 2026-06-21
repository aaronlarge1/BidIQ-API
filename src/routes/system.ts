import { Router, Request, Response } from "express"

const router = Router()

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    status: "operational",
    version: "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      ai: process.env.ANTHROPIC_API_KEY ? "connected" : "not configured",
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
        id: "anthropic-ai",
        name: "Anthropic AI",
        status: process.env.ANTHROPIC_API_KEY ? "connected" : "not configured",
        description: "AI-powered bid assistance and tender scoring",
      },
    ],
  })
})

export default router
