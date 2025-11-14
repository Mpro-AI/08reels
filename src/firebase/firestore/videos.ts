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
  deleteDoc,
} from 'firebase/firestore';
import { FirebaseStorage, ref, listAll, deleteObject } from 'firebase/storage';
import type { Video, Comment, VersionStatus, User, Version, Annotation } from '@/lib/types';
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

export function updateVideoAssignedUsers(
    db: Firestore,
    videoId: string,
    assignedUserIds: string[]
) {
    const videoRef = doc(db, 'videos', videoId);
    updateDoc(videoRef, { assignedUserIds }).catch((e) => {
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'update',
            requestResourceData: { assignedUserIds },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteVideo(
    db: Firestore,
    storage: FirebaseStorage,
    videoId: string
) {
    // 1. Delete all files from Firebase Storage
    const videoFolderRef = ref(storage, `videos/${videoId}`);
    try {
        const res = await listAll(videoFolderRef);
        const deletePromises = res.items.map((itemRef) => deleteObject(itemRef));
        // Recursively delete subfolders (versions)
        for (const folderRef of res.prefixes) {
            const subFolderRes = await listAll(folderRef);
            subFolderRes.items.forEach((itemRef) => deletePromises.push(deleteObject(itemRef)));
        }
        await Promise.all(deletePromises);
        console.log(`Successfully deleted all files for video ${videoId} from storage.`);
    } catch (error) {
        console.error(`Failed to delete files from storage for video ${videoId}:`, error);
        // We will still proceed to delete the Firestore doc, but we log the error.
        // In a real-world app, you might want more robust error handling here.
    }

    // 2. Delete the document from Firestore
    const videoRef = doc(db, 'videos', videoId);
    deleteDoc(videoRef).catch((e) => {
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Re-throw the error if you want the caller to handle it
        throw e;
    });
}


export function addAnnotationsToVersion(
  db: Firestore,
  videoId: string,
  versionId: string,
  annotations: Omit<Annotation, 'id'>[],
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
        
        const newAnnotationsWithIds: Annotation[] = annotations.map(anno => ({
            ...anno,
            id: doc(collection(db, 'dummy')).id,
        } as Annotation));

        const newVersions = [...video.versions];
        if (!newVersions[versionIndex].annotations) {
          newVersions[versionIndex].annotations = [];
        }
        newVersions[versionIndex].annotations.push(...newAnnotationsWithIds);

        transaction.update(videoRef, { versions: newVersions });
    }).catch((e) => {
        console.error("Transaction failed: ", e);
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'update',
            requestResourceData: { annotations },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export function updateAnnotationInVersion(
    db: Firestore,
    videoId: string,
    versionId: string,
    updatedAnnotation: Annotation,
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

        const newVersions = [...video.versions];
        const annotationIndex = newVersions[versionIndex].annotations.findIndex(a => a.id === updatedAnnotation.id);
        if (annotationIndex === -1) {
            throw 'Annotation does not exist!';
        }
        
        newVersions[versionIndex].annotations[annotationIndex] = updatedAnnotation;

        transaction.update(videoRef, { versions: newVersions });
    }).catch((e) => {
        console.error("Transaction for updating annotation failed: ", e);
        const permissionError = new FirestorePermissionError({
            path: videoRef.path,
            operation: 'update',
            requestResourceData: { updatedAnnotation },
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

export function deleteCommentFromVersion(
  db: Firestore,
  videoId: string,
  versionId: string,
  commentId: string
) {
  const videoRef = doc(db, "videos", videoId);
  runTransaction(db, async (transaction) => {
    const videoDoc = await transaction.get(videoRef);
    if (!videoDoc.exists()) {
      throw "Video does not exist!";
    }

    const video = videoDoc.data() as Video;
    const versionIndex = video.versions.findIndex((v) => v.id === versionId);
    if (versionIndex === -1) {
      throw "Version does not exist!";
    }

    const newVersions = [...video.versions];
    const currentComments = newVersions[versionIndex].comments;
    newVersions[versionIndex].comments = currentComments.filter(c => c.id !== commentId);

    transaction.update(videoRef, { versions: newVersions });
  }).catch((e) => {
    console.error("Transaction failed: ", e);
    const permissionError = new FirestorePermissionError({
        path: videoRef.path,
        operation: 'update',
        requestResourceData: { deleteCommentId: commentId },
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

export async function addVideo(
    db: Firestore,
    videoId: string,
    newVideoData: { title: string; videoUrl: string; thumbnailUrl?: string; notes?: string; assignedUserIds?: string[]; },
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
            thumbnailUrl: newVideoData.thumbnailUrl, // Also save thumbnail for first version
            notes: newVideoData.notes,
        };

        const newVideo: Omit<Video, 'id'> = {
            title: newVideoData.title,
            thumbnailUrl: newVideoData.thumbnailUrl || 'https://placehold.co/600x400/208279/FFFFFF/png?text=Video',
            thumbnailHint: 'video thumbnail', // Keep this simple as the thumbnail is now literal
            author: author,
            uploadedAt: Timestamp.now().toDate().toISOString(),
            versions: [firstVersion],
            videoUrl: newVideoData.videoUrl,
            assignedUserIds: newVideoData.assignedUserIds || [],
            isDeleted: false,
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

/**
 * Adds a new version to a video project.
 * @param db Firestore instance
 * @param videoId The ID of the video to update
 * @param versionData Data for the new version
 * @param uploader The user uploading the new version
 */
export async function addNewVersion(
    db: Firestore,
    videoId: string,
    versionData: {
      videoUrl: string;
      thumbnailUrl?: string;
      notes?: string;
    },
    uploader: Pick<User, 'id' | 'name'>
  ): Promise<void> {
    const videoRef = doc(db, 'videos', videoId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const videoDoc = await transaction.get(videoRef);
        
        if (!videoDoc.exists()) {
          throw new Error('影片不存在');
        }
  
        const video = videoDoc.data() as Video;
        
        const maxVersionNumber = Math.max(0, ...video.versions.map((v) => v.versionNumber));
        const newVersionNumber = maxVersionNumber + 1;
  
        const newVersion: Version = {
          id: doc(collection(db, 'dummy')).id,
          versionNumber: newVersionNumber,
          status: 'pending_review',
          createdAt: Timestamp.now().toDate().toISOString(),
          uploader: uploader,
          comments: [],
          annotations: [],
          isCurrentActive: false,
          videoUrl: versionData.videoUrl,
          thumbnailUrl: versionData.thumbnailUrl,
          notes: versionData.notes,
        };
  
        const updatedVersions = [...video.versions, newVersion];
  
        transaction.update(videoRef, {
          versions: updatedVersions,
        });
      });
    } catch (error) {
      console.error('Add new version failed:', error);
      const permissionError = new FirestorePermissionError({
        path: videoRef.path,
        operation: 'update',
        requestResourceData: { newVersion: versionData },
      });
      errorEmitter.emit('permission-error', permissionError);
      throw error;
    }
  }
  
