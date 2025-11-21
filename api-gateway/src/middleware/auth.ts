// Authentication middleware - verifies Firebase ID tokens

import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../lib/firebase.js";

// Extend Fastify request to include user info
declare module "fastify" {
  interface FastifyRequest {
    user?: {
      uid: string;
      email: string;
      emailVerified: boolean;
    };
  }
}

/**
 * Middleware to verify Firebase ID token from Authorization header
 * Attaches decoded user info to request.user
 */
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header (format: "Bearer <token>")
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({
        error: "Missing authorization header",
        code: "AUTH_MISSING"
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: "Invalid authorization header format. Expected: Bearer <token>",
        code: "AUTH_INVALID_FORMAT"
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return reply.status(401).send({
        error: "Missing token",
        code: "AUTH_MISSING_TOKEN"
      });
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      emailVerified: decodedToken.email_verified || false
    };

  } catch (error: any) {
    // Handle various Firebase Auth errors
    if (error.code === "auth/id-token-expired") {
      return reply.status(401).send({
        error: "Token expired. Please sign in again.",
        code: "AUTH_TOKEN_EXPIRED"
      });
    }

    if (error.code === "auth/id-token-revoked") {
      return reply.status(401).send({
        error: "Token revoked. Please sign in again.",
        code: "AUTH_TOKEN_REVOKED"
      });
    }

    if (error.code === "auth/argument-error") {
      return reply.status(401).send({
        error: "Invalid token format",
        code: "AUTH_INVALID_TOKEN"
      });
    }

    // Generic authentication error
    request.log.error({
      error: error?.message,
      code: error?.code,
      stack: error?.stack
    }, "Token verification failed");

    return reply.status(401).send({
      error: "Authentication failed",
      code: "AUTH_FAILED"
    });
  }
}

