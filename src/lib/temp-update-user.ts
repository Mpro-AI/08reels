'use client';

import { doc, updateDoc, Firestore } from 'firebase/firestore';

let hasRun = false;

export const temp_updateUserName = async (db: Firestore) => {
  if (hasRun) {
    return;
  }

  const userId = 'VPkSokn932hWjebe6HpAqEcUWnX2';
  const newName = 'Mance';

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      name: newName,
    });
    console.log(`✅ Successfully updated user ${userId} to name: ${newName}`);
  } catch (error) {
    console.error(`❌ Failed to update user name for ${userId}:`, error);
  } finally {
    hasRun = true;
  }
};
