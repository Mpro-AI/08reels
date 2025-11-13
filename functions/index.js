/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Initialize Firebase Admin SDK
admin.initializeApp();


// Cloud Function 觸發器：當有檔案上傳到 Cloud Storage 時
exports.optimizeVideo = functions.runWith({
  timeoutSeconds: 300, // 增加超時時間以處理影片
  memory: '1GB'        // 分配更多記憶體
}).storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;

  // 1. 檢查觸發條件
  if (!filePath || !contentType || !contentType.startsWith('video/')) {
    functions.logger.log('非影片檔案或刪除事件，退出處理。');
    return null;
  }

  // 避免無限循環
  if (filePath.includes('_optimized.')) {
    functions.logger.log('已優化檔案，退出處理。');
    return null;
  }
  
  // 僅處理 videos/ 目錄下的原始上傳檔案
  const pathParts = filePath.split('/');
  // Expected path: videos/{videoId}/versions/{versionId}/{fileName}
  if (pathParts[0] !== 'videos' || pathParts[2] !== 'versions') {
      functions.logger.log(`檔案路徑 ${filePath} 不在 'videos/{id}/versions/{id}/' 結構中，忽略。`);
      return null;
  }


  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const optimizedFileName = `${path.parse(fileName).name}_optimized.mp4`;
  const optimizedTempFilePath = path.join(os.tmpdir(), optimizedFileName);
  const optimizedFilePath = path.join(path.dirname(filePath), optimizedFileName);

  // 2. 下載原始影片
  functions.logger.log(`下載 ${filePath} 到 ${tempFilePath}...`);
  try {
    await bucket.file(filePath).download({ destination: tempFilePath });
    functions.logger.log('影片下載完成。');
  } catch (error) {
    functions.logger.error('影片下載失敗:', error);
    return null;
  }

  // 3. 執行 FFmpeg 進行影片優化
  functions.logger.log(`開始 FFmpeg 優化 ${tempFilePath}...`);
  try {
    await new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', tempFilePath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        optimizedTempFilePath
      ];

      // Assuming ffmpeg is in the PATH. For production, you'd bundle a static binary.
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.stdout.on('data', (data) => {
        functions.logger.log(`FFmpeg stdout: ${data}`);
      });

      ffmpegProcess.stderr.on('data', (data) => {
        functions.logger.info(`FFmpeg stderr: ${data}`);
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          functions.logger.log('FFmpeg 優化成功完成。');
          resolve();
        } else {
          functions.logger.error(`FFmpeg 進程以代碼 ${code} 退出`);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        functions.logger.error(`FFmpeg 進程錯誤: ${err.message}. Make sure ffmpeg is installed in your function environment.`);
        reject(err);
      });
    });
  } catch (error) {
    functions.logger.error('影片優化失敗:', error);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (fs.existsSync(optimizedTempFilePath)) fs.unlinkSync(optimizedTempFilePath);
    return null;
  }

  // 4. 上傳優化後的影片
  functions.logger.log(`上傳優化後的影片從 ${optimizedTempFilePath} 到 ${optimizedFilePath}...`);
  try {
    await bucket.upload(optimizedTempFilePath, {
      destination: optimizedFilePath,
      metadata: { contentType: 'video/mp4' },
    });
    functions.logger.log('優化影片上傳成功。');
  } catch (error) {
    functions.logger.error('優化影片上傳失敗:', error);
    return null;
  }

  // 5. 更新 Firestore 中的影片 URL
  try {
      const optimizedUrl = await bucket.file(optimizedFilePath).getSignedUrl({
          action: 'read',
          expires: '03-09-2491' // A long time in the future
      });
      
      const videoId = pathParts[1];
      const versionId = pathParts[3]; // The original filename is the version ID
      const videoRef = admin.firestore().collection('videos').doc(videoId);
      
      const videoDoc = await videoRef.get();
      if (videoDoc.exists) {
          const videoData = videoDoc.data();
          const versions = videoData.versions;
          const versionIndex = versions.findIndex(v => v.id === versionId || v.videoUrl.includes(fileName));
          
          if (versionIndex > -1) {
              versions[versionIndex].videoUrl = optimizedUrl[0];
              await videoRef.update({ versions: versions });
              functions.logger.log(`Firestore document for video ${videoId}, version ${versionIndex} updated.`);
          } else {
               functions.logger.warn(`Could not find matching version for ${fileName} in video ${videoId}`);
          }
      }
  } catch(error) {
      functions.logger.error('更新 Firestore 失敗:', error);
  }


  // 6. 清理本地臨時檔案
  try {
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(optimizedTempFilePath);
    functions.logger.log('臨時檔案已清理。');
  } catch (error) {
    functions.logger.warn('清理臨時檔案時發生錯誤:', error);
  }
  
  // 7. 可選：刪除原始影片
  try {
    await bucket.file(filePath).delete();
    functions.logger.log('原始影片已刪除。');
  } catch (error) {
    functions.logger.warn('刪除原始影片時發生錯誤:', error);
  }

  return null;
});
