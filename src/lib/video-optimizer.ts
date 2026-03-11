'use client';

export interface VideoOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: number; // bps
  targetFormat?: 'webm' | 'mp4';
  codec?: string;
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: Required<VideoOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  videoBitrate: 2500000, // 2.5 Mbps
  targetFormat: 'webm',
  codec: 'vp9',
  onProgress: () => {},
};

/**
 * 優化影片以供網路使用
 * 將影片轉換為 WebM 格式,並可選擇性地調整解析度和位元率
 * 
 * @param file 原始影片檔案
 * @param options 優化選項
 * @returns Promise<Blob> 優化後的影片 Blob
 */
export async function optimizeVideoForWeb(
  file: File,
  options: VideoOptimizationOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return reject(new Error('無法獲取 Canvas 上下文'));
    }
    
    video.src = URL.createObjectURL(file);
    video.muted = true; // 避免自動播放限制
    
    video.onloadedmetadata = async () => {
      try {
        // 計算縮放後的尺寸(保持長寬比)
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = Math.min(width, opts.maxWidth);
            height = Math.round(width / aspectRatio);
          } else {
            height = Math.min(height, opts.maxHeight);
            width = Math.round(height * aspectRatio);
          }
          
          // 確保是偶數(某些編碼器需要)
          width = Math.round(width / 2) * 2;
          height = Math.round(height / 2) * 2;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 檢查瀏覽器支援的編碼器
        const mimeType = getMimeTypeWithCodec(opts.targetFormat, opts.codec);
        
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          // 如果不支援,嘗試降級到基本格式
          const fallbackMimeType = `video/${opts.targetFormat}`;
          if (!MediaRecorder.isTypeSupported(fallbackMimeType)) {
            throw new Error(`不支援的影片格式: ${opts.targetFormat}`);
          }
          console.warn(`不支援 ${mimeType},使用降級格式: ${fallbackMimeType}`);
        }
        
        // 創建 Canvas stream
        const canvasStream = canvas.captureStream(30); // 30 fps
        
        // 如果原始影片有音訊,需要將其加入
        let audioTrack: MediaStreamTrack | null = null;
        try {
          const videoStream = (video as any).captureStream();
          const audioTracks = videoStream.getAudioTracks();
          if (audioTracks.length > 0) {
            const track = audioTracks[0];
            if (track) {
              audioTrack = track;
              canvasStream.addTrack(track);
            }
          }
        } catch (error) {
          console.warn('無法擷取音訊軌道:', error);
        }
        
        const mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType: mimeType,
          videoBitsPerSecond: opts.videoBitrate,
        });
        
        const chunks: Blob[] = [];
        let startTime = 0;
        let lastProgressUpdate = 0;
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const optimizedBlob = new Blob(chunks, { type: `video/${opts.targetFormat}` });
          
          // 清理資源
          URL.revokeObjectURL(video.src);
          if (audioTrack) {
            audioTrack.stop();
          }
          canvasStream.getTracks().forEach(track => track.stop());
          
          opts.onProgress(100);
          resolve(optimizedBlob);
        };
        
        mediaRecorder.onerror = (e) => {
          console.error('MediaRecorder 錯誤:', e);
          URL.revokeObjectURL(video.src);
          reject(new Error('影片編碼失敗'));
        };
        
        // 開始錄製
        mediaRecorder.start(100); // 每 100ms 收集一次數據
        startTime = Date.now();
        
        // 播放影片並將每一幀繪製到 Canvas
        const drawFrame = () => {
          if (video.paused || video.ended) {
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
          
          // 更新進度(每 500ms 更新一次,避免過度更新)
          const now = Date.now();
          if (now - lastProgressUpdate > 500) {
            const progress = (video.currentTime / video.duration) * 95; // 保留 5% 給最後處理
            opts.onProgress(Math.min(progress, 95));
            lastProgressUpdate = now;
          }
          
          requestAnimationFrame(drawFrame);
        };
        
        video.onplay = () => {
          drawFrame();
        };
        
        video.onended = () => {
          opts.onProgress(95);
          mediaRecorder.stop();
        };
        
        // 開始播放
        try {
          await video.play();
        } catch (playError) {
          console.error('播放影片失敗:', playError);
          reject(new Error('無法播放影片進行轉換'));
        }
        
      } catch (error) {
        console.error('影片優化失敗:', error);
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };
    
    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject(new Error('影片載入失敗'));
    };
  });
}

