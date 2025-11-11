import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

import { getFirebaseConfig } from './config';

// Note: This is a private, non-published package that provides 
// a rich, contextual error experience for Firebase Security Rules.
// import { enablePermissionMonitoring } from '@firebase/rules-unit-testing';

export async function initializeFirebase(): Promise<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}> {
  const firebaseConfig = getFirebaseConfig();
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Note: This is a private, non-published package that provides
  // a rich, contextual error experience for Firebase Security Rules.
  // await enablePermissionMonitoring(firestore);

  return { app, auth, firestore, storage };
}

export { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth, useStorage } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
export { getStorage, signInAnonymously, onAuthStateChanged, signOut };
