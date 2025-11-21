// API client for authentication and evaluation management

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Evaluation {
  id: string;
  userId: string;
  prdTitle: string;
  prdTextHash: string;
  binaryScore: any;
  fixPlan: any;
  agentTasks: any;
  isPaid: boolean;
  createdAt: any;
  updatedAt: any;
}

/**
 * Register a new user or update existing user profile
 */
export async function registerUser(
  firstName: string,
  lastName: string,
  email: string,
  token: string
): Promise<{ user: UserProfile }> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ firstName, lastName, email })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Registration failed" }));
    throw new Error(error.error || "Failed to register user");
  }

  return response.json();
}

/**
 * Get current user profile
 */
export async function getMe(token: string): Promise<{ user: UserProfile }> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch user" }));
    throw new Error(error.error || "Failed to fetch user profile");
  }

  return response.json();
}

/**
 * Save an evaluation (requires payment)
 */
export async function saveEvaluation(
  evaluationData: {
    prdTitle: string;
    prdText: string;
    binaryScore: any;
    fixPlan: any;
    agentTasks: any;
    isPaid: boolean;
  },
  token: string
): Promise<{ evaluation: Evaluation }> {
  const response = await fetch(`${API_URL}/api/evaluations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(evaluationData)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to save evaluation" }));
    throw new Error(error.error || "Failed to save evaluation");
  }

  return response.json();
}

/**
 * List all evaluations for the current user
 */
export async function listEvaluations(token: string): Promise<{ evaluations: Evaluation[] }> {
  const response = await fetch(`${API_URL}/api/evaluations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch evaluations" }));
    throw new Error(error.error || "Failed to fetch evaluations");
  }

  return response.json();
}

/**
 * Get a specific evaluation by ID
 */
export async function getEvaluation(id: string, token: string): Promise<{ evaluation: Evaluation }> {
  const response = await fetch(`${API_URL}/api/evaluations/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch evaluation" }));
    throw new Error(error.error || "Failed to fetch evaluation");
  }

  return response.json();
}

/**
 * Delete an evaluation by ID
 */
export async function deleteEvaluation(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/evaluations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to delete evaluation" }));
    throw new Error(error.error || "Failed to delete evaluation");
  }
}

/**
 * Create a Stripe Checkout session for payment
 */
export async function createCheckoutSession(
  evaluationData: {
    prdTitle: string;
    prdText: string;
    binaryScore: any;
    fixPlan: any;
    agentTasks: any;
  },
  token: string
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const response = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ evaluationData })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create checkout session" }));
    throw new Error(error.error || "Failed to create checkout session");
  }

  return response.json();
}

// Export types
export type { UserProfile, Evaluation };

