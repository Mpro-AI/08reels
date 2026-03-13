'use client';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from './client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a thumbnail from a video file.
 */
export async function generateVideoThumbnail(
  videoFile: File,
  maxWidth: number = 640,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return reject(new Error('Failed to get canvas context.'));
    }

    video.onloadedmetadata = () => {
      video.currentTime = video.duration / 2;
    };

    video.onseeked = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = Math.min(maxWidth, video.videoWidth);
      canvas.height = canvas.width / aspectRatio;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob.'));
          }
          URL.revokeObjectURL(video.src);
        },
        'image/jpeg',
        0.85,
      );
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail generation.'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}

/**
 * Uploads a thumbnail blob to Firebase Storage.
 */
export async function uploadThumbnail(
  thumbnailBlob: Blob,
  videoId: string,
  versionNumber?: number,
): Promise<string> {
  const path = versionNumber
    ? `videos/${videoId}/versions/v${versionNumber.toString().padStart(2, '0')}_thumbnail.jpg`
    : `videos/${videoId}/thumbnail.jpg`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, thumbnailBlob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Uploads a video file to Firebase Storage and returns the download URL.
 */
export async function uploadVideoAndGetUrl(
  file: File,
  onProgress: (progress: number) => void,
  videoId?: string,
  versionNumber?: number,
): Promise<{ videoUrl: string; videoId: string; thumbnailUrl: string }> {
  const videoProjectId = videoId || uuidv4();

  let thumbnailUrl = 'https://placehold.co/600x400/208279/FFFFFF/png?text=Video';
  try {
    const thumbnailBlob = await generateVideoThumbnail(file);
    const thumbUrl = await uploadThumbnail(thumbnailBlob, videoProjectId, versionNumber);
    if (!versionNumber || versionNumber === 1) {
      thumbnailUrl = thumbUrl;
    }
  } catch {
    // Thumbnail generation failed, use fallback
  }

  const versionIdForPath = versionNumber ? `v${versionNumber.toString().padStart(2, '0')}` : 'v01';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `videos/${videoProjectId}/versions/${versionIdForPath}/${cleanFileName}`;

  onProgress(0);

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'video/mp4',
  });

  onProgress(100);

  const videoUrl = await getDownloadURL(storageRef);
  return { videoUrl, videoId: videoProjectId, thumbnailUrl };
}

/**
 * Uploads an image for an annotation to Firebase Storage.
 */
export async function uploadAnnotationImage(
  file: File,
  videoId: string,
  versionId: string,
): Promise<string> {
  const annotationImageId = uuidv4();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `videos/${videoId}/versions/${versionId}/annotations/${annotationImageId}-${cleanFileName}`;

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/**
 * Recursively deletes all files in a storage folder.
 */
export async function deleteStorageFolder(folderPath: string): Promise<void> {
  const folderRef = ref(storage, `videos/${folderPath}`);
  try {
    const result = await listAll(folderRef);
    await Promise.all([
      ...result.items.map(item => deleteObject(item)),
      ...result.prefixes.map(prefix => deleteStorageFolder(prefix.fullPath.replace(/^videos\//, ''))),
    ]);
  } catch {
    // Best-effort cleanup
  }
}
