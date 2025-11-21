// Stripe SDK initialization for payment processing

import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID"
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia", // Use latest stable API version
  typescript: true
});

// Export configuration
export const stripeConfig = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  priceId: process.env.STRIPE_PRICE_ID!
};

