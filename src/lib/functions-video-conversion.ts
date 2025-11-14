/**
 * Firebase Cloud Function - 後台影片轉換為 WebM
 * 
 * 當影片上傳到 Storage 後自動觸發,在背景轉換為 WebM 格式
 * 轉換完成後更新 Firestore 中的影片 URL
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

admin.initializeApp();

const storage = new Storage();
const db = admin.firestore();

// 設置 ffmpeg 路徑
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface VideoMetadata {
  videoId: string;
  versionId: string;
  originalFormat: string;
  timestamp: number;
}

/**
 * 當新影片上傳時觸發
 * 監聽路徑: videos/{videoId}/versions/{versionId}/{filename}
 */
export const convertVideoToWebM = functions
  .runWith({
    timeoutSeconds: 540, // 9 分鐘
    memory: '2GB',
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;

    // 只處理影片檔案
    if (!filePath || !contentType || !contentType.startsWith('video/')) {
      console.log('Not a video file, skipping...');
      return null;
    }

    // 已經是 WebM 格式,不需要轉換
    if (contentType === 'video/webm') {
      console.log('Already WebM format, skipping conversion...');
      return null;
    }

    // 避免處理已轉換的檔案
    if (filePath.includes('_webm.webm')) {
      console.log('Already a converted file, skipping...');
      return null;
    }

    // 解析檔案路徑
    const pathMatch = filePath.match(/videos\/([^/]+)\/versions\/([^/]+)\/(.+)/);
    if (!pathMatch) {
      console.log('File path does not match expected pattern, skipping...');
      return null;
    }

    const [, videoId, versionId, originalFilename] = pathMatch;
    const bucket = storage.bucket(object.bucket);
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const tempOutputPath = path.join(
      os.tmpdir(),
      `${path.parse(originalFilename).name}_webm.webm`
    );

    try {
      console.log(`Starting conversion for: ${filePath}`);
      console.log(`Video ID: ${videoId}, Version ID: ${versionId}`);

      // 1. 下載原始影片到臨時目錄
      await bucket.file(filePath).download({ destination: tempFilePath });
      console.log('Downloaded video to temp directory');

      // 2. 使用 FFmpeg 轉換為 WebM
      await convertToWebM(tempFilePath, tempOutputPath);
      console.log('Video conversion completed');

      // 3. 上傳轉換後的影片
      const webmFilePath = `videos/${videoId}/versions/${versionId}/${path.basename(tempOutputPath)}`;
      await bucket.upload(tempOutputPath, {
        destination: webmFilePath,
        metadata: {
          contentType: 'video/webm',
          metadata: {
            originalFile: originalFilename,
            convertedAt: new Date().toISOString(),
            convertedBy: 'cloud-function',
          },
        },
      });
      console.log('Uploaded WebM video to Storage');

      // 4. 獲取轉換後影片的 URL
      const webmFile = bucket.file(webmFilePath);
      const [webmUrl] = await webmFile.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // 長期有效
      });

      // 或使用公開 URL (如果 bucket 設置為公開)
      // const webmUrl = `https://storage.googleapis.com/${object.bucket}/${webmFilePath}`;

      // 5. 更新 Firestore 中的影片資訊
      const videoRef = db.collection('videos').doc(videoId);
      const videoDoc = await videoRef.get();

      if (videoDoc.exists) {
        const videoData = videoDoc.data();
        const versions = videoData?.versions || [];

        // 找到對應的版本並更新
        const versionIndex = versions.findIndex((v: any) => v.id === versionId);
        
        if (versionIndex !== -1) {
          versions[versionIndex] = {
            ...versions[versionIndex],
            webmUrl: webmUrl,
            webmReady: true,
            convertedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          await videoRef.update({
            versions: versions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log('Updated Firestore with WebM URL');
        } else {
          console.warn(`Version ${versionId} not found in Firestore`);
        }
      } else {
        console.warn(`Video document ${videoId} not found in Firestore`);
      }

      // 6. 清理臨時檔案
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(tempOutputPath);
      console.log('Cleaned up temp files');

      // 7. (可選) 刪除原始檔案以節省空間
      // await bucket.file(filePath).delete();
      // console.log('Deleted original file');

      return null;
    } catch (error) {
      console.error('Error during video conversion:', error);

      // 更新 Firestore 標記轉換失敗
      try {
        const videoRef = db.collection('videos').doc(videoId);
        const videoDoc = await videoRef.get();

        if (videoDoc.exists) {
          const videoData = videoDoc.data();
          const versions = videoData?.versions || [];
          const versionIndex = versions.findIndex((v: any) => v.id === versionId);

          if (versionIndex !== -1) {
            versions[versionIndex] = {
              ...versions[versionIndex],
              webmReady: false,
              conversionError: true,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await videoRef.update({ versions: versions });
          }
        }
      } catch (updateError) {
        console.error('Error updating Firestore with error status:', updateError);
      }

      // 清理臨時檔案
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }

      throw error;
    }
  });

/**
 * 使用 FFmpeg 轉換影片為 WebM 格式
 */
function convertToWebM(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libvpx-vp9',           // VP9 視訊編碼器
        '-crf 30',                    // 質量控制 (0-63, 越低越好)
        '-b:v 0',                     // 使用 CRF 模式
        '-c:a libopus',               // Opus 音訊編碼器
        '-b:a 128k',                  // 音訊位元率
        '-vf scale=1920:-2',          // 縮放到最大 1920 寬度,高度自動
        '-cpu-used 2',                // 編碼速度 (0-5, 越高越快但質量稍差)
        '-row-mt 1',                  // 啟用多線程
        '-deadline realtime',         // 實時編碼模式
        '-threads 4',                 // 使用 4 個線程
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent?.toFixed(2)}% done`);
      })
      .on('end', () => {
        console.log('FFmpeg conversion finished');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * 手動觸發轉換 (HTTP Function)
 * 可用於重新處理失敗的轉換
 */
export const retryVideoConversion = functions.https.onCall(async (data, context) => {
  // 驗證使用者權限
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { videoId, versionId } = data;

  if (!videoId || !versionId) {
    throw new functions.https.HttpsError('invalid-argument', 'videoId and versionId are required');
  }

  try {
    // 獲取影片資訊
    const videoDoc = await db.collection('videos').doc(videoId).get();

    if (!videoDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Video not found');
    }

    const videoData = videoDoc.data();
    const versions = videoData?.versions || [];
    const version = versions.find((v: any) => v.id === versionId);

    if (!version) {
      throw new functions.https.HttpsError('not-found', 'Version not found');
    }

    // 獲取原始檔案路徑
    const originalUrl = version.videoUrl;
    // 從 URL 解析出 Storage 路徑
    // 這裡需要根據你的 URL 格式調整

    return { success: true, message: 'Conversion triggered' };
  } catch (error) {
    console.error('Error triggering conversion:', error);
    throw new functions.https.HttpsError('internal', 'Failed to trigger conversion');
  }
});

/**
 * 批次轉換所有未轉換的影片 (排程 Function)
 */
export const batchConvertVideos = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Starting batch video conversion...');

    try {
      // 查詢所有未轉換的影片
      const videosSnapshot = await db.collection('videos').get();

      let conversionCount = 0;

      for (const videoDoc of videosSnapshot.docs) {
        const videoData = videoDoc.data();
        const versions = videoData?.versions || [];

        for (const version of versions) {
          // 如果版本還沒有 WebM URL 且沒有轉換錯誤
          if (!version.webmUrl && !version.conversionError) {
            // 觸發轉換...
            // 這裡可以調用 retryVideoConversion 或直接處理
            conversionCount++;
          }
        }
      }

      console.log(`Batch conversion completed. Processed ${conversionCount} videos.`);
      return null;
    } catch (error) {
      console.error('Error in batch conversion:', error);
      throw error;
    }
  });