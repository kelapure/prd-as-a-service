// Payment routes - Stripe integration for PRD evaluation payments

import { FastifyInstance, FastifyRequest, FastifyReply, RawServerDefault } from "fastify";
import { RawRequestDefaultExpression } from "fastify";
import { db } from "../lib/firebase.js";
import { stripe, stripeConfig } from "../lib/stripe.js";
import { authenticateToken } from "../middleware/auth.js";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

interface CreateCheckoutSessionBody {
  evaluationData: {
    prdTitle: string;
    prdText: string;
    binaryScore: any;
    fixPlan: any;
    agentTasks: any;
  };
}

/**
 * Generate SHA-256 hash of PRD text for deduplication
 */
function hashPRDText(prdText: string): string {
  return crypto.createHash("sha256").update(prdText).digest("hex");
}

/**
 * Register payment routes
 */
export async function registerPaymentRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/payments/create-checkout-session
   * Create Stripe Checkout session for $0.99 payment
   * Protected route - requires valid Firebase ID token
   */
  fastify.post<{ Body: CreateCheckoutSessionBody }>(
    "/api/payments/create-checkout-session",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const { evaluationData } = request.body;
        const uid = request.user!.uid;

        // Validate input
        if (!evaluationData || !evaluationData.prdTitle || !evaluationData.prdText) {
          return reply.status(400).send({
            error: "Missing required evaluation data"
          });
        }

        // Get user profile for metadata
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return reply.status(404).send({
            error: "User profile not found. Please register first."
          });
        }

        const userData = userDoc.data()!;

        // Generate hash for the PRD
        const prdTextHash = hashPRDText(evaluationData.prdText);

        // Store evaluation data temporarily in Firestore (will be updated after payment)
        const tempEvaluationRef = db.collection("temp_evaluations").doc();
        await tempEvaluationRef.set({
          userId: uid,
          prdTitle: evaluationData.prdTitle,
          prdTextHash,
          binaryScore: evaluationData.binaryScore,
          fixPlan: evaluationData.fixPlan,
          agentTasks: evaluationData.agentTasks,
          isPaid: false,
          createdAt: FieldValue.serverTimestamp()
        });

        // Determine success/cancel URLs based on environment
        const origin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
        const successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/payment-cancel`;

        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price: stripeConfig.priceId,
              quantity: 1
            }
          ],
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: uid,
          customer_email: userData.email,
          metadata: {
            userId: uid,
            tempEvaluationId: tempEvaluationRef.id,
            prdTitle: evaluationData.prdTitle
          }
        });

        // Create pending payment record
        const paymentRef = db.collection("payments").doc();
        await paymentRef.set({
          userId: uid,
          stripeCheckoutSessionId: session.id,
          amountCents: 99,
          currency: "usd",
          status: "pending",
          tempEvaluationId: tempEvaluationRef.id,
          createdAt: FieldValue.serverTimestamp()
        });

        return reply.status(200).send({
          checkoutUrl: session.url,
          sessionId: session.id
        });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Failed to create checkout session");

        return reply.status(500).send({
          error: "Failed to create checkout session"
        });
      }
    }
  );

  /**
   * POST /api/payments/webhook
   * Stripe webhook handler
   * Handles checkout.session.completed event
   * NOT protected - Stripe sends this, not the client
   */
  fastify.post(
    "/api/payments/webhook",
    async (request, reply) => {
      try {
        const signature = request.headers["stripe-signature"] as string;

        if (!signature) {
          request.log.warn("Missing Stripe signature header");
          return reply.status(400).send({
            error: "Missing signature"
          });
        }

        // Get raw body for signature verification
        const rawBody = (request as any).rawBody || request.body;

        // Verify webhook signature
        let event;
        try {
          event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            stripeConfig.webhookSecret
          );
        } catch (err: any) {
          request.log.error({
            error: err?.message
          }, "Webhook signature verification failed");
          return reply.status(400).send({
            error: `Webhook Error: ${err?.message}`
          });
        }

        // Handle the event
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as any;

          request.log.info({
            sessionId: session.id,
            customerId: session.customer,
            userId: session.metadata?.userId
          }, "Processing successful payment");

          const userId = session.metadata?.userId;
          const tempEvaluationId = session.metadata?.tempEvaluationId;

          if (!userId || !tempEvaluationId) {
            request.log.error({
              sessionId: session.id,
              metadata: session.metadata
            }, "Missing userId or tempEvaluationId in session metadata");
            return reply.status(400).send({
              error: "Invalid session metadata"
            });
          }

          // Fetch temp evaluation
          const tempEvalRef = db.collection("temp_evaluations").doc(tempEvaluationId);
          const tempEvalDoc = await tempEvalRef.get();

          if (!tempEvalDoc.exists) {
            request.log.error({
              tempEvaluationId
            }, "Temp evaluation not found");
            return reply.status(404).send({
              error: "Evaluation data not found"
            });
          }

          const evalData = tempEvalDoc.data()!;

          // Create permanent evaluation record
          const evaluationRef = db.collection("evaluations").doc();
          const timestamp = FieldValue.serverTimestamp();

          await evaluationRef.set({
            userId: evalData.userId,
            prdTitle: evalData.prdTitle,
            prdTextHash: evalData.prdTextHash,
            binaryScore: evalData.binaryScore,
            fixPlan: evalData.fixPlan,
            agentTasks: evalData.agentTasks,
            isPaid: true,
            createdAt: timestamp,
            updatedAt: timestamp
          });

          // Update payment record
          const paymentSnapshot = await db
            .collection("payments")
            .where("stripeCheckoutSessionId", "==", session.id)
            .limit(1)
            .get();

          if (!paymentSnapshot.empty) {
            const paymentDoc = paymentSnapshot.docs[0];
            await paymentDoc.ref.update({
              evaluationId: evaluationRef.id,
              stripePaymentIntentId: session.payment_intent,
              status: "completed",
              completedAt: timestamp
            });
          }

          // Delete temp evaluation
          await tempEvalRef.delete();

          request.log.info({
            sessionId: session.id,
            evaluationId: evaluationRef.id,
            userId
          }, "Payment processed successfully");
        }

        return reply.status(200).send({ received: true });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Webhook processing failed");

        return reply.status(500).send({
          error: "Webhook processing failed"
        });
      }
    }
  );
}

