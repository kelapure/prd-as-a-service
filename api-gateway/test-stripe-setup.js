#!/usr/bin/env node

/**
 * Test Stripe Setup - Validates Stripe configuration
 * Run: cd api-gateway && node test-stripe-setup.js
 */

import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

console.log("🧪 Testing Stripe Configuration\n");

// Check environment variables
const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID"
];

let missingVars = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
    console.log(`❌ Missing: ${envVar}`);
  } else {
    const value = process.env[envVar];
    const preview = value.length > 20 ? value.substring(0, 20) + "..." : value;
    console.log(`✅ ${envVar}: ${preview}`);
  }
}

if (missingVars.length > 0) {
  console.log("\n❌ Missing required environment variables. Please add them to api-gateway/.env\n");
  process.exit(1);
}

// Check if using test or live keys
const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
const keyMode = isTestMode ? "🧪 TEST MODE" : "🔴 LIVE MODE";
console.log(`\n${keyMode}\n`);

if (!isTestMode) {
  console.log("⚠️  WARNING: You're using LIVE keys! Payments will charge real money.");
  console.log("   For testing, switch to test keys from Stripe Dashboard → Test Mode\n");
}

// Initialize Stripe
let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
    typescript: true
  });
  console.log("✅ Stripe SDK initialized\n");
} catch (error) {
  console.log(`❌ Failed to initialize Stripe: ${error.message}\n`);
  process.exit(1);
}

// Test 1: Verify Price ID exists
console.log("📦 Test 1: Verifying Price ID...");
try {
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
  console.log(`✅ Price found: ${price.nickname || price.product}`);
  console.log(`   Amount: $${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
  console.log(`   Type: ${price.type}\n`);
} catch (error) {
  console.log(`❌ Price not found: ${error.message}`);
  console.log(`   Make sure you created the product in ${isTestMode ? "Test" : "Live"} mode\n`);
  process.exit(1);
}

// Test 2: List recent webhook endpoints
console.log("🔔 Test 2: Checking webhook endpoints...");
try {
  const webhooks = await stripe.webhookEndpoints.list({ limit: 5 });
  if (webhooks.data.length === 0) {
    console.log("⚠️  No webhook endpoints found");
    console.log("   Create one at: https://dashboard.stripe.com/webhooks");
    console.log("   Endpoint URL: http://localhost:8080/api/payments/webhook (for local testing)\n");
  } else {
    console.log(`✅ Found ${webhooks.data.length} webhook endpoint(s):`);
    webhooks.data.forEach((webhook, i) => {
      console.log(`   ${i + 1}. ${webhook.url}`);
      console.log(`      Status: ${webhook.status}`);
      console.log(`      Events: ${webhook.enabled_events.join(", ")}`);
    });
    console.log();
  }
} catch (error) {
  console.log(`⚠️  Could not list webhooks: ${error.message}\n`);
}

// Test 3: Test webhook signature verification
console.log("🔐 Test 3: Testing webhook secret format...");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (webhookSecret.startsWith("whsec_")) {
  console.log("✅ Webhook secret format looks correct\n");
} else {
  console.log("⚠️  Webhook secret doesn't start with 'whsec_'");
  console.log("   This might not be a valid webhook signing secret\n");
}

// Summary
console.log("=" .repeat(60));
console.log("✅ Stripe configuration is valid!\n");

if (isTestMode) {
  console.log("🧪 Test Mode - Safe to test payments");
  console.log("\n📝 Test Card Numbers:");
  console.log("   Success: 4242 4242 4242 4242");
  console.log("   Decline: 4000 0000 0000 0002");
  console.log("   Use any future expiry date and any 3-digit CVC\n");
} else {
  console.log("🔴 Live Mode - Real payments will be charged");
  console.log("   Consider switching to test mode for development\n");
}

console.log("📚 Next Steps:");
console.log("   1. Set up Firebase (see SETUP_AUTH_PAYMENTS.md)");
console.log("   2. Start API Gateway: cd api-gateway && npm run dev");
console.log("   3. Start Frontend: cd frontend && npm run dev");
console.log("   4. Test the payment flow in the browser\n");

