// CPV code range helpers
function cpvInRange(cpv: string, start: number, end: number): boolean {
  const code = parseInt(cpv.replace(/\D/g, "").slice(0, 8), 10)
  return !isNaN(code) && code >= start && code <= end
}

// Category inference
export function inferCategory(title: string, description: string, cpvCode?: string): string {
  const text = `${title} ${description}`.toLowerCase()

  if (cpvCode) {
    if (cpvInRange(cpvCode, 45200000, 45299999)) return "highways"
    if (cpvInRange(cpvCode, 72000000, 72999999)) return "it"
    if (cpvInRange(cpvCode, 85000000, 85999999)) return "healthcare"
    if (cpvInRange(cpvCode, 90900000, 90999999)) return "facilities"
    if (cpvInRange(cpvCode, 79000000, 79999999)) return "professional-services"
    if (cpvInRange(cpvCode, 80000000, 80999999)) return "education"
    if (cpvInRange(cpvCode, 60000000, 63999999)) return "transport"
    if (cpvInRange(cpvCode, 50000000, 50999999)) return "facilities"
  }

  if (text.match(/highway|carriageway|road\s+main|resurfacing|pothole|footway|tarmac|surfacing/)) return "highways"
  if (text.match(/software|it\s+service|cyber|cloud|digital|data\s+centre|infrastructure\s+tech/)) return "it"
  if (text.match(/nhs|hospital|health|medical|clinical|gp\s+|nursing|pharmacy/)) return "healthcare"
  if (text.match(/clean|facility|facili|janitorial|waste|grounds|catering|security\s+guard/)) return "facilities"
  if (text.match(/construction|building\s+work|civil\s+engineering|structural|refurb/)) return "construction"
  if (text.match(/consult|advisory|legal|audit|accountan|professional\s+service/)) return "professional-services"
  if (text.match(/school|college|university|education|training|learning/)) return "education"
  if (text.match(/transport|fleet|vehicle|logistics|courier|freight/)) return "transport"
  if (text.match(/housing|social\s+housing|residential|estate\s+manage/)) return "housing"

  return "other"
}

// Buyer type inference
export function inferBuyerType(buyerName: string, description?: string): string {
  const text = `${buyerName} ${description ?? ""}`.toLowerCase()

  if (text.match(/national highways|highways england/)) return "highways"
  if (text.match(/nhs|trust|health\s+board|clinical\s+commissioning|integrated\s+care/)) return "nhs"
  if (text.match(/local authority|council|borough|district|county\s+council|city\s+council|metropolitan/)) return "local-authority"
  if (text.match(/housing\s+association|registered\s+provider|rp\s+/)) return "housing"
  if (text.match(/university|college|school|academy\s+trust|higher\s+education/)) return "education"
  if (text.match(/ministry|department|cabinet\s+office|hmrc|dvla|home\s+office|mod|moj|dwp/)) return "central-government"
  if (text.match(/government|department|agency|authority|public\s+body/)) return "central-government"

  return "central-government"
}

