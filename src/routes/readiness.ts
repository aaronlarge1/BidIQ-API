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
    const profile = await prisma.readinessProfile.findUnique({
      where: { companyId: id },
      include: { areas: true },
    })
    if (!profile) { res.status(404).json({ error: "Readiness profile not found" }); return }
    res.json(profile)
  } catch { res.status(500).json({ error: "Failed to fetch readiness profile" }) }
})

router.put("/", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const { overall, creditScore, areas } = req.body
    const profile = await prisma.readinessProfile.upsert({
      where: { companyId: id },
      create: {
        companyId: id,
        overall: overall ?? 0,
        creditScore: creditScore ?? 0,
        lastChecked: new Date(),
        areas: areas ? {
          create: areas.map((a: { name: string; status: string; score: number; issues: string[]; actions: string[] }) => ({
            name: a.name, status: a.status, score: a.score,
            issues: a.issues ?? [], actions: a.actions ?? [],
          })),
        } : undefined,
      },
      update: {
        ...(overall !== undefined && { overall }),
        ...(creditScore !== undefined && { creditScore }),
        lastChecked: new Date(),
      },
      include: { areas: true },
    })

    if (overall !== undefined) {
      await prisma.company.update({ where: { id }, data: { readinessScore: overall } })
    }

    res.json(profile)
  } catch { res.status(500).json({ error: "Failed to update readiness profile" }) }
})

router.put("/areas/:areaId", async (req: AuthRequest, res: Response) => {
  const id = cid(req, res); if (!id) return
  try {
    const profile = await prisma.readinessProfile.findUnique({ where: { companyId: id } })
    if (!profile) { res.status(404).json({ error: "Readiness profile not found" }); return }

    const area = await prisma.readinessArea.findFirst({ where: { id: req.params.areaId, profileId: profile.id } })
    if (!area) { res.status(404).json({ error: "Area not found" }); return }

    const { status, score, issues, actions } = req.body
    const updated = await prisma.readinessArea.update({
      where: { id: req.params.areaId },
      data: {
        ...(status !== undefined && { status }),
        ...(score !== undefined && { score }),
        ...(issues !== undefined && { issues }),
        ...(actions !== undefined && { actions }),
      },
    })
    res.json(updated)
  } catch { res.status(500).json({ error: "Failed to update readiness area" }) }
})

export default router
