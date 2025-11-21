// Authentication routes - user registration and profile management

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/firebase.js";
import { authenticateToken } from "../middleware/auth.js";
import { FieldValue } from "firebase-admin/firestore";

interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Register authentication routes
 */
export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/register
   * Create or update user profile
   * Protected route - requires valid Firebase ID token
   */
  fastify.post(
    "/api/auth/register",
    { preHandler: authenticateToken },
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const { firstName, lastName, email } = request.body;
        const uid = request.user!.uid;

        // Validate input
        if (!firstName || !lastName || !email) {
          return reply.status(400).send({
            error: "Missing required fields: firstName, lastName, email"
          });
        }

        // Validate email is Gmail
        if (!email.endsWith("@gmail.com")) {
          return reply.status(400).send({
            error: "Only Gmail addresses are accepted"
          });
        }

        // Check if user already exists
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        const timestamp = FieldValue.serverTimestamp();

        if (userDoc.exists) {
          // Update existing user
          await userRef.update({
            firstName,
            lastName,
            email,
            updatedAt: timestamp
          });

          return reply.status(200).send({
            message: "User profile updated",
            user: {
              uid,
              firstName,
              lastName,
              email
            }
          });
        } else {
          // Create new user
          await userRef.set({
            uid,
            firstName,
            lastName,
            email,
            createdAt: timestamp,
            updatedAt: timestamp
          });

          return reply.status(201).send({
            message: "User profile created",
            user: {
              uid,
              firstName,
              lastName,
              email
            }
          });
        }
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "User registration failed");

        return reply.status(500).send({
          error: "Failed to register user"
        });
      }
    }
  );

  /**
   * GET /api/auth/me
   * Get current user profile
   * Protected route - requires valid Firebase ID token
   */
  fastify.get(
    "/api/auth/me",
    { preHandler: authenticateToken },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = request.user!.uid;

        // Fetch user profile from Firestore
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return reply.status(404).send({
            error: "User profile not found. Please register first."
          });
        }

        const userData = userDoc.data();

        return reply.status(200).send({
          user: {
            uid: userData!.uid,
            firstName: userData!.firstName,
            lastName: userData!.lastName,
            email: userData!.email,
            createdAt: userData!.createdAt,
            updatedAt: userData!.updatedAt
          }
        });
      } catch (error: any) {
        request.log.error({
          error: error?.message,
          stack: error?.stack
        }, "Failed to fetch user profile");

        return reply.status(500).send({
          error: "Failed to fetch user profile"
        });
      }
    }
  );
}

