import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const googleClient = new OAuth2Client()

const router = Router()

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: "Email already registered" })
      return
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, password: hashed, name } })

    const token = jwt.sign(
      { userId: user.id, companyId: null },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    )

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: "Registration failed" })
  }
})

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" })
      return
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    })
    if (!user || !user.password) {
      const hint = user?.googleId ? " This account uses Google Sign-In." : ""
      res.status(401).json({ error: `Invalid credentials.${hint}` })
      return
    }
    if (!(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Invalid credentials" })
      return
    }

    const token = jwt.sign(
      { userId: user.id, companyId: user.company?.id ?? null },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      hasCompany: !!user.company,
    })
  } catch {
    res.status(500).json({ error: "Login failed" })
  }
})

router.post("/google", async (req: Request, res: Response) => {
  const { credential } = req.body
  if (!credential) {
    res.status(400).json({ error: "Google credential required" })
    return
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(503).json({ error: "Google OAuth not configured" })
    return
  }

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload?.email) {
      res.status(400).json({ error: "Invalid Google token" })
      return
    }

    const { email, name, sub: googleId } = payload

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { company: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: { email, name: name ?? email.split("@")[0], googleId },
        include: { company: true },
      })
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
        include: { company: true },
      })
    }

    const token = jwt.sign(
      { userId: user.id, companyId: (user as typeof user & { company: { id: string } | null }).company?.id ?? null },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      hasCompany: !!(user as typeof user & { company: { id: string } | null }).company,
    })
  } catch (err) {
    console.error("[GoogleAuth]", err)
    res.status(401).json({ error: "Google authentication failed" })
  }
})

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { company: true },
      omit: { password: true },
    })
    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }
    res.json(user)
  } catch {
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

export default router
