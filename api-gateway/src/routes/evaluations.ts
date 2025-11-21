// Evaluation routes - CRUD operations for saved PRD evaluations

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/firebase.js";
import { authenticateToken } from "../middleware/auth.js";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

interface SaveEvaluationBody {
  prdTitle: string;
  prdText: string;
  binaryScore: any;
  fixPlan: any;
  agentTasks: any;
  isPaid: boolean;
}

/**
 * Generate SHA-256 hash of PRD text for deduplication
 */
function hashPRDText(prdText: string): string {
  return crypto.createHash("sha256").update(prdText).digest("hex");
}

/**
 * Register evaluation routes
 */
export async function registerEvaluationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/evaluations
   * Save a PRD evaluation (requires payment)
   * Protected route - requires valid Firebase ID token
   */
  fastify.post(
    "/api/evaluations",
    { preHandler: authenticateToken },
    async (request: FastifyRequest<{ Body: SaveEvaluationBody }>, reply: FastifyReply) => {
      try {
        const { prdTitle, prdText, binaryScore, fixPlan, agentTasks, isPaid } = request.body;
        const uid = request.user!.uid;

        // Validate input
        if (!prdTitle || !prdText || !binaryScore || !fixPlan || !agentTasks) {
          return reply.status(400).send({
            error: "Missing required fields: prdTitle, prdText, binaryScore, fixPlan, agentTasks"
          });
        }

        // Require payment
        if (!isPaid) {
          return reply.status(403).send({
            error: "Payment required to save evaluation",
            code: "PAYMENT_REQUIRED"
          });
        }

        // Generate hash of PRD text
        const prdTextHash = hashPRDText(prdText);

        // Check for duplicate (same user, same PRD hash)
        const duplicateQuery = await db
          .collection("evaluations")
          .where("userId", "==", uid)
          .where("prdTextHash", "==", prdTextHash)
          .limit(1)
          .get();

        if (!duplicateQuery.empty) {
          // Return existing evaluation instead of creating duplicate
          const existingEval = duplicateQuery.docs[0];
          return reply.status(200).send({
            message: "Evaluation already exists",
            evaluation: {
              id: existingEval.id,
              ...existingEval.data()
            }
          });
        }

        // Create new evaluation
        const evaluationRef = db.collection("evaluations").doc();
        const timestamp = FieldValue.serverTimestamp();

        await evaluationRef.set({
          userId: uid,
          prdTitle,
          prdTextHash, // Store hash, not full text
          binaryScore,
          fixPlan,
          agentTasks,
          isPaid,
          createdAt: timestamp,
          updatedAt: timestamp
        });

        return reply.status(201).send({
          message: "Evaluation saved successfully",
          evaluation: {
            id: evaluationRef.id,
            userId: uid,
            prdTitle,
            prdTextHash,
            binaryScore,
            fixPlan,
            agentTasks,
            isPaid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Failed to save evaluation");

        return reply.status(500).send({
          error: "Failed to save evaluation"
        });
      }
    }
  );

  /**
   * GET /api/evaluations
   * List all evaluations for current user
   * Protected route - requires valid Firebase ID token
   */
  fastify.get(
    "/api/evaluations",
    { preHandler: authenticateToken },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = request.user!.uid;

        // Fetch all evaluations for this user, ordered by creation date (newest first)
        const evaluationsSnapshot = await db
          .collection("evaluations")
          .where("userId", "==", uid)
          .orderBy("createdAt", "desc")
          .get();

        const evaluations = evaluationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        return reply.status(200).send({
          evaluations
        });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Failed to fetch evaluations");

        return reply.status(500).send({
          error: "Failed to fetch evaluations"
        });
      }
    }
  );

  /**
   * GET /api/evaluations/:id
   * Get specific evaluation by ID
   * Protected route - requires valid Firebase ID token
   * Ownership check: user can only access their own evaluations
   */
  fastify.get(
    "/api/evaluations/:id",
    { preHandler: authenticateToken },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const uid = request.user!.uid;

        // Fetch evaluation
        const evaluationRef = db.collection("evaluations").doc(id);
        const evaluationDoc = await evaluationRef.get();

        if (!evaluationDoc.exists) {
          return reply.status(404).send({
            error: "Evaluation not found"
          });
        }

        const evaluationData = evaluationDoc.data()!;

        // Check ownership
        if (evaluationData.userId !== uid) {
          return reply.status(403).send({
            error: "Access denied. You can only access your own evaluations."
          });
        }

        return reply.status(200).send({
          evaluation: {
            id: evaluationDoc.id,
            ...evaluationData
          }
        });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Failed to fetch evaluation");

        return reply.status(500).send({
          error: "Failed to fetch evaluation"
        });
      }
    }
  );

  /**
   * DELETE /api/evaluations/:id
   * Delete evaluation by ID
   * Protected route - requires valid Firebase ID token
   * Ownership check: user can only delete their own evaluations
   */
  fastify.delete(
    "/api/evaluations/:id",
    { preHandler: authenticateToken },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const uid = request.user!.uid;

        // Fetch evaluation to verify ownership
        const evaluationRef = db.collection("evaluations").doc(id);
        const evaluationDoc = await evaluationRef.get();

        if (!evaluationDoc.exists) {
          return reply.status(404).send({
            error: "Evaluation not found"
          });
        }

        const evaluationData = evaluationDoc.data()!;

        // Check ownership
        if (evaluationData.userId !== uid) {
          return reply.status(403).send({
            error: "Access denied. You can only delete your own evaluations."
          });
        }

        // Delete evaluation
        await evaluationRef.delete();

        return reply.status(200).send({
          message: "Evaluation deleted successfully"
        });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Failed to delete evaluation");

        return reply.status(500).send({
          error: "Failed to delete evaluation"
        });
      }
    }
  );
}

