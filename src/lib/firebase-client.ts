"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from "firebase/auth";

// These values are public by design (they ship in every web/mobile Firebase app).
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const authConfigured = () => !!config.apiKey && !!config.projectId;

const auth = () => getAuth(getApps().length ? getApp() : initializeApp(config));

export async function googleIdToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth(), provider);
  return cred.user.getIdToken();
}

export const firebaseSignOut = () => signOut(auth()).catch(() => undefined);
