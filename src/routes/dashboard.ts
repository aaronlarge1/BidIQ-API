import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

router.get("/stats", async (req: AuthRequest, res: Response) => {
  if (!req.companyId) {
    res.status(403).json({ error: "Company profile required" })
    return
  }
  const id = req.companyId

  try {
    const today = new Date()
    const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [
      company,
      activeBids,
      upcomingDeadlines,
      complianceGaps,
      pipelineAgg,
      totalSubmitted,
      wonBids,
      matchedOpportunities,
      renewalsDue,
    ] = await Promise.all([
      prisma.company.findUnique({ where: { id } }),
      prisma.bid.count({
        where: {
          companyId: id,
          stage: { in: ["identified", "qualified", "bid-in-progress", "submitted", "clarification"] },
        },
      }),
      prisma.bid.count({
        where: { companyId: id, deadline: { lte: sevenDays, gte: today } },
      }),
      prisma.document.count({ where: { companyId: id, status: { in: ["expired", "missing"] } } }),
      prisma.bid.aggregate({
        where: {
          companyId: id,
          stage: { in: ["identified", "qualified", "bid-in-progress", "submitted", "clarification"] },
        },
        _sum: { value: true },
      }),
      prisma.bid.count({ where: { companyId: id, stage: { in: ["submitted", "awarded", "lost"] } } }),
      prisma.bid.count({ where: { companyId: id, stage: "awarded" } }),
      prisma.tender.count({ where: { status: "open" } }),
      prisma.contract.count({ where: { companyId: id, renewalDate: { lte: sevenDays, gte: today } } }),
    ])

    const estimatedWinRate = totalSubmitted > 0 ? Math.round((wonBids / totalSubmitted) * 100) : 0

    res.json({
      readinessScore: company?.readinessScore ?? 0,
      matchedOpportunities,
      activeBids,
      upcomingDeadlines,
      complianceGaps,
      pipelineValue: pipelineAgg._sum.value ?? 0,
      estimatedWinRate,
      renewalsDue,
    })
  } catch {
    res.status(500).json({ error: "Failed to fetch dashboard stats" })
  }
})

export default router
