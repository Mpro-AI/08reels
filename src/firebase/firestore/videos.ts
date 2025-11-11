'use client';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  Firestore,
  runTransaction,
  collection,
  writeBatch,
} from 'firebase/firestore';
import type { Video, Comment, VersionStatus, User, Version } from '@/lib/types';
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
  commentData: Omit<Comment, 'id' | 'createdAt' | 'author'>,
  author: Pick<User, 'id' | 'name'>,
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

    const newComment: Comment = {
      ...commentData,
      author,
      id: doc(collection(db, 'dummy')).id, 
      createdAt: Timestamp.now().toDate().toISOString(),
    };
    
    const newVersions = [...video.versions];
    newVersions[versionIndex].comments.push(newComment);

    transaction.update(videoRef, { versions: newVersions });
  }).catch((e) => {
    console.error("Transaction failed: ", e);
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
            // If we're approving a new version, ensure all others are not active
            if (isNewActiveVersion) {
                return { ...v, isCurrentActive: false };
            }
            return v;
        });

        const activeVideoUrl = isNewActiveVersion 
          ? newVersions.find(v => v.id === versionId)!.videoUrl 
          : video.videoUrl;

        transaction.update(videoRef, { versions: newVersions, videoUrl: activeVideoUrl });

    }).catch((e) => {
        console.error("Transaction failed: ", e);
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'update',
            requestResourceData: { versionId, status },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function addVersionToVideo(
    db: Firestore,
    videoId: string,
    videoUrl: string,
    uploader: Pick<User, 'id' | 'name'>,
    notes?: string,
  ) {
    const videoRef = doc(db, 'videos', videoId);
    try {
      await runTransaction(db, async (transaction) => {
        const videoDoc = await transaction.get(videoRef);
        if (!videoDoc.exists()) {
          throw 'Video does not exist!';
        }
  
        const video = videoDoc.data() as Video;
        const latestVersionNumber = video.versions.reduce((max, v) => Math.max(max, v.versionNumber), 0);
  
        const newVersion: Version = {
          id: doc(collection(db, 'dummy')).id,
          versionNumber: latestVersionNumber + 1,
          status: 'pending_review',
          createdAt: Timestamp.now().toDate().toISOString(),
          uploader,
          comments: [],
          annotations: [],
          isCurrentActive: false,
          videoUrl: videoUrl,
          notes,
        };
  
        const newVersions = [...video.versions, newVersion];
        transaction.update(videoRef, { 
            versions: newVersions,
            uploadedAt: Timestamp.now().toDate().toISOString() 
        });
      });
    } catch (e) {
      console.error('Transaction failed: ', e);
      const permissionError = new FirestorePermissionError({
        path: videoRef.path,
        operation: 'update',
        requestResourceData: { newVersion: '...' },
      });
      errorEmitter.emit('permission-error', permissionError);
      throw e; // Re-throw the error to be caught by the caller
    }
}

export async function addVideo(
    db: Firestore,
    videoId: string,
    newVideoData: { title: string; videoUrl: string; notes?: string },
    author: Pick<User, 'id' | 'name'>
) {
    const videoRef = doc(db, 'videos', videoId);
    try {
        const firstVersion: Version = {
            id: doc(collection(db, 'dummy')).id,
            versionNumber: 1,
            status: 'pending_review',
            createdAt: Timestamp.now().toDate().toISOString(),
            uploader: author,
            comments: [],
            annotations: [],
            isCurrentActive: true,
            videoUrl: newVideoData.videoUrl,
            notes: newVideoData.notes,
        };

        const newVideo: Omit<Video, 'id'> = {
            title: newVideoData.title,
            thumbnailUrl: 'https://placehold.co/600x400/208279/FFFFFF/png?text=Video',
            thumbnailHint: 'video placeholder',
            author: author,
            uploadedAt: Timestamp.now().toDate().toISOString(),
            versions: [firstVersion],
            videoUrl: newVideoData.videoUrl,
        };

        await setDoc(videoRef, newVideo);

    } catch (e) {
        console.error('Add video failed: ', e);
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'create',
            requestResourceData: newVideoData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    }
}
