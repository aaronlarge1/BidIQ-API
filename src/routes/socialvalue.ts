import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

function cid(req: AuthRequest, res: Response): string | null {
  if (!req.companyId) { res.status(403).json({ error: "Company profile required" }); return null }
  return req.companyId
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const activities = await prisma.socialValueActivity.findMany({
      where: { companyId: id },
      orderBy: { date: "desc" },
    })
    const summary = await prisma.socialValueActivity.groupBy({
      by: ["type"],
      where: { companyId: id },
      _count: { id: true },
      _sum: { value: true },
    })
    res.json({ activities, summary })
  } catch { res.status(500).json({ error: "Failed to fetch social value data" }) }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { type, description, date, value, unit, contractId } = req.body
    const activity = await prisma.socialValueActivity.create({
      data: {
        companyId: id, type, description,
        date: new Date(date),
        value: value ?? null,
        unit: unit ?? null,
        contractId: contractId ?? null,
      },
    })
    res.status(201).json(activity)
  } catch { res.status(500).json({ error: "Failed to create social value activity" }) }
})

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.socialValueActivity.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Activity not found" }); return }
    const { type, description, date, value, unit } = req.body
    const activity = await prisma.socialValueActivity.update({
      where: { id: req.params.id },
      data: {
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(value !== undefined && { value }),
        ...(unit !== undefined && { unit }),
      },
    })
    res.json(activity)
  } catch { res.status(500).json({ error: "Failed to update activity" }) }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.socialValueActivity.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Activity not found" }); return }
    await prisma.socialValueActivity.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch { res.status(500).json({ error: "Failed to delete activity" }) }
})

export default router
