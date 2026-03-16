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
    const { name, symbol, description, step } = await req.json()

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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Arquiteto online. Como posso ajudar no seu deploy hoje?"

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
