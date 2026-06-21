import { Router, Request, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, region, recommendation, search, page = "1", limit = "20" } = req.query

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category
    if (region) where.region = region
    if (recommendation) where.recommendation = recommendation
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { buyer: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const [tenders, total] = await Promise.all([
      prisma.tender.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { deadline: "asc" },
      }),
      prisma.tender.count({ where }),
    ])

    res.json({ tenders, total, page: parseInt(page as string), limit: parseInt(limit as string) })
  } catch {
    res.status(500).json({ error: "Failed to fetch tenders" })
  }
})

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.params.id } })
    if (!tender) {
      res.status(404).json({ error: "Tender not found" })
      return
    }
    res.json(tender)
  } catch {
    res.status(500).json({ error: "Failed to fetch tender" })
  }
})

// Admin-only: seed tenders (no company check, just auth)
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body
    const tender = await prisma.tender.create({
      data: {
        ...data,
        deadline: new Date(data.deadline),
        publishedDate: new Date(data.publishedDate),
        requiredDocuments: data.requiredDocuments ?? [],
        missingDocuments: data.missingDocuments ?? [],
        insuranceRequired: data.insuranceRequired ?? [],
        accreditationsRequired: data.accreditationsRequired ?? [],
      },
    })
    res.status(201).json(tender)
  } catch {
    res.status(500).json({ error: "Failed to create tender" })
  }
})

export default router
