import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load env files
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: resolve(root, "frontend/.env.local") });
dotenv.config({ path: resolve(root, ".env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run reconciliation.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function runReconciliation() {
  console.log("Starting daily financial reconciliation...");
  
  // 1. Fetch paid payment intents
  const { data: paidIntents, error: intentsError } = await supabase
    .from("payment_intents")
    .select("*")
    .eq("status", "paid");
    
  if (intentsError) {
    console.error("Error fetching payment intents:", intentsError.message);
    process.exit(1);
  }
  
  console.log(`Found ${paidIntents.length} paid payment intents to reconcile.`);
  
  let anomaliesCount = 0;
  let reconciledCount = 0;
  
  for (const intent of paidIntents) {
    const { id: intentId, wallet_address, product_code, amount_cents, currency, paid_at } = intent;
    const wallet = wallet_address?.toLowerCase();
    
    console.log(`\nReconciling intent ${intentId} (${product_code}) paid by wallet ${wallet || "unknown"}`);
    
    // Check if there is an associated token already created or mapped
    const { data: tokens, error: tokenError } = await supabase
      .from("generated_tokens")
      .select("*")
      .or(`payment_intent_id.eq.${intentId},creator_wallet.eq.${wallet}`);
      
    if (tokenError) {
      console.error(`Error querying tokens for intent ${intentId}:`, tokenError.message);
      continue;
    }
    
    // Try to find a precise match
    const linkedToken = tokens.find(t => t.payment_intent_id === intentId) || 
      tokens.find(t => t.creator_wallet?.toLowerCase() === wallet && Math.abs(new Date(t.created_at).getTime() - new Date(paid_at).getTime()) < 3600_000 * 24); // within 24h of payment
      
    if (linkedToken) {
      console.log(`- Token matched: ${linkedToken.name} (${linkedToken.symbol}) at address ${linkedToken.token_address}`);
      
      // Update link if not already linked
      if (!linkedToken.payment_intent_id) {
        const { error: updateTokenErr } = await supabase
          .from("generated_tokens")
          .update({ payment_intent_id: intentId })
          .eq("id", linkedToken.id);
          
        if (updateTokenErr) {
          console.error(`- Failed to update token payment link:`, updateTokenErr.message);
        } else {
          console.log(`- Explicitly linked payment intent to token record.`);
        }
      }
      
      reconciledCount++;
      continue;
    }
    
    // Check if it's already in the operation reconciliation queue
    const { data: queueItems, error: queueError } = await supabase
      .from("operation_reconciliation_queue")
      .select("*")
      .eq("user_wallet", wallet);
      
    if (queueError) {
      console.error(`Error querying reconciliation queue for intent ${intentId}:`, queueError.message);
      continue;
    }
    
    const matchingQueueItem = queueItems.find(item => 
      item.expected_state?.payment_intent_id === intentId || 
      item.operation_id?.includes(intentId)
    );
    
    if (matchingQueueItem) {
      console.log(`- Matched queue reconciliation item: ${matchingQueueItem.operation_id} with status ${matchingQueueItem.status}`);
      reconciledCount++;
      continue;
    }
    
    // If not found, log as an operational anomaly!
    console.warn(`⚠️ ANOMALY DETECTED: Intent ${intentId} is paid but has no deployed token or reconciliation queue item!`);
    anomaliesCount++;
    
    // Insert/enqueue into the reconciliation queue to alert admins
    const operationId = `${wallet}:assisted_deploy_pending:${intentId}`;
    const { error: enqueueError } = await supabase
      .from("operation_reconciliation_queue")
      .upsert({
        operation_id: operationId,
        user_wallet: wallet,
        vertical: "token_factory",
        action: "assisted_deploy",
        tx_hash: "0x0000000000000000000000000000000000000000000000000000000000000000", // placeholder for manual deploy
        chain_id: 42161, // Arbitrum default
        expected_state: {
          payment_intent_id: intentId,
          product_code,
          amount_cents,
          currency,
          anomaly: true,
          reason: "Payment intent is paid but token not deployed",
        },
        status: "pending",
      }, { onConflict: "operation_id" });
      
    if (enqueueError) {
      console.error(`- Failed to enqueue anomaly in reconciliation queue:`, enqueueError.message);
    } else {
      console.log(`- Enqueued pending anomaly in operation_reconciliation_queue for admin follow-up.`);
    }
  }
  
  console.log("\nReconciliation Summary:");
  console.log(`- Reconciled/Confirmed: ${reconciledCount}`);
  console.log(`- Anomalies Flagged: ${anomaliesCount}`);
  
  // Log execution to admin_audit_logs
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_wallet: "system:reconciliation_job",
      action: "daily_financial_reconciliation",
      target_resource: "payment_intents",
      details: {
        total_paid_intents: paidIntents.length,
        reconciled_count: reconciledCount,
        anomalies_count: anomaliesCount,
      },
    });
    console.log("- Logged reconciliation execution to admin_audit_logs.");
  } catch (err) {
    console.warn("Failed to write to admin_audit_logs:", err);
  }

  console.log("Reconciliation finished.");
}

runReconciliation().catch(console.error);
