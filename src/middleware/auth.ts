import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export interface AuthRequest extends Request {
  userId?: string
  companyId?: string
}

interface JWTPayload {
  userId: string
  companyId: string | null
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    req.userId = payload.userId
    req.companyId = payload.companyId ?? undefined
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}
