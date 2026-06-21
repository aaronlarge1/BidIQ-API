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
    const contracts = await prisma.contract.findMany({
      where: { companyId: id },
      include: { milestones: true, kpis: true, paymentSchedule: true, risks: true },
      orderBy: { endDate: "asc" },
    })
    res.json(contracts)
  } catch { res.status(500).json({ error: "Failed to fetch contracts" }) }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { title, buyer, value, startDate, endDate, renewalDate, milestones, kpis, paymentSchedule, risks } = req.body
    const contract = await prisma.contract.create({
      data: {
        companyId: id, title, buyer, value,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalDate: new Date(renewalDate),
        milestones: milestones ? {
          create: milestones.map((m: { title: string; dueDate: string; status?: string; value?: number }) => ({
            title: m.title, dueDate: new Date(m.dueDate), status: m.status ?? "pending", value: m.value,
          })),
        } : undefined,
        kpis: kpis ? {
          create: kpis.map((k: { name: string; target: number; current?: number; unit: string; status?: string }) => ({
            name: k.name, target: k.target, current: k.current ?? 0, unit: k.unit, status: k.status ?? "green",
          })),
        } : undefined,
        paymentSchedule: paymentSchedule ? {
          create: paymentSchedule.map((p: { description: string; amount: number; dueDate: string; status?: string }) => ({
            description: p.description, amount: p.amount, dueDate: new Date(p.dueDate), status: p.status ?? "pending",
          })),
        } : undefined,
        risks: risks ? {
          create: risks.map((r: { description: string; likelihood: string; impact: string; mitigation: string }) => ({
            description: r.description, likelihood: r.likelihood, impact: r.impact, mitigation: r.mitigation,
          })),
        } : undefined,
      },
      include: { milestones: true, kpis: true, paymentSchedule: true, risks: true },
    })
    res.status(201).json(contract)
  } catch { res.status(500).json({ error: "Failed to create contract" }) }
})

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, companyId: id },
      include: { milestones: true, kpis: true, paymentSchedule: true, risks: true },
    })
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return }
    res.json(contract)
  } catch { res.status(500).json({ error: "Failed to fetch contract" }) }
})

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const existing = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return }
    const { title, buyer, value, startDate, endDate, renewalDate } = req.body
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(buyer !== undefined && { buyer }),
        ...(value !== undefined && { value }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(renewalDate !== undefined && { renewalDate: new Date(renewalDate) }),
      },
      include: { milestones: true, kpis: true, paymentSchedule: true, risks: true },
    })
    res.json(contract)
  } catch { res.status(500).json({ error: "Failed to update contract" }) }
})

// Milestone update
router.put("/:id/milestones/:mid", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const contract = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return }
    const { status } = req.body
    const milestone = await prisma.milestone.update({ where: { id: req.params.mid }, data: { status } })
    res.json(milestone)
  } catch { res.status(500).json({ error: "Failed to update milestone" }) }
})

// KPI update
router.put("/:id/kpis/:kid", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const contract = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return }
    const { current, status } = req.body
    const kpi = await prisma.kPI.update({
      where: { id: req.params.kid },
      data: {
        ...(current !== undefined && { current }),
        ...(status !== undefined && { status }),
      },
    })
    res.json(kpi)
  } catch { res.status(500).json({ error: "Failed to update KPI" }) }
})

// Payment update
router.put("/:id/payments/:pid", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const contract = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: id } })
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return }
    const { status } = req.body
    const payment = await prisma.payment.update({ where: { id: req.params.pid }, data: { status } })
    res.json(payment)
  } catch { res.status(500).json({ error: "Failed to update payment" }) }
})

export default router
