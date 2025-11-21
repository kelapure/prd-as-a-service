// Authentication context - manages Firebase auth state and user profile

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { signInWithGoogle, signOut as firebaseSignOut, onAuthStateChanged } from "../lib/firebase";
import { registerUser as apiRegisterUser, getMe, UserProfile } from "../lib/api-auth";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  registerUser: (firstName: string, lastName: string, email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from backend
        try {
          const token = await firebaseUser.getIdToken();
          const { user: profile } = await getMe(token);
          setUserProfile(profile);
        } catch (error) {
          console.log("User profile not found - new user needs to register");
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign in with Google
   */
  const signIn = async () => {
    try {
      setLoading(true);
      const firebaseUser = await signInWithGoogle();
      // User state will be updated by onAuthStateChanged listener
    } catch (error: any) {
      console.error("Sign in failed:", error);
      setLoading(false);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setUserProfile(null);
    } catch (error: any) {
      console.error("Sign out failed:", error);
      throw error;
    }
  };

  /**
   * Register user profile in backend
   */
  const registerUser = async (firstName: string, lastName: string, email: string) => {
    if (!user) {
      throw new Error("Must be signed in to register");
    }

    try {
      const token = await user.getIdToken();
      const { user: profile } = await apiRegisterUser(firstName, lastName, email, token);
      setUserProfile(profile);
    } catch (error: any) {
      console.error("User registration failed:", error);
      throw error;
    }
  };

  /**
   * Refresh user profile from backend
   */
  const refreshUserProfile = async () => {
    if (!user) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const { user: profile } = await getMe(token);
      setUserProfile(profile);
    } catch (error: any) {
      console.error("Failed to refresh user profile:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    registerUser,
    refreshUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

