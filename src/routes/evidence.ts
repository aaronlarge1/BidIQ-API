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
    const evidence = await prisma.evidence.findMany({
      where: { companyId: id },
      orderBy: { date: "desc" },
    })
    res.json(evidence)
  } catch { res.status(500).json({ error: "Failed to fetch evidence" }) }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { contractId, title, type, date, description } = req.body
    const ev = await prisma.evidence.create({
      data: {
        companyId: id,
        contractId,
        title, type,
        date: new Date(date),
        description,
      },
    })
    res.status(201).json(ev)
  } catch { res.status(500).json({ error: "Failed to create evidence" }) }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.evidence.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Evidence not found" }); return }
    await prisma.evidence.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch { res.status(500).json({ error: "Failed to delete evidence" }) }
})

export default router
