// server/utils/geminiService.js
// OpenRouter integration — replaces Gemini SDK
// Free tier models via openrouter.ai — no credit card, no hard daily cap
// Model: google/gemma-3-12b-it:free (capable, free, no billing)
require('dotenv').config()

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions'

// ── Service categories — must match your DB exactly ───────────────────────────
const SERVICE_CATEGORIES = [
  { id: 1, name: 'Plumbing'   },
  { id: 2, name: 'Electrical' },
  { id: 3, name: 'Solar'      },
  { id: 4, name: 'Mechanic'   },
  { id: 5, name: 'Laundry'    },
  { id: 6, name: 'HVAC'       },
  { id: 7, name: 'Tailoring'  },
  { id: 8, name: 'Home Care'  },
]

// ── Core API caller ───────────────────────────────────────────────────────────
// Single function that calls OpenRouter — all AI features go through this
const callOpenRouter = async (prompt) => {
  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'http://localhost:5000',
      'X-Title':       'TrustLink NW Cameroon',
    },
    body: JSON.stringify({
      model:       process.env.OPENROUTER_MODEL || 'google/gemma-3-12b-it:free',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.2,   // low temperature = more deterministic JSON output
      max_tokens:  500,
    }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(`OpenRouter error ${response.status}: ${JSON.stringify(errData)}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

// ── Extract JSON from model output ────────────────────────────────────────────
// Models sometimes wrap JSON in markdown or add surrounding text
// This extracts the raw JSON object reliably
const extractJSON = (text) => {
  // Try parsing directly first
  try {
    return JSON.parse(text)
  } catch (_) {}

  // Strip code fences
  let cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/im, '')
    .trim()

  // Extract first JSON object found
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    return JSON.parse(match[0])
  }

  throw new Error('No valid JSON found in model response')
}

// ── analyzeJobRequest ─────────────────────────────────────────────────────────
// Main NLP feature — maps natural language to structured job post data
// Handles: plain English, informal English, Cameroon Pidgin English
const analyzeJobRequest = async (rawText) => {
  const prompt = `You are an AI assistant for TrustLink, a local services marketplace in the North West Region of Cameroon.

Your task: analyze a customer's service request and extract structured data.

The customer may write in standard English, informal English, or Cameroon Pidgin English.
Examples of Pidgin: "pipe dey leak", "no get light", "motor no start", "e don bad"

Available service categories (pick exactly one):
${SERVICE_CATEGORIES.map(s => `- ${s.name}`).join('\n')}

Urgency detection:
- high: "urgent", "emergency", "right now", "e don bad", "since morning", "immediately"
- medium: needs it soon but not emergency
- low: flexible timing, no urgency mentioned

Customer request: "${rawText}"

Respond with ONLY a JSON object. No explanation. No markdown. No code fences. Just the raw JSON.

{
  "serviceCategory": "exact category name from the list",
  "title": "clear 5-8 word job title",
  "description": "professional English rewrite of the request in 2 sentences",
  "urgency": "low or medium or high",
  "estimatedBudgetMin": null,
  "estimatedBudgetMax": null,
  "confidence": 0.95,
  "detectedLanguage": "english or pidgin or mixed"
}`

  try {
    const raw    = await callOpenRouter(prompt)

    console.log('--- OpenRouter raw response ---')
    console.log(raw)
    console.log('--- End ---')

    const parsed = extractJSON(raw)

    const matchedCategory = SERVICE_CATEGORIES.find(
      c => c.name.toLowerCase() === (parsed.serviceCategory || '').toLowerCase()
    )

    return {
      success:            true,
      categoryId:         matchedCategory?.id   || null,
      categoryName:       matchedCategory?.name || parsed.serviceCategory,
      title:              parsed.title              || '',
      description:        parsed.description        || '',
      urgency:            parsed.urgency            || 'medium',
      estimatedBudgetMin: parsed.estimatedBudgetMin || null,
      estimatedBudgetMax: parsed.estimatedBudgetMax || null,
      confidence:         parsed.confidence         || 0,
      detectedLanguage:   parsed.detectedLanguage   || 'english',
      suggestedTitle:     parsed.title              || '',
      rawInput:           rawText,
    }

  } catch (err) {
    console.error('AI analysis error:', err.message)
    return {
      success:  false,
      error:    'Could not analyze request. Please fill the form manually.',
      rawInput: rawText,
    }
  }
}

// ── generateArtisanBlurb ──────────────────────────────────────────────────────
// Generates recommendation text for new artisans with fewer than 5 jobs
// Solves the cold-start visibility problem — cited in your PDF research
const generateArtisanBlurb = async (artisan) => {
  const prompt = `Write a 1-2 sentence recommendation for a new service provider on TrustLink, a marketplace in Cameroon's North West Region.

Be encouraging but factual. Do not invent achievements. Focus on their verified status and service.

Provider details:
- Name: ${artisan.fullName}
- Service: ${artisan.primaryService}
- Quarter: ${artisan.quarter}
- Verified documents: ${artisan.verifiedDocCount}
- Trust score: ${artisan.trustScore}%

Respond with ONLY the recommendation text. No quotes, no labels, under 30 words.`

  try {
    const text = await callOpenRouter(prompt)
    return { success: true, blurb: text.trim() }
  } catch (err) {
    return {
      success: false,
      blurb:   `Verified ${artisan.primaryService} provider serving ${artisan.quarter}.`,
    }
  }
}

module.exports = { analyzeJobRequest, generateArtisanBlurb }