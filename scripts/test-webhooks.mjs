import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load env file from frontend/.env.local
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.resolve(rootDir, 'frontend/.env.local') });

// Base URL definition
const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Creates a Stripe signature header value using HMAC-SHA256 (t=<timestamp>,v1=<hmac>)
 */
export function createStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadStr}`)
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Creates a Pagar.me signature header value (sha256=<hmac>)
 */
export function createPagarmeSignature(payload, secret) {
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');
  return `sha256=${hmac}`;
}

/**
 * Wraps fetch with AbortController timeout
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const stripePayload = {
  id: 'evt_test_webhook',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      amount_total: 9900,
      currency: 'usd',
      metadata: { payment_intent_id: '00000000-0000-0000-0000-000000000001' },
    },
  },
};

const pagarmePayload = {
  id: 'evt_test_pagarme',
  type: 'order.paid',
  data: {
    id: 'or_test_123',
    amount: 49900,
    metadata: { payment_intent_id: '00000000-0000-0000-0000-000000000001' },
  },
};

async function runTests() {
  console.log(`Running webhook sandbox tests against ${baseUrl}...\n`);
  let failedCount = 0;
  let passedCount = 0;

  // Case a: Stripe webhook with invalid signature -> should return 400
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/payments/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123456789,v1=invalid_signature_hash',
      },
      body: JSON.stringify(stripePayload),
    });
    if (res.status === 400) {
      console.log('[PASS] Stripe webhook with invalid signature returned 400');
      passedCount++;
    } else {
      console.error(`[FAIL] Stripe webhook with invalid signature returned status ${res.status}, expected 400`);
      failedCount++;
    }
  } catch (err) {
    console.error(`[FAIL] Stripe webhook with invalid signature: ${err.message}`);
    failedCount++;
  }

  // Case b: Pagar.me webhook with invalid signature -> should return 400
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/payments/webhooks/pagarme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid_signature_hash',
      },
      body: JSON.stringify(pagarmePayload),
    });
    if (res.status === 400) {
      console.log('[PASS] Pagar.me webhook with invalid signature returned 400');
      passedCount++;
    } else {
      console.error(`[FAIL] Pagar.me webhook with invalid signature returned status ${res.status}, expected 400`);
      failedCount++;
    }
  } catch (err) {
    console.error(`[FAIL] Pagar.me webhook with invalid signature: ${err.message}`);
    failedCount++;
  }

  // Case c: Stripe webhook with no body and no signature -> should return 400
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/payments/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '',
    });
    if (res.status === 400) {
      console.log('[PASS] Stripe webhook with no body and no signature returned 400');
      passedCount++;
    } else {
      console.error(`[FAIL] Stripe webhook with no body and no signature returned status ${res.status}, expected 400`);
      failedCount++;
    }
  } catch (err) {
    console.error(`[FAIL] Stripe webhook with no body and no signature: ${err.message}`);
    failedCount++;
  }

  // Case d: Pagar.me webhook with no body and no signature -> should return 400
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/payments/webhooks/pagarme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '',
    });
    if (res.status === 400) {
      console.log('[PASS] Pagar.me webhook with no body and no signature returned 400');
      passedCount++;
    } else {
      console.error(`[FAIL] Pagar.me webhook with no body and no signature returned status ${res.status}, expected 400`);
      failedCount++;
    }
  } catch (err) {
    console.error(`[FAIL] Pagar.me webhook with no body and no signature: ${err.message}`);
    failedCount++;
  }

  // Case e: If STRIPE_WEBHOOK_SECRET is set, test with a real valid Stripe signature for a fake checkout.session.completed payload -> should return 200
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      const payloadStr = JSON.stringify(stripePayload);
      const signature = createStripeSignature(payloadStr, process.env.STRIPE_WEBHOOK_SECRET);
      const res = await fetchWithTimeout(`${baseUrl}/api/payments/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payloadStr,
      });
      if (res.status === 200) {
        console.log('[PASS] Stripe webhook with valid signature returned 200');
        passedCount++;
      } else {
        console.error(`[FAIL] Stripe webhook with valid signature returned status ${res.status}, expected 200`);
        failedCount++;
      }
    } catch (err) {
      console.error(`[FAIL] Stripe webhook with valid signature: ${err.message}`);
      failedCount++;
    }
  } else {
    console.log('[SKIP] Stripe webhook with valid signature (STRIPE_WEBHOOK_SECRET not set)');
  }

  // Case f: If PAGARME_WEBHOOK_SECRET is set, test with a real valid Pagar.me HMAC signature for a fake order.paid payload -> should return 200
  if (process.env.PAGARME_WEBHOOK_SECRET) {
    try {
      const payloadStr = JSON.stringify(pagarmePayload);
      const signature = createPagarmeSignature(payloadStr, process.env.PAGARME_WEBHOOK_SECRET);
      const res = await fetchWithTimeout(`${baseUrl}/api/payments/webhooks/pagarme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
        },
        body: payloadStr,
      });
      if (res.status === 200) {
        console.log('[PASS] Pagar.me webhook with valid signature returned 200');
        passedCount++;
      } else {
        console.error(`[FAIL] Pagar.me webhook with valid signature returned status ${res.status}, expected 200`);
        failedCount++;
      }
    } catch (err) {
      console.error(`[FAIL] Pagar.me webhook with valid signature: ${err.message}`);
      failedCount++;
    }
  } else {
    console.log('[SKIP] Pagar.me webhook with valid signature (PAGARME_WEBHOOK_SECRET not set)');
  }

  console.log(`\nSummary: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
