'use client';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, Timestamp, type UpdateData } from 'firebase/firestore';
import { db } from '../client';
import type { Video, Comment, VersionStatus, User, Version, Annotation } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { deleteStorageFolder } from '../storage';

// Helper: read a video document
async function getVideoDoc(videoId: string): Promise<Video & { _ref: ReturnType<typeof doc> }> {
  const ref = doc(db, 'videos', videoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Video ${videoId} not found`);
  return { ...snap.data() as Video, id: snap.id, _ref: ref };
}

export async function setVideo(
  videoId: string,
  videoData: Partial<Omit<Video, 'id' | 'versions'>>,
) {
  const ref = doc(db, 'videos', videoId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(ref, videoData as any);
}

export async function updateVideoAssignedUsers(
  videoId: string,
  assignedUserIds: string[],
) {
  const ref = doc(db, 'videos', videoId);
  await updateDoc(ref, { assignedUserIds });
}

export async function deleteVideo(videoId: string) {
  try {
    await deleteStorageFolder(videoId);
  } catch {
    // Storage cleanup is best-effort
  }
  await deleteDoc(doc(db, 'videos', videoId));
}

export async function addAnnotationsToVersion(
  videoId: string,
  versionId: string,
  annotations: Omit<Annotation, 'id'>[],
) {
  const video = await getVideoDoc(videoId);
  const versions = video.versions.map(v => {
    if (v.id !== versionId) return v;
    const newAnnotations = annotations.map(a => ({
      ...a,
      id: uuidv4(),
      createdAt: a.createdAt || new Date().toISOString(),
    }));
    return { ...v, annotations: [...v.annotations, ...newAnnotations] };
  });
  await updateDoc(video._ref, { versions });
}

export async function updateAnnotationInVersion(
  videoId: string,
  versionId: string,
  updatedAnnotation: Annotation,
) {
  const video = await getVideoDoc(videoId);
  const versions = video.versions.map(v => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      annotations: v.annotations.map(a =>
        a.id === updatedAnnotation.id ? updatedAnnotation : a,
      ),
    };
  });
  await updateDoc(video._ref, { versions });
}

export async function deleteAnnotationFromVersion(
  videoId: string,
  versionId: string,
  annotationId: string,
) {
  const video = await getVideoDoc(videoId);
  const versions = video.versions.map(v => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      annotations: v.annotations.filter(a => a.id !== annotationId),
    };
  });
  await updateDoc(video._ref, { versions });
}

export async function addCommentToVersion(
  videoId: string,
  versionId: string,
  commentData: Omit<Comment, 'id' | 'createdAt' | 'author'>,
  author: Pick<User, 'id' | 'name'>,
) {
  const video = await getVideoDoc(videoId);
  const newComment: Comment = {
    id: uuidv4(),
    ...commentData,
    author,
    createdAt: new Date().toISOString(),
  };
  const versions = video.versions.map(v => {
    if (v.id !== versionId) return v;
    return { ...v, comments: [...v.comments, newComment] };
  });
  await updateDoc(video._ref, { versions });
}

export async function deleteCommentFromVersion(
  videoId: string,
  versionId: string,
  commentId: string,
) {
  const video = await getVideoDoc(videoId);
  const versions = video.versions.map(v => {
    if (v.id !== versionId) return v;
    return { ...v, comments: v.comments.filter(c => c.id !== commentId) };
  });
  await updateDoc(video._ref, { versions });
}

export async function setVersionStatus(
  videoId: string,
  versionId: string,
  status: VersionStatus,
) {
  const video = await getVideoDoc(videoId);
  const isNewActive = status === 'approved';

  const versions = video.versions.map(v => ({
    ...v,
    status: v.id === versionId ? status : v.status,
    isCurrentActive: isNewActive ? v.id === versionId : v.isCurrentActive,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { versions };
  if (isNewActive) {
    const approvedVersion = video.versions.find(v => v.id === versionId);
    if (approvedVersion) {
      updateData.videoUrl = approvedVersion.videoUrl;
    }
  }

  await updateDoc(video._ref, updateData);
}

export async function addVideo(
  videoId: string,
  newVideoData: {
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    notes?: string;
    assignedUserIds?: string[];
  },
  author: Pick<User, 'id' | 'name'>,
) {
  const firstVersion: Version = {
    id: uuidv4(),
    versionNumber: 1,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    uploader: author,
    comments: [],
    annotations: [],
    isCurrentActive: true,
    videoUrl: newVideoData.videoUrl,
    thumbnailUrl: newVideoData.thumbnailUrl,
    notes: newVideoData.notes,
  };

  const video: Omit<Video, 'id'> = {
    title: newVideoData.title,
    thumbnailUrl: newVideoData.thumbnailUrl || 'https://placehold.co/600x400/208279/FFFFFF/png?text=Video',
    thumbnailHint: 'video thumbnail',
    author,
    uploadedAt: new Date().toISOString(),
    videoUrl: newVideoData.videoUrl,
    assignedUserIds: newVideoData.assignedUserIds || [],
    isDeleted: false,
    versions: [firstVersion],
  };

  await setDoc(doc(db, 'videos', videoId), video);
}

export async function addNewVersion(
  videoId: string,
  versionData: {
    videoUrl: string;
    thumbnailUrl?: string;
    notes?: string;
  },
  uploader: Pick<User, 'id' | 'name'>,
) {
  const video = await getVideoDoc(videoId);
  const maxVersionNumber = video.versions.reduce(
    (max, v) => Math.max(max, v.versionNumber),
    0,
  );

  const newVersion: Version = {
    id: uuidv4(),
    versionNumber: maxVersionNumber + 1,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    uploader,
    comments: [],
    annotations: [],
    isCurrentActive: false,
    videoUrl: versionData.videoUrl,
    thumbnailUrl: versionData.thumbnailUrl,
    notes: versionData.notes,
  };

  await updateDoc(video._ref, {
    versions: [...video.versions, newVersion],
  });
}
