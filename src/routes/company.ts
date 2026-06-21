import { Router, Response } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const company = await prisma.company.findUnique({ where: { userId: req.userId } })
    if (!company) {
      res.status(404).json({ error: "Company profile not found" })
      return
    }
    res.json(company)
  } catch {
    res.status(500).json({ error: "Failed to fetch company" })
  }
})

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.company.findUnique({ where: { userId: req.userId } })
    if (existing) {
      res.status(409).json({ error: "Company profile already exists — use PUT to update" })
      return
    }

    const {
      name, sector, services, turnover, employees, regions,
      insurance, policies, accreditations, previousPublicSectorWork,
      preferredContractValue, interests,
    } = req.body

    const company = await prisma.company.create({
      data: {
        userId: req.userId!,
        name, sector,
        services: services ?? [],
        turnover: turnover ?? 0,
        employees: employees ?? 0,
        regions: regions ?? [],
        insurance: insurance ?? [],
        policies: policies ?? [],
        accreditations: accreditations ?? [],
        previousPublicSectorWork: previousPublicSectorWork ?? false,
        preferredContractValue: preferredContractValue ?? "100k-500k",
        interests: interests ?? [],
      },
    })

    const token = jwt.sign(
      { userId: req.userId, companyId: company.id },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    )

    res.status(201).json({ company, token })
  } catch {
    res.status(500).json({ error: "Failed to create company" })
  }
})

router.put("/", async (req: AuthRequest, res: Response) => {
  try {
    const company = await prisma.company.findUnique({ where: { userId: req.userId } })
    if (!company) {
      res.status(404).json({ error: "Company not found" })
      return
    }

    const {
      name, sector, services, turnover, employees, regions,
      insurance, policies, accreditations, previousPublicSectorWork,
      preferredContractValue, interests, readinessScore,
    } = req.body

    const updated = await prisma.company.update({
      where: { userId: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(sector !== undefined && { sector }),
        ...(services !== undefined && { services }),
        ...(turnover !== undefined && { turnover }),
        ...(employees !== undefined && { employees }),
        ...(regions !== undefined && { regions }),
        ...(insurance !== undefined && { insurance }),
        ...(policies !== undefined && { policies }),
        ...(accreditations !== undefined && { accreditations }),
        ...(previousPublicSectorWork !== undefined && { previousPublicSectorWork }),
        ...(preferredContractValue !== undefined && { preferredContractValue }),
        ...(interests !== undefined && { interests }),
        ...(readinessScore !== undefined && { readinessScore }),
      },
    })

    res.json(updated)
  } catch {
    res.status(500).json({ error: "Failed to update company" })
  }
})

export default router
