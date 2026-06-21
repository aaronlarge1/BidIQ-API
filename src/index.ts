import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import { rateLimit } from "express-rate-limit"
import dotenv from "dotenv"

import authRoutes from "./routes/auth"
import companyRoutes from "./routes/company"
import readinessRoutes from "./routes/readiness"
import tenderRoutes from "./routes/tenders"
import bidRoutes from "./routes/bids"
import contractRoutes from "./routes/contracts"
import documentRoutes from "./routes/documents"
import evidenceRoutes from "./routes/evidence"
import financeRoutes from "./routes/finance"
import partnerRoutes from "./routes/partners"
import buyerRoutes from "./routes/buyers"
import calendarRoutes from "./routes/calendar"
import dashboardRoutes from "./routes/dashboard"
import socialValueRoutes from "./routes/socialvalue"
import marketIntelRoutes from "./routes/marketintel"
import aiAssistRoutes from "./routes/aiassist"
import { errorHandler } from "./middleware/errorHandler"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173"

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:4173"],
    credentials: true,
  })
)
app.use(compression())

// ── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })

app.use(globalLimiter)
app.use(express.json({ limit: "5mb" }))

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes)
app.use("/api/company", companyRoutes)
app.use("/api/readiness", readinessRoutes)
app.use("/api/tenders", tenderRoutes)
app.use("/api/bids", bidRoutes)
app.use("/api/contracts", contractRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/evidence", evidenceRoutes)
app.use("/api/finance", financeRoutes)
app.use("/api/partners", partnerRoutes)
app.use("/api/buyers", buyerRoutes)
app.use("/api/calendar", calendarRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/social-value", socialValueRoutes)
app.use("/api/market-intel", marketIntelRoutes)
app.use("/api/ai", aiLimiter, aiAssistRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`BidIQ API running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`)
})
