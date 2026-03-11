'use client';
import { useState, useEffect, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

import { initializeFirebase, FirebaseProvider } from '@/firebase';

type FirebaseClientProviderProps = {
  children: ReactNode;
};

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const [firebase, setFirebase] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const app = await initializeFirebase();
        const auth = getAuth(app);
        const firestore = getFirestore(app);

        // ✅ 使用指定的 Storage bucket
        const storage = getStorage(app, 'gs://studio-3640087795-37708.firebasestorage.app');

        console.log('📦 Storage Bucket Initialized:', storage.app.options.storageBucket);

        setFirebase({ app, auth, firestore, storage });
      } catch (error) {
        console.error("Firebase initialization failed:", error);
        // You might want to show an error message to the user here
      }
    };

    init();
  }, []);

  if (!firebase) {
    // You can render a loader here if you want
    return null;
  }

  return (
    <FirebaseProvider
      app={firebase.app}
      auth={firebase.auth}
      firestore={firebase.firestore}
      storage={firebase.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
