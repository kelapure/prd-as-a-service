// Firebase Admin SDK initialization for server-side authentication and Firestore

import { initializeApp, cert, ServiceAccount, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY"
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Service account credentials from environment variables
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  // Handle private key with newlines properly
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n")
};

// Initialize Firebase Admin
let firebaseApp: App;

try {
  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID!
  });
} catch (error: any) {
  // If already initialized, get the existing app
  throw new Error(`Failed to initialize Firebase Admin SDK: ${error?.message || error}`);
}

// Export Firebase services
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

// Export app for testing/debugging
export { firebaseApp };

