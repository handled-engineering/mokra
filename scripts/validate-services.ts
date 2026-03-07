/**
 * Validate file-based services
 *
 * Usage:
 *   npx tsx scripts/validate-services.ts           # Validate all services
 *   npx tsx scripts/validate-services.ts <slug>    # Validate specific service
 */

import { ServiceValidator, formatValidationResults } from "../src/lib/services"

async function main() {
  const args = process.argv.slice(2)
  const validator = new ServiceValidator()

  console.log("Validating services...\n")

  if (args.length > 0) {
    // Validate specific service
    const slug = args[0]
    const result = await validator.validateService(slug)

    const results = new Map([[slug, result]])
    console.log(formatValidationResults(results))

    process.exit(result.valid ? 0 : 1)
  } else {
    // Validate all services
    const results = await validator.validateAll()

    if (results.size === 0) {
      console.log("No services found in /services directory")
      console.log("\nTo get started:")
      console.log("  1. Create a service folder: mkdir -p services/my-api")
      console.log("  2. Add service.json with name, slug, and version")
      console.log("  3. Add endpoints in services/my-api/endpoints/")
      process.exit(0)
    }

    console.log(formatValidationResults(results))

    const allValid = Array.from(results.values()).every((r) => r.valid)
    process.exit(allValid ? 0 : 1)
  }
}

main().catch((error) => {
  console.error("Validation failed:", error)
  process.exit(1)
})
