import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

function companyId(req: AuthRequest, res: Response): string | null {
  if (!req.companyId) {
    res.status(403).json({ error: "Company profile required" })
    return null
  }
  return req.companyId
}

// ── Bids ─────────────────────────────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const bids = await prisma.bid.findMany({
      where: { companyId: cid },
      orderBy: { deadline: "asc" },
    })
    res.json(bids)
  } catch {
    res.status(500).json({ error: "Failed to fetch bids" })
  }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const { tenderId, tenderTitle, buyer, value, deadline, stage, notes, assignedTo, probability } = req.body
    const bid = await prisma.bid.create({
      data: {
        companyId: cid,
        tenderId,
        tenderTitle,
        buyer,
        value,
        deadline: new Date(deadline),
        stage: stage ?? "identified",
        notes: notes ?? "",
        assignedTo: assignedTo ?? "",
        probability: probability ?? 0,
      },
    })
    res.status(201).json(bid)
  } catch {
    res.status(500).json({ error: "Failed to create bid" })
  }
})

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const bid = await prisma.bid.findFirst({
      where: { id: req.params.id, companyId: cid },
      include: { questions: true },
    })
    if (!bid) {
      res.status(404).json({ error: "Bid not found" })
      return
    }
    res.json(bid)
  } catch {
    res.status(500).json({ error: "Failed to fetch bid" })
  }
})

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const existing = await prisma.bid.findFirst({ where: { id: req.params.id, companyId: cid } })
    if (!existing) {
      res.status(404).json({ error: "Bid not found" })
      return
    }
    const { stage, score, submittedDate, awardedDate, notes, assignedTo, probability } = req.body
    const bid = await prisma.bid.update({
      where: { id: req.params.id },
      data: {
        ...(stage !== undefined && { stage }),
        ...(score !== undefined && { score }),
        ...(submittedDate !== undefined && { submittedDate: new Date(submittedDate) }),
        ...(awardedDate !== undefined && { awardedDate: new Date(awardedDate) }),
        ...(notes !== undefined && { notes }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(probability !== undefined && { probability }),
      },
    })
    res.json(bid)
  } catch {
    res.status(500).json({ error: "Failed to update bid" })
  }
})

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const existing = await prisma.bid.findFirst({ where: { id: req.params.id, companyId: cid } })
    if (!existing) {
      res.status(404).json({ error: "Bid not found" })
      return
    }
    await prisma.bid.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch {
    res.status(500).json({ error: "Failed to delete bid" })
  }
})

// ── Bid Questions ─────────────────────────────────────────────────────────────

router.get("/:id/questions", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const bid = await prisma.bid.findFirst({ where: { id: req.params.id, companyId: cid } })
    if (!bid) {
      res.status(404).json({ error: "Bid not found" })
      return
    }
    const questions = await prisma.bidQuestion.findMany({ where: { bidId: req.params.id } })
    res.json(questions)
  } catch {
    res.status(500).json({ error: "Failed to fetch questions" })
  }
})

router.post("/:id/questions", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const bid = await prisma.bid.findFirst({ where: { id: req.params.id, companyId: cid } })
    if (!bid) {
      res.status(404).json({ error: "Bid not found" })
      return
    }
    const { section, question, wordLimit, answer, suggestions, status } = req.body
    const q = await prisma.bidQuestion.create({
      data: {
        bidId: req.params.id,
        section,
        question,
        wordLimit,
        answer: answer ?? "",
        suggestions: suggestions ?? [],
        status: status ?? "draft",
      },
    })
    res.status(201).json(q)
  } catch {
    res.status(500).json({ error: "Failed to create question" })
  }
})

router.put("/:id/questions/:qid", async (req: AuthRequest, res: Response) => {
  const cid = companyId(req, res)
  if (!cid) return
  try {
    const bid = await prisma.bid.findFirst({ where: { id: req.params.id, companyId: cid } })
    if (!bid) {
      res.status(404).json({ error: "Bid not found" })
      return
    }
    const { answer, aiScore, suggestions, status } = req.body
    const q = await prisma.bidQuestion.update({
      where: { id: req.params.qid },
      data: {
        ...(answer !== undefined && { answer }),
        ...(aiScore !== undefined && { aiScore }),
        ...(suggestions !== undefined && { suggestions }),
        ...(status !== undefined && { status }),
      },
    })
    res.json(q)
  } catch {
    res.status(500).json({ error: "Failed to update question" })
  }
})

export default router
