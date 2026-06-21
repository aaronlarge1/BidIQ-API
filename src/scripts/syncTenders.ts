import dotenv from "dotenv"
dotenv.config()

import { runTenderSync } from "../modules/tenders/tenderSyncJob"

async function main() {
  console.log("Starting BidIQ tender sync...")
  console.log(`Date: ${new Date().toISOString()}`)

  const results = await runTenderSync({ daysBack: 3 })

  console.log("\n=== Sync Summary ===")
  for (const result of results) {
    console.log(`\nSource: ${result.source}`)
    console.log(`  Imported: ${result.imported}`)
    console.log(`  Updated:  ${result.updated}`)
    console.log(`  Failed:   ${result.failed}`)
    if (result.errors.length > 0) {
      console.log(`  Errors:   ${result.errors.slice(0, 5).join("\n            ")}`)
    }
  }

  const totalImported = results.reduce((s, r) => s + r.imported, 0)
  const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
  const totalFailed = results.reduce((s, r) => s + r.failed, 0)

  console.log(`\nTotal: ${totalImported} new, ${totalUpdated} updated, ${totalFailed} failed`)
  console.log("Done.")

  process.exit(0)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
