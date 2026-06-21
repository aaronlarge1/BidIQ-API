import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { type, region, search } = req.query
    const buyers = await prisma.buyer.findMany({
      where: {
        ...(type && { type: type as string }),
        ...(region && { region: region as string }),
        ...(search && {
          name: { contains: search as string, mode: "insensitive" },
        }),
      },
      include: { previousAwards: true },
      orderBy: { name: "asc" },
    })
    res.json(buyers)
  } catch { res.status(500).json({ error: "Failed to fetch buyers" }) }
})

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { id: req.params.id },
      include: { previousAwards: true },
    })
    if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return }
    res.json(buyer)
  } catch { res.status(500).json({ error: "Failed to fetch buyer" }) }
})

// Admin seed route
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, region, annualSpend, previousAwards, upcomingRenewals, knownSuppliers, nextTenderExpected } = req.body
    const buyer = await prisma.buyer.create({
      data: {
        name, type, region,
        annualSpend: annualSpend ?? 0,
        upcomingRenewals: upcomingRenewals ?? [],
        knownSuppliers: knownSuppliers ?? [],
        ...(nextTenderExpected && { nextTenderExpected: new Date(nextTenderExpected) }),
        previousAwards: previousAwards ? {
          create: previousAwards.map((a: { title: string; supplier: string; value: number; awardedDate: string; renewalDate: string }) => ({
            title: a.title, supplier: a.supplier, value: a.value,
            awardedDate: new Date(a.awardedDate), renewalDate: new Date(a.renewalDate),
          })),
        } : undefined,
      },
      include: { previousAwards: true },
    })
    res.status(201).json(buyer)
  } catch { res.status(500).json({ error: "Failed to create buyer" }) }
})

export default router
