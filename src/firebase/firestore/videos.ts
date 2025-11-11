'use client';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  Firestore,
  runTransaction,
} from 'firebase/firestore';
import type { Video, Comment, VersionStatus } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function setVideo(
  db: Firestore,
  videoId: string,
  videoData: Omit<Video, 'id'>
) {
  const videoRef = doc(db, 'videos', videoId);
  setDoc(videoRef, videoData, { merge: true }).catch((e) => {
    const permissionError = new FirestorePermissionError({
      path: videoRef.path,
      operation: 'update',
      requestResourceData: videoData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function addCommentToVersion(
  db: Firestore,
  videoId: string,
  versionId: string,
  commentData: Omit<Comment, 'id' | 'createdAt'>
) {
  const videoRef = doc(db, 'videos', videoId);
  runTransaction(db, async (transaction) => {
    const videoDoc = await transaction.get(videoRef);
    if (!videoDoc.exists()) {
      throw 'Video does not exist!';
    }

    const video = videoDoc.data() as Video;
    const versionIndex = video.versions.findIndex((v) => v.id === versionId);
    if (versionIndex === -1) {
      throw 'Version does not exist!';
    }

    const newComment = {
      ...commentData,
      id: doc(collection(db, 'videos')).id, // Generate a unique ID
      createdAt: Timestamp.now().toDate().toISOString(),
    };
    
    const newVersions = [...video.versions];
    newVersions[versionIndex].comments.push(newComment);

    transaction.update(videoRef, { versions: newVersions });
  }).catch((e) => {
    const permissionError = new FirestorePermissionError({
      path: videoRef.path,
      operation: 'update',
      requestResourceData: { comment: commentData },
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function setVersionStatus(
  db: Firestore,
  videoId: string,
  versionId: string,
  status: VersionStatus
) {
    const videoRef = doc(db, 'videos', videoId);
    runTransaction(db, async (transaction) => {
        const videoDoc = await transaction.get(videoRef);
        if (!videoDoc.exists()) {
            throw "Video does not exist!";
        }

        const video = videoDoc.data() as Video;
        const isNewActiveVersion = status === 'approved';
        
        const newVersions = video.versions.map(v => {
            if (v.id === versionId) {
                return { ...v, status, isCurrentActive: isNewActiveVersion };
            }
            if (isNewActiveVersion) {
                // If we're approving a version, all other versions are no longer active
                return { ...v, isCurrentActive: false };
            }
            return v;
        });

        transaction.update(videoRef, { versions: newVersions });

    }).catch((e) => {
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'update',
            requestResourceData: { versionId, status },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}