// Region inference from UK location strings
export function inferRegion(location: string, postcode?: string): string {
  const text = `${location} ${postcode ?? ""}`.toLowerCase()

  if (text.match(/london|greater london|city of london/)) return "London"
  if (text.match(/north west|manchester|liverpool|lancashire|cheshire|cumbria/)) return "North West"
  if (text.match(/yorkshire|leeds|sheffield|bradford|hull|york|humberside/)) return "Yorkshire"
  if (text.match(/north east|newcastle|sunderland|middlesbrough|durham|tyne/)) return "North East"
  if (text.match(/west midlands|birmingham|coventry|wolverhampton|staffordshire|warwickshire/)) return "West Midlands"
  if (text.match(/east midlands|nottingham|leicester|derby|lincoln|northampton/)) return "East Midlands"
  if (text.match(/east of england|norfolk|suffolk|essex|hertfordshire|bedfordshire|cambridgeshire/)) return "East of England"
  if (text.match(/south east|kent|surrey|sussex|hampshire|berkshire|oxfordshire|buckinghamshire/)) return "South East"
  if (text.match(/south west|bristol|devon|cornwall|somerset|dorset|gloucester|wiltshire/)) return "South West"
  if (text.match(/wales|cardiff|swansea|newport|cymru/)) return "Wales"
  if (text.match(/scotland|glasgow|edinburgh|aberdeen|dundee|highlands/)) return "Scotland"
  if (text.match(/northern ireland|belfast|derry|londonderry/)) return "Northern Ireland"

  // Postcode prefix matching
  if (postcode) {
    const prefix = postcode.toUpperCase().slice(0, 2).replace(/\d/g, "")
    const regionMap: Record<string, string> = {
      E: "London", EC: "London", N: "London", NW: "London", SE: "London",
      SW: "London", W: "London", WC: "London",
      M: "North West", L: "North West", PR: "North West", WA: "North West",
      LS: "Yorkshire", S: "Yorkshire", BD: "Yorkshire", HU: "Yorkshire",
      NE: "North East", SR: "North East", TS: "North East", DH: "North East",
      B: "West Midlands", CV: "West Midlands", WV: "West Midlands",
      NG: "East Midlands", LE: "East Midlands", DE: "East Midlands",
      BS: "South West", EX: "South West", PL: "South West", TQ: "South West",
      CT: "South East", TN: "South East", RH: "South East", GU: "South East",
      CF: "Wales", SA: "Wales", NP: "Wales",
      G: "Scotland", EH: "Scotland", AB: "Scotland", DD: "Scotland",
      BT: "Northern Ireland",
    }
    if (regionMap[prefix]) return regionMap[prefix]
  }

  // NUTS / ITL codes from Find a Tender (UKC=NE, UKD=NW, UKE=Yorks, UKF=EM, UKG=WM,
  // UKH=EastEng, UKI=London, UKJ=SE, UKK=SW, UKL=Wales, UKM=Scotland, UKN=NI)
  const nuts = location.toUpperCase().match(/^UK([A-N])/)
  if (nuts) {
    const nutsMap: Record<string, string> = {
      C: "North East", D: "North West", E: "Yorkshire",
      F: "East Midlands", G: "West Midlands", H: "East of England",
      I: "London", J: "South East", K: "South West",
      L: "Wales", M: "Scotland", N: "Northern Ireland",
    }
    if (nutsMap[nuts[1]]) return nutsMap[nuts[1]]
  }

  return "National"
}

// Classify tenders into sector tags
export function classifyTender(title: string, description: string, cpvCode?: string): string[] {
  const tags: string[] = []
  const text = `${title} ${description}`.toLowerCase()

  if (text.match(/highway|road|carriageway|surfacing|pothole|traffic/)) tags.push("highways")
  if (text.match(/construction|civil|building|structural/)) tags.push("construction")
  if (text.match(/nhs|health|medical|clinical/)) tags.push("healthcare")
  if (text.match(/it|software|digital|cyber|cloud/)) tags.push("it")
  if (text.match(/clean|facilit|waste|grounds|catering/)) tags.push("facilities")
  if (text.match(/housing|residential|social\s+housing/)) tags.push("housing")
  if (text.match(/education|school|training|learning/)) tags.push("education")
  if (text.match(/transport|fleet|vehicle|logistics/)) tags.push("transport")
  if (text.match(/consult|advisory|legal|professional/)) tags.push("professional-services")
  if (text.match(/sme|small\s+business|small\s+company/)) tags.push("sme-friendly")
  if (text.match(/social\s+value|community\s+benefit|local\s+employment/)) tags.push("social-value")

  if (cpvCode) {
    if (cpvInRange(cpvCode, 45200000, 45299999) && !tags.includes("highways")) tags.push("highways")
    if (cpvInRange(cpvCode, 72000000, 72999999) && !tags.includes("it")) tags.push("it")
  }

  return tags.length > 0 ? tags : ["general"]
}