/**
 * 取得包含編碼器的完整 MIME 類型
 */
function getMimeTypeWithCodec(format: 'webm' | 'mp4', codec: string): string {
  if (format === 'webm') {
    // WebM 常見編碼器: vp8, vp9
    return `video/webm;codecs=${codec}`;
  } else {
    // MP4 常見編碼器: h264, avc1
    return `video/mp4;codecs=${codec}`;
  }
}

/**
 * 檢查瀏覽器支援的影片編碼格式
 * @returns 支援的格式陣列
 */
export function getSupportedVideoFormats(): string[] {
  const formats = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  
  return formats.filter(format => MediaRecorder.isTypeSupported(format));
}

/**
 * 快速估算優化後的檔案大小(僅供參考)
 * @param durationSeconds 影片時長(秒)
 * @param bitrate 目標位元率(bps)
 * @returns 估算的檔案大小(bytes)
 */
export function estimateOptimizedFileSize(
  durationSeconds: number,
  bitrate: number = 2500000
): number {
  // 檔案大小 = (位元率 * 時長) / 8 + 音訊大小估算
  const videoSize = (bitrate * durationSeconds) / 8;
  const audioSize = (128000 * durationSeconds) / 8; // 假設 128kbps 音訊
  const overhead = 1.05; // 5% 容器開銷

  return Math.ceil((videoSize + audioSize) * overhead);
}

/**
 * 檢查影片是否為串流優化格式
 * @param file 影片檔案
 * @returns Promise 包含檢查結果和建議
 */
export async function checkVideoStreamingOptimization(file: File): Promise<{
  isOptimized: boolean;
  format: string;
  hasAudio: boolean;
  duration: number;
  width: number;
  height: number;
  recommendations: string[];
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const recommendations: string[] = [];

    video.onloadedmetadata = () => {
      const format = file.type;
      const isMP4 = format === 'video/mp4';
      const isWebM = format === 'video/webm';

      // 檢查格式
      if (!isMP4 && !isWebM) {
        recommendations.push('建議使用 MP4 或 WebM 格式以獲得最佳串流效果');
      }

      // 檢查解析度
      if (video.videoWidth > 1920 || video.videoHeight > 1080) {
        recommendations.push('影片解析度過高 (建議 1080p 以下)，可能導致載入緩慢');
      }

      // 檢查時長
      if (video.duration > 600) { // 10 分鐘以上
        recommendations.push('長影片建議使用較低位元率或分段上傳');
      }

      // 估算位元率
      const estimatedBitrate = (file.size * 8) / video.duration;
      if (estimatedBitrate > 10000000) { // > 10 Mbps
        recommendations.push(`影片位元率過高 (約 ${(estimatedBitrate / 1000000).toFixed(1)} Mbps)，建議壓縮後上傳`);
      }

      URL.revokeObjectURL(video.src);

      resolve({
        isOptimized: recommendations.length === 0,
        format: format,
        hasAudio: true, // 無法準確檢測，假設有音訊
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        recommendations,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        isOptimized: false,
        format: file.type,
        hasAudio: false,
        duration: 0,
        width: 0,
        height: 0,
        recommendations: ['無法讀取影片資訊，請確認檔案格式正確'],
      });
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * 取得影片格式建議
 */
export function getVideoFormatRecommendations(): string[] {
  return [
    '最佳格式: MP4 (H.264 編碼) - 相容性最好',
    '替代格式: WebM (VP9 編碼) - 檔案較小',
    '建議解析度: 1080p (1920x1080) 或以下',
    '建議位元率: 2-5 Mbps',
    '使用 ffmpeg 優化: ffmpeg -i input.mp4 -movflags +faststart output.mp4',
  ];
}
