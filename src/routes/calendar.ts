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
    const { from, to, type } = req.query
    const events = await prisma.calendarEvent.findMany({
      where: {
        companyId: id,
        ...(type && { type: type as string }),
        ...(from || to ? {
          date: {
            ...(from && { gte: new Date(from as string) }),
            ...(to && { lte: new Date(to as string) }),
          },
        } : {}),
      },
      orderBy: { date: "asc" },
    })
    res.json(events)
  } catch { res.status(500).json({ error: "Failed to fetch calendar events" }) }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { title, date, type, tenderId, documentId } = req.body
    const event = await prisma.calendarEvent.create({
      data: {
        companyId: id, title,
        date: new Date(date),
        type,
        tenderId,
        documentId,
      },
    })
    res.status(201).json(event)
  } catch { res.status(500).json({ error: "Failed to create calendar event" }) }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Event not found" }); return }
    await prisma.calendarEvent.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch { res.status(500).json({ error: "Failed to delete event" }) }
})

export default router
