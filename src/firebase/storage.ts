'use client';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a video file to Firebase Storage and returns the download URL.
 * @param storage The Firebase Storage instance.
 * @param file The video file to upload.
 * @param onProgress A callback function to track upload progress (0-100).
 * @param videoId The ID of the video project (optional, for organizing versions). If not provided, a new one is generated.
 * @returns A promise that resolves with the public download URL and the videoId used.
 */
export async function uploadVideoAndGetUrl(
  storage: FirebaseStorage,
  file: File,
  onProgress: (progress: number) => void,
  videoId?: string
): Promise<{ downloadURL: string; videoId: string }> {
  const videoProjectId = videoId || uuidv4();
  const versionId = uuidv4();
  const storagePath = `videos/${videoProjectId}/versions/${versionId}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        onProgress(100);
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadURL, videoId: videoProjectId });
        } catch (error) {
           console.error('Failed to get download URL:', error);
           reject(error);
        }
      }
    );
  });
}
