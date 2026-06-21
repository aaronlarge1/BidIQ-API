import { Router, Response } from "express"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()
router.use(requireAuth)

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: { "anthropic-beta": "prompt-caching-2024-07-31" },
  })
}

// Score and improve a bid question answer
router.post("/score-answer", async (req: AuthRequest, res: Response) => {
  const client = getClient()
  if (!client) { res.status(503).json({ error: "AI features not configured" }); return }

  const { question, answer, wordLimit, tenderTitle, buyerType } = req.body
  if (!question || !answer) { res.status(400).json({ error: "question and answer are required" }); return }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are an expert UK public sector bid evaluator. Score this bid answer and give precise improvement feedback.

Tender: ${tenderTitle ?? "Unknown"}
Buyer type: ${buyerType ?? "Unknown"}
Question: ${question}
${wordLimit ? `Word limit: ${wordLimit} words` : ""}
Answer: ${answer}

Respond with JSON only:
{
  "score": <0-100 integer>,
  "scoreLabel": "<Excellent|Good|Developing|Needs Work|Poor>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific suggestion 1>", "<specific suggestion 2>", "<specific suggestion 3>"],
  "rewrittenOpening": "<improved opening sentence>"
}`,
      }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) { res.status(500).json({ error: "AI response parsing failed" }); return }

    res.json(JSON.parse(jsonMatch[0]))
  } catch { res.status(500).json({ error: "AI scoring failed" }) }
})

// Generate a bid answer from scratch — uses prompt caching on company context
router.post("/generate-answer", async (req: AuthRequest, res: Response) => {
  const client = getClient()
  if (!client) { res.status(503).json({ error: "AI features not configured" }); return }
  if (!req.companyId) { res.status(403).json({ error: "Company profile required" }); return }

  const { question, wordLimit, tenderTitle, buyerType, bidId } = req.body
  if (!question) { res.status(400).json({ error: "question is required" }); return }

  try {
    const company = await prisma.company.findUnique({ where: { id: req.companyId } })
    const previousEvidence = bidId
      ? await prisma.evidence.findMany({ where: { companyId: req.companyId }, take: 5 })
      : []

    // System prompt is cached — stable per company, reused across all generate calls
    const systemText = `You are an expert UK public sector bid writer helping ${company?.name ?? "an SME"} win public sector contracts.

COMPANY PROFILE:
- Name: ${company?.name ?? "Unknown"}
- Sector: ${company?.sector ?? "Unknown"}
- Services: ${company?.services?.join(", ") ?? "Various"}
- Accreditations: ${company?.accreditations?.join(", ") ?? "None listed"}
- Regions active in: ${company?.regions?.join(", ") ?? "UK-wide"}
- Employee count: ${company?.employees ?? "Unknown"}
- Annual turnover: £${company?.turnover?.toLocaleString() ?? "Unknown"}
- Previous public sector work: ${company?.previousPublicSectorWork ? "Yes" : "No"}
- Preferred contract value: ${company?.preferredContractValue ?? "Unknown"}
${previousEvidence.length > 0 ? `- Recent project evidence: ${previousEvidence.map((e) => e.title).join("; ")}` : ""}

WRITING STANDARDS — follow these without exception:
1. Address the question directly and immediately — no preamble or meta-commentary
2. Use STAR methodology (Situation, Task, Action, Result) for past experience questions
3. Reference specific accreditations, policies and certifications held by the company
4. Include measurable outcomes: percentages, timescales, quantities, cost savings
5. Focus on the BUYER's outcomes and KPIs, not the company's internal pride
6. Never use vague claims — replace "we have extensive experience" with concrete delivery evidence
7. Write in clear, confident, professional UK English appropriate for public sector evaluators
8. Never include JSON, markdown headers, or any wrapper around the answer
9. Maintain a consultative, collaborative tone — not a sales pitch

UK PROCUREMENT CONTEXT you must apply:
- Social value (Public Services Social Value Act 2012) carries 10-20% weighting in most tenders
- Method statements must address delivery approach, team structure, risk management and escalation
- Financial capacity questions require turnover benchmarks (typically 2× annual contract value)
- Equality, diversity and inclusion requirements apply to all contracts above threshold
- Environmental and Net Zero commitments are increasingly scored criteria
- TUPE (Transfer of Undertakings Protection of Employment) applies to service transfer contracts
- SME-friendly language: reference any frameworks, DPS or G-Cloud lotholdings if applicable
- Buyer types and their priorities: NHS (patient outcomes, infection control, value), Local Authority (social value, local employment, sustainability), Central Government (security, compliance, scalability), Highways (safety, traffic management, community impact), Education (safeguarding, DBS, SEND awareness)`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: systemText,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{
        role: "user",
        content: `Tender: ${tenderTitle ?? "Unknown"}
Buyer type: ${buyerType ?? "Unknown"}
${wordLimit ? `Word limit: ${wordLimit} words — stay within this strictly.` : "Aim for 350-450 words."}

Question: ${question}

Write the complete bid answer now.`,
      }],
    })

    const answer = message.content[0].type === "text" ? message.content[0].text : ""
    res.json({ answer })
  } catch { res.status(500).json({ error: "AI generation failed" }) }
})

// Opportunity match score — explain why a tender is/isn't a good fit
router.post("/match-score", async (req: AuthRequest, res: Response) => {
  const client = getClient()
  if (!client) { res.status(503).json({ error: "AI features not configured" }); return }
  if (!req.companyId) { res.status(403).json({ error: "Company profile required" }); return }

  const { tenderId } = req.body
  if (!tenderId) { res.status(400).json({ error: "tenderId is required" }); return }

  try {
    const [company, tender] = await Promise.all([
      prisma.company.findUnique({ where: { id: req.companyId } }),
      prisma.tender.findUnique({ where: { id: tenderId } }),
    ])
    if (!company || !tender) { res.status(404).json({ error: "Company or tender not found" }); return }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a UK procurement expert. Score how well this company matches this tender opportunity.

Company:
- Name: ${company.name}
- Sector: ${company.sector}
- Turnover: £${company.turnover?.toLocaleString() ?? "Unknown"}
- Employees: ${company.employees}
- Regions: ${company.regions.join(", ")}
- Insurance: ${company.insurance.join(", ")}
- Accreditations: ${company.accreditations.join(", ")}
- Previous public sector: ${company.previousPublicSectorWork ? "Yes" : "No"}
- Preferred contract value: ${company.preferredContractValue}

Tender:
- Title: ${tender.title}
- Value: £${tender.value.toLocaleString()}${tender.valueMax ? ` – £${tender.valueMax.toLocaleString()}` : ""}
- Category: ${tender.category}
- Buyer type: ${tender.buyerType}
- Region: ${tender.region}
- Required insurance: ${tender.insuranceRequired.join(", ")}
- Required accreditations: ${tender.accreditationsRequired.join(", ")}
- Description: ${tender.description.slice(0, 400)}

Respond with JSON only:
{
  "opportunityScore": <0-100>,
  "eligibilityScore": <0-100>,
  "recommendation": "<recommended|maybe|not-recommended>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "gaps": ["<gap 1 if any>"],
  "winProbability": <0-100>,
  "estimatedBidCost": <integer GBP>
}`,
      }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) { res.status(500).json({ error: "AI response parsing failed" }); return }

    res.json(JSON.parse(jsonMatch[0]))
  } catch { res.status(500).json({ error: "AI match scoring failed" }) }
})

export default router
