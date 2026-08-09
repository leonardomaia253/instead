import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { cleanNumber, cleanText, json, preflight, rateLimit, readJsonBody, requireBearer } from "../_shared/security.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

function requireConfiguredGemini() {
  if (!GEMINI_API_KEY) {
    throw new Error('AI provider unavailable')
  }
}

function extractGeminiText(data: any) {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("AI provider returned no content")
  }
  return text
}

serve(async (req) => {
  const methodResponse = preflight(req)
  if (methodResponse) return methodResponse

  try {
    const unauthorized = requireBearer(req)
    if (unauthorized) return unauthorized
    requireConfiguredGemini()
    const limited = rateLimit(req, "token-ai")
    if (limited) return limited

    const body = await readJsonBody(req)
    const name = cleanText(body.name, 80)
    const symbol = cleanText(body.symbol, 16).toUpperCase()
    const description = cleanText(body.description, 500)
    const step = cleanNumber(body.step)

    let prompt = `
      Você é o Arquiteto de Tokens da Instead Finance. Seu objetivo é ajudar o usuário a criar o melhor ativo digital possível.
      Contexto atual:
      - Nome: ${name}
      - Símbolo: ${symbol}
      - Descrição: ${description}
      - Passo atual da criação: ${step}
    `

    if (step === 2) {
      prompt += `
        O usuário está definindo a Identidade do token. 
        Sugira:
        1. Um nome mais impactante se "${name}" for genérico.
        2. Um Ticker (símbolo) que combine bem.
        3. Uma breve descrição de marketing.
      `
    } else {
      prompt += `
        Dê 2 dicas rápidas sobre tokenomics ou escolha de rede para este projeto.
      `
    }

    prompt += `
      Responda de forma concisa (máximo 50 palavras no total) em Português (Brazilian). 
      Seja inspirador, técnico e direto. Use bullet points se ajudar.
    `

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const data = await response.json()
    if (!response.ok) {
      console.error("Gemini token-ai failed", response.status, data?.error?.message ?? data)
      throw new Error("AI provider request failed")
    }
    const text = extractGeminiText(data)

    return json({ tips: text })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(
      { error: message },
      message === "Payload too large" ? 413 : message === "AI provider unavailable" ? 503 : message.startsWith("AI provider ") ? 502 : 500,
    )
  }
})
