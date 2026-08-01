import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { verifyMessage } from "npm:viem@2.47.5"
import { cleanText, json, preflight, rateLimit, readJsonBody } from "../_shared/security.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const SUPABASE_JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET")
const SIWE_DOMAIN = Deno.env.get("SIWE_DOMAIN") ?? "instead.volupai.com"

function requiredEnv(value: string | undefined, name: string) {
  if (!value) throw new Error("Service unavailable")
  return value
}

function base64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function encodeJson(value: unknown) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)))
}

async function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" }
  const encodedHeader = encodeJson(header)
  const encodedPayload = encodeJson(payload)
  const data = `${encodedHeader}.${encodedPayload}`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))
  return `${data}.${base64Url(signature)}`
}

function createSiweMessage(address: string, nonce: string) {
  const issuedAt = new Date().toISOString()
  return [
    `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Instead Finance.",
    "",
    `URI: https://${SIWE_DOMAIN}`,
    "Version: 1",
    "Chain ID: 1",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n")
}

serve(async (req) => {
  const methodResponse = preflight(req)
  if (methodResponse) return methodResponse

  try {
    const limited = rateLimit(req, "siwe-auth")
    if (limited) return limited

    const supabase = createClient(
      requiredEnv(SUPABASE_URL, "SUPABASE_URL"),
      requiredEnv(SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    )
    const body = await readJsonBody(req, 4096)
    const action = body.action as "nonce" | "verify"
    const walletAddress = cleanText(body.address, 64).toLowerCase()

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return json({ error: "Invalid wallet address" }, 400)
    }

    if (action === "nonce") {
      const nonceBytes = new Uint8Array(16)
      crypto.getRandomValues(nonceBytes)
      const nonce = base64Url(nonceBytes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      const message = createSiweMessage(walletAddress, nonce)

      const { error } = await supabase.from("siwe_nonces").insert({
        nonce,
        wallet_address: walletAddress,
        domain: SIWE_DOMAIN,
        expires_at: expiresAt,
      })
      if (error) throw error

      return json({ nonce, message, expires_at: expiresAt })
    }

    if (action === "verify") {
      const jwtSecret = requiredEnv(SUPABASE_JWT_SECRET, "SUPABASE_JWT_SECRET")
      const nonce = cleanText(body.nonce, 128)
      const message = String(body.message ?? "").slice(0, 1200)
      const signature = cleanText(body.signature, 160)

      const { data: nonceRecord, error: nonceError } = await supabase
        .from("siwe_nonces")
        .select("*")
        .eq("nonce", nonce)
        .eq("wallet_address", walletAddress)
        .is("consumed_at", null)
        .single()

      if (nonceError || !nonceRecord) return json({ error: "Invalid nonce" }, 401)
      if (new Date(nonceRecord.expires_at).getTime() < Date.now()) return json({ error: "Nonce expired" }, 401)
      if (!message.includes(`Nonce: ${nonce}`) || !message.includes(walletAddress)) {
        return json({ error: "Message mismatch" }, 401)
      }

      const valid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
      if (!valid) return json({ error: "Invalid signature" }, 401)

      const { data: profile, error: userError } = await supabase
        .from("users")
        .upsert({ wallet_address: walletAddress }, { onConflict: "wallet_address" })
        .select("id,wallet_address,is_admin")
        .single()
      if (userError) throw userError

      await supabase
        .from("siwe_nonces")
        .update({ consumed_at: new Date().toISOString() })
        .eq("nonce", nonce)

      const now = Math.floor(Date.now() / 1000)
      const accessToken = await signJwt({
        aud: "authenticated",
        exp: now + 60 * 60,
        iat: now,
        iss: "supabase",
        role: "authenticated",
        sub: profile.id,
        wallet_address: profile.wallet_address,
        is_admin: profile.is_admin,
      }, jwtSecret)

      return json({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        user: profile,
      })
    }

    return json({ error: "Unknown action" }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    if (message === "Payload too large") return json({ error: message }, 413)
    if (message === "Service unavailable") return json({ error: message }, 503)
    console.error("siwe-auth failed", message)
    return json({ error: "Internal server error" }, 500)
  }
})
