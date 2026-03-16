import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { collateral, collateralAmount, borrow, borrowAmount, healthFactor } = await req.json()

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

    return new Response(JSON.stringify({ tips: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
