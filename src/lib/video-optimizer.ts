'use client';

export async function optimizeVideoForWeb(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 創建 video 元素讀取原始視頻
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = async () => {
      try {
        // 使用 MediaRecorder 重新編碼
        const stream = (video as any).captureStream();
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000 // 2.5 Mbps
        });
        
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const optimizedBlob = new Blob(chunks, { type: 'video/webm' });
          URL.revokeObjectURL(video.src);
          resolve(optimizedBlob);
        };
        
        mediaRecorder.onerror = (e) => {
          reject(e);
        };
        
        // 開始錄製
        video.play();
        mediaRecorder.start();
        
        // 等待視頻播放完成
        video.onended = () => {
          mediaRecorder.stop();
        };
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error('視頻加載失敗'));
    };
  });
}
