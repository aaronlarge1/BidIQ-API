import { Router, Response } from "express"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

router.post("/pricing/calculate", async (req: AuthRequest, res: Response) => {
  try {
    const { labour, materials, overheads, riskAllowance, desiredMargin } = req.body
    if ([labour, materials, overheads, riskAllowance, desiredMargin].some((v) => typeof v !== "number")) {
      res.status(400).json({ error: "labour, materials, overheads, riskAllowance, desiredMargin must all be numbers" })
      return
    }

    const baseCost = labour + materials + overheads
    const riskAdjusted = baseCost + riskAllowance
    const suggestedPrice = riskAdjusted / (1 - desiredMargin / 100)
    const expectedProfit = suggestedPrice - riskAdjusted
    const riskAdjustedMargin = (expectedProfit / suggestedPrice) * 100
    const isUnderpriced = desiredMargin < 10

    res.json({
      labour,
      materials,
      overheads,
      riskAllowance,
      desiredMargin,
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      expectedProfit: Math.round(expectedProfit * 100) / 100,
      riskAdjustedMargin: Math.round(riskAdjustedMargin * 100) / 100,
      isUnderpriced,
    })
  } catch {
    res.status(500).json({ error: "Calculation failed" })
  }
})

export default router
