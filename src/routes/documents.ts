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
    const { category, status } = req.query
    const docs = await prisma.document.findMany({
      where: {
        companyId: id,
        ...(category && { category: category as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { uploadedDate: "desc" },
    })
    res.json(docs)
  } catch { res.status(500).json({ error: "Failed to fetch documents" }) }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { name, category, expiryDate, status, url } = req.body
    const doc = await prisma.document.create({
      data: {
        companyId: id, name, category,
        status: status ?? "valid",
        url,
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      },
    })
    res.status(201).json(doc)
  } catch { res.status(500).json({ error: "Failed to create document" }) }
})

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.document.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Document not found" }); return }
    const { name, category, expiryDate, status, url } = req.body
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(expiryDate !== undefined && { expiryDate: new Date(expiryDate) }),
        ...(status !== undefined && { status }),
        ...(url !== undefined && { url }),
      },
    })
    res.json(doc)
  } catch { res.status(500).json({ error: "Failed to update document" }) }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.document.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Document not found" }); return }
    await prisma.document.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch { res.status(500).json({ error: "Failed to delete document" }) }
})

export default router
