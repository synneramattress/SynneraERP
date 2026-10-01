import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getSecondaryAuth(): Auth {
  const secondaryAppName = "SynneraSecondaryAdminAuth";
  let secondaryApp: FirebaseApp;

  if (!getApps().some((app) => app.name === secondaryAppName)) {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  } else {
    secondaryApp = getApp(secondaryAppName);
  }

  return getAuth(secondaryApp);
}

/** Create a Firebase Auth user (for Party or Employee) without signing the current admin out. */
export async function createAuthUser(email: string, pass: string): Promise<string> {
  const secondaryAuth = getSecondaryAuth();
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
  await secondaryAuth.signOut();
  return userCredential.user.uid;
}

/** @deprecated Use createAuthUser instead */
export async function createPartyAuthUser(email: string, pass: string): Promise<string> {
  return createAuthUser(email, pass);
}
