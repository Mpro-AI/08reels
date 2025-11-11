'use client';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isPaused?: boolean; // New prop to control playback from parent
}

export default function VideoPlayer({ src, poster, videoRef, isPaused }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const wasPlayingBeforeSeek = useRef(false);

  // Effect to handle external play/pause control
  useEffect(() => {
    if (videoRef.current) {
        if (isPaused) {
            videoRef.current.pause();
        }
    }
  }, [isPaused, videoRef]);


  const togglePlay = () => {
    if (isPaused) return; // Don't allow play if externally paused (e.g., drawing)
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
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Set initial muted state
    setIsMuted(video.muted);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      <video ref={videoRef} src={src} poster={poster} className="w-full h-full object-contain" onClick={togglePlay} />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Slider
          value={[progress]}
          onValueChange={handleProgressChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          max={100}
          step={0.1}
          className="w-full h-2 cursor-pointer"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20" disabled={isPaused}>
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleFullScreen} className="text-white hover:bg-white/20">
              <Maximize className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
