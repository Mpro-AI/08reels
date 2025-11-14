'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoPlayerWithConversionProps {
  videoUrl: string;
  webmUrl?: string | null;
  webmReady?: boolean;
  conversionError?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
}

/**
 * 智能影片播放器組件
 * - 優先使用 WebM 版本(如果可用)
 * - 顯示轉換狀態
 * - 如果 WebM 尚未準備好,使用原始影片
 */
export function VideoPlayerWithConversion({
  videoUrl,
  webmUrl,
  webmReady = false,
  conversionError = false,
  className = '',
  onTimeUpdate,
  onLoadedMetadata,
}: VideoPlayerWithConversionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSource, setCurrentSource] = useState<'original' | 'webm'>('original');
  const [showConversionStatus, setShowConversionStatus] = useState(false);

  // 決定使用哪個影片源
  const effectiveVideoUrl = webmReady && webmUrl ? webmUrl : videoUrl;
  const isUsingWebM = webmReady && webmUrl && effectiveVideoUrl === webmUrl;

  useEffect(() => {
    setCurrentSource(isUsingWebM ? 'webm' : 'original');
  }, [isUsingWebM]);

  // 顯示轉換狀態(如果不是 WebM 且沒有錯誤)
  useEffect(() => {
    if (!isUsingWebM && !conversionError && !webmReady) {
      setShowConversionStatus(true);
      // 5 秒後隱藏狀態提示
      const timer = setTimeout(() => {
        setShowConversionStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowConversionStatus(false);
    }
  }, [isUsingWebM, conversionError, webmReady]);

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    if (videoRef.current && onLoadedMetadata) {
      onLoadedMetadata(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video playback error:', e);
    setIsLoading(false);
    setError('影片載入失敗,請稍後再試');
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  return (
    <div className="relative">
      {/* 載入中指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-lg">
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">載入影片中...</span>
          </div>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-lg">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* 轉換狀態提示 */}
      {showConversionStatus && !isUsingWebM && !conversionError && (
        <div className="absolute top-4 right-4 z-20">
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              正在背景轉換為 WebM 格式中...
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* WebM 就緒提示 */}
      {isUsingWebM && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-800 dark:text-green-200">
              WebM 優化版本
            </span>
          </div>
        </div>
      )}

      {/* 轉換錯誤提示 */}
      {conversionError && !isUsingWebM && (
        <div className="absolute top-4 right-4 z-20">
          <Alert variant="destructive" className="max-w-xs">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              WebM 轉換失敗,使用原始影片
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* 影片播放器 */}
      <video
        ref={videoRef}
        src={effectiveVideoUrl}
        className={`w-full h-full rounded-lg ${className}`}
        controls
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
        onLoadStart={handleLoadStart}
        playsInline
        preload="metadata"
      >
        您的瀏覽器不支援影片播放。
      </video>

      {/* 底部狀態列 */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isUsingWebM ? '播放: WebM 優化版本' : '播放: 原始版本'}
        </span>
        {!isUsingWebM && !conversionError && !webmReady && (
          <span className="text-blue-600 dark:text-blue-400">
            轉換中...
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 簡化版影片播放器(向後兼容)
 */
export function VideoPlayer({
  videoUrl,
  className = '',
  onTimeUpdate,
  onLoadedMetadata,
}: {
  videoUrl: string;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
}) {
  return (
    <VideoPlayerWithConversion
      videoUrl={videoUrl}
      className={className}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
    />
  );
}
