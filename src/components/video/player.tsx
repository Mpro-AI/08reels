'use client';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { QualitySelector } from './quality-selector';
import { QualityOption } from '@/lib/types';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isPaused?: boolean;
  qualities?: QualityOption[]; // ✅ 新增：接收畫質選項
}

export default function VideoPlayer({ src, poster, videoRef, isPaused, qualities }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercentage, setBufferedPercentage] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src); // ✅ 新增：管理當前播放源
  const wasPlayingBeforeSeek = useRef(false);

  // 當外部 src 變化時，更新內部播放源
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  // 外部暫停控制
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      }
    }
  }, [isPaused, videoRef]);

  // ✅ 新增：畫質切換邏輯
  const handleQualityChange = (newUrl: string) => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;

      videoRef.current.src = newUrl;
      setCurrentSrc(newUrl);

      videoRef.current.onloadedmetadata = () => {
        videoRef.current!.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current!.play();
        }
      };
    }
  };

  const togglePlay = () => {
    if (isPaused) return;
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };
  
  const handlePointerDown = () => {
    if (videoRef.current) {
      wasPlayingBeforeSeek.current = !videoRef.current.paused;
      if (wasPlayingBeforeSeek.current) {
        videoRef.current.pause();
      }
    }
  };
  
  const handlePointerUp = () => {
    if (videoRef.current && wasPlayingBeforeSeek.current) {
      videoRef.current.play();
    }
  };

  const handleProgressChange = (value: number[]) => {
    if (videoRef.current) {
      const newTime = (value[0] / 100) * duration;
      videoRef.current.currentTime = newTime;
    }
  };
  
  const handleFullScreen = () => {
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration && isFinite(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      } else {
        setProgress(0);
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration && isFinite(video.duration)) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const buffered = (bufferedEnd / video.duration) * 100;
        setBufferedPercentage(buffered);
      }
    };

    const handleWaiting = () => {
      console.log('🔄 緩衝中...');
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      console.log('✅ 可以播放');
      setIsBuffering(false);
    };

    const handleCanPlayThrough = () => {
      console.log('✅ 可以流暢播放');
      setIsBuffering(false);
    };

    const handleError = (e: Event) => {
      console.error('❌ 視頻加載錯誤:', video.error);
      setIsBuffering(false);
    };

    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('error', handleError);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    setIsMuted(video.muted);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('error', handleError);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef, currentSrc]); // ✅ 監聽 currentSrc 的變化

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      <video 
        ref={videoRef} 
        src={currentSrc} // ✅ 使用 state 管理的 src
        poster={poster} 
        className="w-full h-full object-contain" 
        onClick={togglePlay}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
      />
      
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <p className="text-white text-sm">加載中...</p>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="relative w-full h-2 mb-2 group">
           <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-500/30 rounded-full">
                <div 
                    className="absolute top-0 left-0 h-full bg-gray-500/70 rounded-full"
                    style={{ width: `${bufferedPercentage}%` }}
                />
                <Slider
                    value={[progress]}
                    onValueChange={handleProgressChange}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    max={100}
                    step={0.1}
                    className="absolute top-1/2 -translate-y-1/2 w-full cursor-pointer h-1 [&_.slider-thumb]:size-3 [&_.slider-range]:bg-primary"
                />
           </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlay} 
              className="text-white hover:bg-white/20" 
              disabled={isPaused || isBuffering}
            >
              {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
              {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
            </Button>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {/* ✅ 新增：畫質選擇器 */}
            {qualities && (
              <QualitySelector 
                qualities={qualities}
                currentUrl={currentSrc}
                onQualityChange={handleQualityChange}
              />
            )}
            <select
              className="bg-transparent text-white text-xs md:text-sm border border-white/20 rounded px-1 md:px-2 py-1"
              onChange={(e) => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = parseFloat(e.target.value);
                }
              }}
              defaultValue="1"
            >
              <option value="0.5" className="text-black">0.5x</option>
              <option value="0.75" className="text-black">0.75x</option>
              <option value="1" className="text-black">1x</option>
              <option value="1.25" className="text-black">1.25x</option>
              <option value="1.5" className="text-black">1.5x</option>
              <option value="2" className="text-black">2x</option>
            </select>
            <Button variant="ghost" size="icon" onClick={handleFullScreen} className="text-white hover:bg-white/20">
              <Maximize className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
