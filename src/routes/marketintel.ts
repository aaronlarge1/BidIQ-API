import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const [
      byCategory,
      byBuyerType,
      byRegion,
      totalValue,
      openCount,
      closingSoonCount,
      avgValue,
    ] = await Promise.all([
      prisma.tender.groupBy({ by: ["category"], _count: { id: true }, _sum: { value: true } }),
      prisma.tender.groupBy({ by: ["buyerType"], _count: { id: true }, _sum: { value: true } }),
      prisma.tender.groupBy({ by: ["region"], _count: { id: true }, _sum: { value: true } }),
      prisma.tender.aggregate({ _sum: { value: true } }),
      prisma.tender.count({ where: { status: "open" } }),
      prisma.tender.count({ where: { status: "closing-soon" } }),
      prisma.tender.aggregate({ _avg: { value: true } }),
    ])

    res.json({
      overview: {
        totalActiveOpportunities: openCount + closingSoonCount,
        totalMarketValue: totalValue._sum.value ?? 0,
        averageContractValue: Math.round(avgValue._avg.value ?? 0),
        openTenders: openCount,
        closingSoon: closingSoonCount,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
        totalValue: c._sum.value ?? 0,
      })),
      byBuyerType: byBuyerType.map((b) => ({
        type: b.buyerType,
        count: b._count.id,
        totalValue: b._sum.value ?? 0,
      })),
      byRegion: byRegion.map((r) => ({
        region: r.region,
        count: r._count.id,
        totalValue: r._sum.value ?? 0,
      })),
    })
  } catch { res.status(500).json({ error: "Failed to fetch market intelligence" }) }
})

export default router
