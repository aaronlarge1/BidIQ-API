/**
 * Resilient startup: syncs schema with a timeout, then always starts the server.
 * If prisma db push hangs or fails on Render, the server still launches.
 */
const { spawnSync } = require("child_process")
const path = require("path")

console.log("[startup] BidIQ API initialising...")
console.log("[startup] NODE_ENV:", process.env.NODE_ENV ?? "development")
console.log("[startup] PORT:", process.env.PORT ?? "3001")
console.log("[startup] DATABASE_URL set:", !!process.env.DATABASE_URL)

const isWin = process.platform === "win32"
const prismaBin = path.join(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  isWin ? "prisma.cmd" : "prisma"
)

console.log("[startup] Syncing database schema (timeout: 45s)...")
const sync = spawnSync(prismaBin, ["db", "push", "--skip-generate"], {
  stdio: "inherit",
  timeout: 45_000,
})

if (sync.error) {
  console.error("[startup] Schema sync error:", sync.error.message)
  console.warn("[startup] Continuing without schema sync")
} else if (sync.status !== 0) {
  console.error("[startup] Schema sync exited with status:", sync.status)
  console.warn("[startup] Continuing without schema sync")
} else {
  console.log("[startup] Schema sync complete")
}

console.log("[startup] Starting server...")
require(path.join(__dirname, "..", "dist", "index.js"))
