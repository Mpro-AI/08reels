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
 * 驗證視頻 URL 是否支持 Range requests
 * @param url 視頻 URL
 * @returns Promise<boolean> 是否支持 Range requests
 */
export async function verifyRangeSupport(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Range': 'bytes=0-0',
      },
    });

    const acceptRanges = response.headers.get('Accept-Ranges');
    const contentRange = response.headers.get('Content-Range');
    const contentType = response.headers.get('Content-Type');

    console.log('📊 Range Support 檢查:');
    console.log('  - Accept-Ranges:', acceptRanges);
    console.log('  - Content-Range:', contentRange);
    console.log('  - Content-Type:', contentType);
    console.log('  - Status:', response.status);

    // Firebase Storage 應該返回 206 Partial Content 且 Accept-Ranges: bytes
    const supportsRange = (
      (response.status === 206 || acceptRanges === 'bytes') &&
      contentType?.startsWith('video/')
    );

    if (supportsRange) {
      console.log('✅ Range requests 支持正常');
    } else {
      console.warn('⚠️ Range requests 可能不支持');
    }

    return supportsRange;
  } catch (error) {
    console.error('❌ Range Support 檢查失敗:', error);
    return false;
  }
}

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
 * @param versionNumber Optional version number for version-specific thumbnails.
 * @returns A promise that resolves with the public download URL of the thumbnail.
 */
export async function uploadThumbnail(
  storage: FirebaseStorage,
  thumbnailBlob: Blob,
  videoId: string,
  versionNumber?: number,
): Promise<string> {
  const thumbnailPath = versionNumber
    ? `videos/${videoId}/versions/v${versionNumber.toString().padStart(2, '0')}_thumbnail.jpg`
    : `videos/${videoId}/thumbnail.jpg`;
    
  const thumbnailRef = ref(storage, thumbnailPath);
  
  const metadata = {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000', // Cache for 1 year
  };
  await uploadBytes(thumbnailRef, thumbnailBlob, metadata);
  return getDownloadURL(thumbnailRef);
}


/**
 * Uploads a video file to Firebase Storage and returns the download URL.
 * Also generates and uploads a thumbnail.
 * @param storage The Firebase Storage instance.
 * @param file The video file to upload.
 * @param onProgress A callback function to track upload progress (0-100).
 * @param videoId The ID of the video project (optional). If not provided, a new one is generated.
 * @param versionNumber The version number (optional). If provided, it's a new version.
 * @returns A promise that resolves with the video URL, videoId, and thumbnail URL.
 */
export async function uploadVideoAndGetUrl(
  storage: FirebaseStorage,
  file: File,
  onProgress: (progress: number) => void,
  videoId?: string,
  versionNumber?: number,
): Promise<{ videoUrl: string; videoId: string; thumbnailUrl: string }> {
  const videoProjectId = videoId || uuidv4();

  let thumbnailUrl = `https://placehold.co/600x400/208279/FFFFFF/png?text=Video`;
  try {
    const thumbnailBlob = await generateVideoThumbnail(file);
    // If it's a new video project, upload a main thumbnail.
    // If it's a new version, upload a version-specific thumbnail.
    const thumbUrl = await uploadThumbnail(storage, thumbnailBlob, videoProjectId, versionNumber);
    // Only update the main thumbnail URL if it's the first version.
    if (!versionNumber || versionNumber === 1) {
        thumbnailUrl = thumbUrl;
    }
  } catch (error) {
    console.error('Thumbnail generation failed, using fallback.', error);
  }

  const versionIdForPath = versionNumber ? `v${versionNumber.toString().padStart(2, '0')}` : 'v01';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `videos/${videoProjectId}/versions/${versionIdForPath}/${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  // 根據文件擴展名確定正確的 Content-Type
  // 這比依賴 file.type 更可靠，因為瀏覽器可能不正確識別
  const getVideoContentType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'm4v': 'video/x-m4v',
    };
    return mimeTypes[ext || ''] || file.type || 'video/mp4';
  };

  const metadata = {
    contentType: getVideoContentType(file.name),
    cacheControl: 'public, max-age=31536000', // Cache for 1 year
    // Firebase Storage 默認支持 Range requests，無需額外設置
    // 但確保不會被覆蓋
    customMetadata: {
      originalFileName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

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
          const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // 驗證視頻 URL 是否支持 Range requests（開發/調試用）
          console.log('📹 視頻上傳完成，驗證 Range support...');
          verifyRangeSupport(videoUrl).catch(err => {
            console.warn('Range support 驗證失敗（不影響上傳）:', err);
          });

          resolve({ videoUrl, videoId: videoProjectId, thumbnailUrl });
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
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `videos/${videoId}/versions/${versionId}/annotations/${annotationImageId}-${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000', // Cache for 1 year
  };
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

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
