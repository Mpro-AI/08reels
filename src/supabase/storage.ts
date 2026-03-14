'use client';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Verifies if a video URL supports Range requests.
 */
export async function verifyRangeSupport(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'Range': 'bytes=0-0' },
    });

    const acceptRanges = response.headers.get('Accept-Ranges');
    const contentType = response.headers.get('Content-Type');

    const supportsRange = (
      (response.status === 206 || acceptRanges === 'bytes') &&
      (contentType?.startsWith('video/') ?? false)
    );

    return supportsRange;
  } catch (error) {
    console.error('Range Support check failed:', error);
    return false;
  }
}

/**
 * Generates a thumbnail from a video file.
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
        0.85
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

    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}

/**
 * Uploads a thumbnail blob to Supabase Storage.
 */
export async function uploadThumbnail(
  supabase: SupabaseClient,
  thumbnailBlob: Blob,
  videoId: string,
  versionNumber?: number,
): Promise<string> {
  const thumbnailPath = versionNumber
    ? `${videoId}/versions/v${versionNumber.toString().padStart(2, '0')}_thumbnail.jpg`
    : `${videoId}/thumbnail.jpg`;

  const { error } = await supabase.storage
    .from('videos')
    .upload(thumbnailPath, thumbnailBlob, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
      upsert: true,
    });

  if (error) {
    console.error('uploadThumbnail failed:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(thumbnailPath);

  return publicUrl;
}

/**
 * Uploads a video file to Supabase Storage and returns the download URL.
 * Also generates and uploads a thumbnail.
 */
export async function uploadVideoAndGetUrl(
  supabase: SupabaseClient,
  file: File,
  onProgress: (progress: number) => void,
  videoId?: string,
  versionNumber?: number,
): Promise<{ videoUrl: string; videoId: string; thumbnailUrl: string }> {
  const videoProjectId = videoId || uuidv4();

  let thumbnailUrl = `https://placehold.co/600x400/208279/FFFFFF/png?text=Video`;
  try {
    const thumbnailBlob = await generateVideoThumbnail(file);
    const thumbUrl = await uploadThumbnail(supabase, thumbnailBlob, videoProjectId, versionNumber);
    if (!versionNumber || versionNumber === 1) {
      thumbnailUrl = thumbUrl;
    }
  } catch (error) {
    console.error('Thumbnail generation failed, using fallback.', error);
  }

  const versionIdForPath = versionNumber ? `v${versionNumber.toString().padStart(2, '0')}` : 'v01';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${videoProjectId}/versions/${versionIdForPath}/${cleanFileName}`;

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

  // Supabase JS client doesn't have native progress tracking for uploads,
  // so we use XMLHttpRequest for progress
  onProgress(0);

  const { error } = await supabase.storage
    .from('videos')
    .upload(storagePath, file, {
      contentType: getVideoContentType(file.name),
      cacheControl: 'public, max-age=31536000',
      upsert: true,
    });

  if (error) {
    console.error('Upload failed:', error);
    throw error;
  }

  onProgress(100);

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(storagePath);

  return { videoUrl: publicUrl, videoId: videoProjectId, thumbnailUrl };
}

/**
 * Uploads an image for an annotation to Supabase Storage.
 */
export async function uploadAnnotationImage(
  supabase: SupabaseClient,
  file: File,
  videoId: string,
  versionId: string,
): Promise<string> {
  const annotationImageId = uuidv4();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${videoId}/versions/${versionId}/annotations/${annotationImageId}-${cleanFileName}`;

  const { error } = await supabase.storage
    .from('videos')
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    });

  if (error) {
    console.error('Annotation image upload failed:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(storagePath);

  return publicUrl;
}
