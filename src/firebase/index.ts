import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';

import { getFirebaseConfig } from './config';

// Note: This is a private, non-published package that provides 
// a rich, contextual error experience for Firebase Security Rules.
// import { enablePermissionMonitoring } from '@firebase/rules-unit-testing';

export async function initializeFirebase(): Promise<FirebaseApp> {
  const firebaseConfig = getFirebaseConfig();
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase config is not valid. Make sure you have set up your .env file.');
  }
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return app;
}

export { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth, useStorage } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
