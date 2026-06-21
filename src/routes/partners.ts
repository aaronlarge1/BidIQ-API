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
    const partners = await prisma.partner.findMany({
      where: { companyId: id },
      orderBy: { name: "asc" },
    })
    res.json(partners)
  } catch { res.status(500).json({ error: "Failed to fetch partners" }) }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { name, sector, capabilities, region, accreditations, turnover } = req.body
    const partner = await prisma.partner.create({
      data: {
        companyId: id, name, sector, region,
        capabilities: capabilities ?? [],
        accreditations: accreditations ?? [],
        turnover: turnover ?? 0,
      },
    })
    res.status(201).json(partner)
  } catch { res.status(500).json({ error: "Failed to create partner" }) }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.partner.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Partner not found" }); return }
    await prisma.partner.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch { res.status(500).json({ error: "Failed to delete partner" }) }
})

export default router
