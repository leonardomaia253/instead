import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { cleanNumber, cleanText, json, preflight, rateLimit, readJsonBody, requireBearer } from "../_shared/security.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

function requireConfiguredGemini() {
  if (!GEMINI_API_KEY) {
    throw new Error('AI provider unavailable')
  }
}

serve(async (req) => {
  const methodResponse = preflight(req)
  if (methodResponse) return methodResponse

  try {
    const unauthorized = requireBearer(req)
    if (unauthorized) return unauthorized
    requireConfiguredGemini()
    const limited = rateLimit(req, "lending-ai")
    if (limited) return limited

    const body = await readJsonBody(req)
    const collateral = cleanText(body.collateral, 24)
    const collateralAmount = cleanNumber(body.collateralAmount)
    const borrow = cleanText(body.borrow, 24)
    const borrowAmount = cleanNumber(body.borrowAmount)
    const healthFactor = cleanNumber(body.healthFactor)

    const prompt = `
      Você é o Consultor de Empréstimos da Instead Finance.
      Dados da posição atual:
      - Colateral: ${collateralAmount} ${collateral}
      - Empréstimo: ${borrowAmount} ${borrow}
      - Fator de Saúde (Health Factor): ${healthFactor}

      Com base nisso, dê 2 ou 3 dicas curtas e profissionais (máximo 25 palavras cada) em Português sobre como gerenciar esta posição. 
      Se o Fator de Saúde estiver abaixo de 1.2, seja urgente no alerta de liquidação.
      Se estiver acima de 2.5, mencione que a posição está muito conservadora e há capital ocioso.
      Mantenha um tom futurista, direto e técnico. Não use saudações longas.
    `

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar dicas no momento. Verifique sua conexão."

    return json({ tips: text })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json({ error: message }, message === "Payload too large" ? 413 : message === "AI provider unavailable" ? 503 : 500)
  }
})
