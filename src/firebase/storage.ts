'use client';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  FirebaseStorage,
  uploadBytes,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a thumbnail from a video file.
 * @param videoFile The video file.
 * @param maxWidth The maximum width of the thumbnail.
 * @returns A promise that resolves with the thumbnail as a Blob.
 */
export async function generateVideoThumbnail(
  videoFile: File,
  maxWidth: number = 640
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return reject(new Error('Failed to get canvas context.'));
    }

    video.onloadedmetadata = () => {
      // Seek to the middle of the video
      video.currentTime = video.duration / 2;
    };

    video.onseeked = () => {
      // Calculate dimensions while maintaining aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = Math.min(maxWidth, video.videoWidth);
      canvas.height = canvas.width / aspectRatio;

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob.'));
          }
          // Clean up the object URL
          URL.revokeObjectURL(video.src);
        },
        'image/jpeg',
        0.85 // 85% quality
      );
    };

    video.onerror = (e) => {
      let errorMsg = 'An unknown error occurred while loading the video.';
      if (typeof e === 'string') {
        errorMsg = e;
      } else if (e instanceof Event && video.error) {
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMsg = 'The video loading was aborted.';
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMsg = 'A network error caused the video to fail to load.';
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMsg = 'The video could not be decoded.';
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = 'The video source format is not supported.';
            break;
          default:
            errorMsg = 'An error occurred while handling the video.';
        }
      }
      reject(new Error(errorMsg));
      URL.revokeObjectURL(video.src);
    };

    // Start loading the video
    video.src = URL.createObjectURL(videoFile);
    video.load(); // Some browsers require this
  });
}

/**
 * Uploads a thumbnail blob to Firebase Storage.
 * @param storage The Firebase Storage instance.
 * @param thumbnailBlob The thumbnail blob to upload.
 * @param videoId The ID of the video project.
 * @returns A promise that resolves with the public download URL of the thumbnail.
 */
export async function uploadThumbnail(
  storage: FirebaseStorage,
  thumbnailBlob: Blob,
  videoId: string
): Promise<string> {
  const thumbnailPath = `videos/${videoId}/thumbnail.jpg`;
  const thumbnailRef = ref(storage, thumbnailPath);
  
  await uploadBytes(thumbnailRef, thumbnailBlob);
  return getDownloadURL(thumbnailRef);
}


/**
 * Uploads a video file to Firebase Storage and returns the download URL.
 * Also generates and uploads a thumbnail.
 * @param storage The Firebase Storage instance.
 * @param file The video file to upload.
 * @param onProgress A callback function to track upload progress (0-100).
 * @param videoId The ID of the video project (optional, for organizing versions). If not provided, a new one is generated.
 * @returns A promise that resolves with the public download URL, the videoId used, and the thumbnail URL.
 */
export async function uploadVideoAndGetUrl(
  storage: FirebaseStorage,
  file: File,
  onProgress: (progress: number) => void,
  videoId?: string
): Promise<{ downloadURL: string; videoId: string; thumbnailUrl: string }> {
  const videoProjectId = videoId || uuidv4();

  // 1. Generate and upload thumbnail first
  let thumbnailUrl = 'https://placehold.co/600x400/208279/FFFFFF/png?text=Video'; // Fallback
  try {
    const thumbnailBlob = await generateVideoThumbnail(file);
    thumbnailUrl = await uploadThumbnail(storage, thumbnailBlob, videoProjectId);
  } catch (error) {
    console.error('Thumbnail generation failed, using fallback.', error);
  }

  // 2. Proceed with video upload
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
          resolve({ downloadURL, videoId: videoProjectId, thumbnailUrl });
        } catch (error) {
           console.error('Failed to get download URL:', error);
           reject(error);
        }
      }
    );
  });
}


/**
 * Uploads an image for an annotation to Firebase Storage.
 * @param storage The Firebase Storage instance.
 * @param file The image file to upload.
 * @param videoId The ID of the video project.
 * @param versionId The ID of the version.
 * @returns A promise that resolves with the public download URL of the image.
 */
export async function uploadAnnotationImage(
  storage: FirebaseStorage,
  file: File,
  videoId: string,
  versionId: string,
): Promise<string> {
  const annotationImageId = uuidv4();
  const storagePath = `videos/${videoId}/versions/${versionId}/annotations/${annotationImageId}-${file.name}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: handle progress if needed in the UI
      },
      (error) => {
        console.error('Annotation image upload failed:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Failed to get annotation image download URL:', error);
          reject(error);
        }
      }
    );
  });
}
