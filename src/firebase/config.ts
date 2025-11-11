// This file is intentionally left blank. 
// The Firebase configuration will be populated during the build process.
// For local development, you can add your configuration here.
// DO NOT COMMIT YOUR CONFIGURATION TO VERSION CONTROL.
export const getFirebaseConfig = () => {
  // NOTE: This is a temporary solution to bypass environment variable loading issues.
  // In a standard Next.js project, these values should be loaded from a .env file.
  return {
    apiKey: "YOUR_API_KEY",
    authDomain: "reels-08-c3492.firebaseapp.com",
    projectId: "reels-08-c3492",
    storageBucket: "reels-08-c3492.appspot.com",
    messagingSenderId: "362923762233",
    appId: "1:362923762233:web:9b8f3c7e7d6a3b1e8d4f3c",
  };
};
